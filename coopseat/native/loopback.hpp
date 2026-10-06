#pragma once
#include "common.hpp"
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <wrl/implements.h>
// Process loopback (Windows 10 2004+): the audio of one process tree, or of everything but one tree.
// stdout carries raw PCM (48 kHz, stereo, s16le) and nothing else; status lines go to stderr as JSON.
// A started stream must always be stopped and released: a process that dies while capturing leaves
// the audio service blocking the next Initialize.
inline void status(const json& e){std::lock_guard lock(outputMutex);std::cerr<<e.dump()<<std::endl;}
class LoopbackActivation:public Microsoft::WRL::RuntimeClass<Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>,Microsoft::WRL::FtmBase,IActivateAudioInterfaceCompletionHandler>{
public:
 Handle done{CreateEvent(nullptr,TRUE,FALSE,nullptr)};HRESULT result=E_FAIL;ComPtr<IAudioClient> client;
 STDMETHOD(ActivateCompleted)(IActivateAudioInterfaceAsyncOperation* op) override{HRESULT hr=E_FAIL;ComPtr<IUnknown> unknown;if(SUCCEEDED(op->GetActivateResult(&hr,&unknown))&&SUCCEEDED(hr))hr=unknown.As(&client);result=hr;SetEvent(done);return S_OK;}
};
inline ComPtr<IAudioClient> activateLoopback(DWORD pid,bool include){
 AUDIOCLIENT_ACTIVATION_PARAMS params{};params.ActivationType=AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;params.ProcessLoopbackParams.TargetProcessId=pid;params.ProcessLoopbackParams.ProcessLoopbackMode=include?PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE:PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE;
 PROPVARIANT pv{};pv.vt=VT_BLOB;pv.blob.cbSize=sizeof(params);pv.blob.pBlobData=reinterpret_cast<BYTE*>(&params);
 auto handler=Microsoft::WRL::Make<LoopbackActivation>();ComPtr<IActivateAudioInterfaceAsyncOperation> op;
 check(ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,__uuidof(IAudioClient),&pv,handler.Get(),&op),"Process loopback activate");
 if(WaitForSingleObject(handler->done,5000)!=WAIT_OBJECT_0)throw std::runtime_error("Process loopback timed out");
 check(handler->result,"Process loopback unavailable");return handler->client;
}
inline bool stdinOpen(){DWORD bytes=0;if(!PeekNamedPipe(GetStdHandle(STD_INPUT_HANDLE),nullptr,0,nullptr,&bytes,nullptr))return false;if(!bytes)return true;std::string chunk(bytes,'\0');DWORD got=0;if(!ReadFile(GetStdHandle(STD_INPUT_HANDLE),chunk.data(),bytes,&got,nullptr)||!got)return false;return chunk.find("stop")==std::string::npos;}
int loopback(const json& request){
 ComPtr<IAudioClient> client;ComPtr<IAudioCaptureClient> reader;bool started=false;int code=0;
 try{
  DWORD pid=0;bool include=request.contains("window");
  if(include){HWND hwnd=reinterpret_cast<HWND>(static_cast<uintptr_t>(std::stoull(request.at("window").get<std::string>())));if(!IsWindow(hwnd))throw std::runtime_error("Janela não encontrada");GetWindowThreadProcessId(hwnd,&pid);}
  else pid=request.at("exclude").get<DWORD>();
  if(!pid)throw std::runtime_error("Processo não encontrado");
  client=activateLoopback(pid,include);
  WAVEFORMATEX fmt{};fmt.wFormatTag=WAVE_FORMAT_PCM;fmt.nChannels=2;fmt.nSamplesPerSec=48000;fmt.wBitsPerSample=16;fmt.nBlockAlign=fmt.nChannels*fmt.wBitsPerSample/8;fmt.nAvgBytesPerSec=fmt.nSamplesPerSec*fmt.nBlockAlign;
  check(client->Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_LOOPBACK|AUDCLNT_STREAMFLAGS_EVENTCALLBACK|AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,200000,0,&fmt,nullptr),"Process loopback initialize");
  Handle ready{CreateEvent(nullptr,FALSE,FALSE,nullptr)};check(client->SetEventHandle(ready),"Loopback event");check(client->GetService(IID_PPV_ARGS(&reader)),"Loopback reader");check(client->Start(),"Loopback start");started=true;
  status({{"type","started"},{"pid",pid},{"mode",include?"include":"exclude"}});
  HANDLE out=GetStdHandle(STD_OUTPUT_HANDLE);std::vector<BYTE> silence;bool open=true;
  while(open&&stdinOpen()){
   if(WaitForSingleObject(ready,100)!=WAIT_OBJECT_0)continue;
   UINT32 frames=0;check(reader->GetNextPacketSize(&frames),"Loopback packet");
   while(frames){BYTE* data=nullptr;DWORD flags=0;check(reader->GetBuffer(&data,&frames,&flags,nullptr,nullptr),"Loopback buffer");DWORD size=frames*fmt.nBlockAlign;const BYTE* bytes=data;if(flags&AUDCLNT_BUFFERFLAGS_SILENT){silence.assign(size,0);bytes=silence.data();}DWORD written=0;open=WriteFile(out,bytes,size,&written,nullptr);check(reader->ReleaseBuffer(frames),"Loopback release");if(!open)break;check(reader->GetNextPacketSize(&frames),"Loopback next packet");}
  }
 }catch(const std::exception& e){status({{"type","error"},{"message",e.what()}});code=1;}
 if(started)client->Stop();
 reader.Reset();client.Reset();
 return code;
}
