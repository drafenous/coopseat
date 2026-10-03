#pragma once
#include "common.hpp"
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <initguid.h>
#include <functiondiscoverykeys_devpkey.h>
#include <avrt.h>
#include <deque>
inline json audioDevices(EDataFlow flow){ComPtr<IMMDeviceEnumerator> e;check(CoCreateInstance(__uuidof(MMDeviceEnumerator),nullptr,CLSCTX_ALL,IID_PPV_ARGS(&e)),"Audio enumerator");ComPtr<IMMDeviceCollection> list;check(e->EnumAudioEndpoints(flow,DEVICE_STATE_ACTIVE,&list),"Audio devices");UINT count=0;check(list->GetCount(&count),"Audio count");json out=json::array();for(UINT i=0;i<count;i++){ComPtr<IMMDevice>d;check(list->Item(i,&d),"Audio endpoint");LPWSTR id=nullptr;check(d->GetId(&id),"Audio ID");std::string sid=utf8(id);CoTaskMemFree(id);ComPtr<IPropertyStore> props;check(d->OpenPropertyStore(STGM_READ,&props),"Audio properties");PROPVARIANT name;PropVariantInit(&name);HRESULT hr=props->GetValue(PKEY_Device_FriendlyName,&name);std::string label=SUCCEEDED(hr)&&name.vt==VT_LPWSTR?utf8(name.pwszVal):sid;PropVariantClear(&name);out.push_back({{"id",sid},{"name",label}});}return out;}
class Audio {
 std::thread worker;std::atomic<bool> stopped{false};std::atomic<float> volume{.75f};
 Handle stopEvent{CreateEvent(nullptr,TRUE,FALSE,nullptr)};
 static ComPtr<IAudioClient> activate(IMMDevice* d){ComPtr<IAudioClient> c;check(d->Activate(__uuidof(IAudioClient),CLSCTX_ALL,nullptr,reinterpret_cast<void**>(c.GetAddressOf())),"WASAPI activate");return c;}
 void run(std::string input,std::string output){
  try{ComInit com;ComPtr<IMMDeviceEnumerator> e;check(CoCreateInstance(__uuidof(MMDeviceEnumerator),nullptr,CLSCTX_ALL,IID_PPV_ARGS(&e)),"Audio enumerator");ComPtr<IMMDevice> in,out;check(e->GetDevice(wide(input).c_str(),&in),"Audio input");if(output.empty())check(e->GetDefaultAudioEndpoint(eRender,eConsole,&out),"Default audio output");else check(e->GetDevice(wide(output).c_str(),&out),"Audio output");
   auto capture=activate(in.Get());auto render=activate(out.Get());WAVEFORMATEX* raw=nullptr;check(capture->GetMixFormat(&raw),"Capture mix format");std::unique_ptr<WAVEFORMATEX,decltype(&CoTaskMemFree)> fmt(raw,&CoTaskMemFree);
   Handle capEvent{CreateEvent(nullptr,FALSE,FALSE,nullptr)},renderEvent{CreateEvent(nullptr,FALSE,FALSE,nullptr)};
   // IAudioClient3 minimum shared period when accepted by the capture driver.
   ComPtr<IAudioClient3> c3;bool low=false;if(SUCCEEDED(capture.As(&c3))){UINT32 def=0,fund=0,min=0,max=0;if(SUCCEEDED(c3->GetSharedModeEnginePeriod(fmt.get(),&def,&fund,&min,&max)))low=SUCCEEDED(c3->InitializeSharedAudioStream(AUDCLNT_STREAMFLAGS_EVENTCALLBACK,min,fmt.get(),nullptr));}
   if(!low){c3.Reset();capture=activate(in.Get());check(capture->Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_EVENTCALLBACK,0,0,fmt.get(),nullptr),"WASAPI capture initialize");}
   // Use the capture format as input to the output engine; Windows converts channel/rate if necessary.
   check(render->Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_EVENTCALLBACK|AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,0,0,fmt.get(),nullptr),"WASAPI render initialize");
   check(capture->SetEventHandle(capEvent),"Capture event");check(render->SetEventHandle(renderEvent),"Render event");ComPtr<IAudioCaptureClient> reader;ComPtr<IAudioRenderClient> writer;ComPtr<ISimpleAudioVolume> vol;check(capture->GetService(IID_PPV_ARGS(&reader)),"Audio reader");check(render->GetService(IID_PPV_ARGS(&writer)),"Audio writer");check(render->GetService(IID_PPV_ARGS(&vol)),"Audio volume");UINT32 capacity=0;check(render->GetBufferSize(&capacity),"Audio buffer size");
   const size_t frameBytes=fmt->nBlockAlign;const size_t maxFrames=std::max<size_t>(capacity*2,fmt->nSamplesPerSec/50);std::deque<BYTE> queue;
   BYTE* prime=nullptr;check(writer->GetBuffer(capacity,&prime),"Prime audio");check(writer->ReleaseBuffer(capacity,AUDCLNT_BUFFERFLAGS_SILENT),"Prime audio release");check(render->Start(),"Start playback");check(capture->Start(),"Start audio capture");
   DWORD task=0;HANDLE mmcss=AvSetMmThreadCharacteristics(L"Pro Audio",&task);struct TaskEnd{HANDLE h;~TaskEnd(){if(h)AvRevertMmThreadCharacteristics(h);}} taskEnd{mmcss};
   event({{"type","audio"},{"audioMs",1000.0*capacity/fmt->nSamplesPerSec},{"sampleRate",fmt->nSamplesPerSec},{"channels",fmt->nChannels}});
   HANDLE events[]={stopEvent.h,capEvent.h,renderEvent.h};
   while(!stopped){DWORD wait=WaitForMultipleObjects(3,events,FALSE,1000);if(wait==WAIT_OBJECT_0)break;if(wait==WAIT_FAILED)throw std::runtime_error("Audio event wait failed");
    check(vol->SetMasterVolume(volume.load(),nullptr),"Audio volume");UINT32 frames=0;check(reader->GetNextPacketSize(&frames),"Audio packet");while(frames){BYTE* data=nullptr;DWORD flags=0;check(reader->GetBuffer(&data,&frames,&flags,nullptr,nullptr),"Audio capture buffer");size_t size=size_t(frames)*frameBytes;if(flags&AUDCLNT_BUFFERFLAGS_SILENT)queue.insert(queue.end(),size,0);else queue.insert(queue.end(),data,data+size);check(reader->ReleaseBuffer(frames),"Release captured audio");if(queue.size()>maxFrames*frameBytes)queue.erase(queue.begin(),queue.begin()+static_cast<std::ptrdiff_t>(queue.size()-maxFrames*frameBytes));check(reader->GetNextPacketSize(&frames),"Next audio packet");}
    UINT32 padding=0;check(render->GetCurrentPadding(&padding),"Audio padding");UINT32 writable=capacity-padding;if(writable){BYTE* dst=nullptr;check(writer->GetBuffer(writable,&dst),"Output audio buffer");size_t count=std::min(queue.size(),size_t(writable)*frameBytes);for(size_t i=0;i<count;i++){dst[i]=queue.front();queue.pop_front();}memset(dst+count,0,size_t(writable)*frameBytes-count);check(writer->ReleaseBuffer(writable,0),"Release output audio");}
   }
   capture->Stop();render->Stop();
  }catch(const std::exception& e){event({{"type","warning"},{"message",std::string("Vídeo sem áudio: ")+e.what()}});}
 }
public:
 ~Audio(){stop();}
 void start(const std::string& in,const std::string& out,float gain){volume=gain;if(in.empty())return;worker=std::thread([this,in,out]{run(in,out);});}
 void setVolume(float value){volume=std::clamp(value,0.f,1.f);}
 void stop(){stopped=true;SetEvent(stopEvent);if(worker.joinable())worker.join();}
};
