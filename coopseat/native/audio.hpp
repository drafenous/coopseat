#pragma once
#include "common.hpp"
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <devicetopology.h>
#include <initguid.h>
#include <functiondiscoverykeys_devpkey.h>
#include <avrt.h>
#include <cmath>
#include <deque>
#include <functional>
// Device id of the adapter behind the endpoint (e.g. a USB interface path with vid_/pid_), used to pair capture cards with their audio.
inline std::string audioHardware(IMMDevice* d){ComPtr<IDeviceTopology> t;if(FAILED(d->Activate(__uuidof(IDeviceTopology),CLSCTX_ALL,nullptr,reinterpret_cast<void**>(t.GetAddressOf()))))return "";ComPtr<IConnector> c;if(FAILED(t->GetConnector(0,&c)))return "";LPWSTR to=nullptr;if(FAILED(c->GetDeviceIdConnectedTo(&to))||!to)return "";std::string s=utf8(to);CoTaskMemFree(to);return s;}
inline int16_t clampS16(float v){v=std::clamp(v,-1.f,1.f);return static_cast<int16_t>(std::lrintf(v*32767.f));}
// WASAPI mix audio as stereo s16, for the party stream. Empty when the mix format isn't PCM or float.
inline std::vector<BYTE> s16Stereo(const BYTE* data,UINT32 frames,DWORD flags,const WAVEFORMATEX* fmt){std::vector<BYTE> out;if(!fmt||!frames||frames>48000)return out;const int ch=fmt->nChannels;if(ch<1||ch>8)return out;out.resize(size_t(frames)*4);auto* dst=reinterpret_cast<int16_t*>(out.data());if((flags&AUDCLNT_BUFFERFLAGS_SILENT)||!data){memset(out.data(),0,out.size());return out;}const bool extensible=fmt->wFormatTag==WAVE_FORMAT_EXTENSIBLE&&fmt->cbSize>=22;const auto* ext=extensible?reinterpret_cast<const WAVEFORMATEXTENSIBLE*>(fmt):nullptr;const bool isFloat=fmt->wFormatTag==WAVE_FORMAT_IEEE_FLOAT||(ext&&ext->SubFormat.Data1==WAVE_FORMAT_IEEE_FLOAT);const bool isPcm=fmt->wFormatTag==WAVE_FORMAT_PCM||(ext&&ext->SubFormat.Data1==WAVE_FORMAT_PCM);if(isFloat&&fmt->wBitsPerSample==32){auto* s=reinterpret_cast<const float*>(data);for(UINT32 i=0;i<frames;i++){float l=s[i*ch],r=ch>1?s[i*ch+1]:l;dst[i*2]=clampS16(l);dst[i*2+1]=clampS16(r);}return out;}if(isPcm&&fmt->wBitsPerSample==16){auto* s=reinterpret_cast<const int16_t*>(data);for(UINT32 i=0;i<frames;i++){dst[i*2]=s[i*ch];dst[i*2+1]=ch>1?s[i*ch+1]:s[i*ch];}return out;}if(isPcm&&fmt->wBitsPerSample==32){auto* s=reinterpret_cast<const int32_t*>(data);for(UINT32 i=0;i<frames;i++){float l=s[i*ch]/2147483648.f,r=(ch>1?s[i*ch+1]:s[i*ch])/2147483648.f;dst[i*2]=clampS16(l);dst[i*2+1]=clampS16(r);}return out;}out.clear();return out;}
inline json audioDevices(EDataFlow flow){ComPtr<IMMDeviceEnumerator> e;check(CoCreateInstance(__uuidof(MMDeviceEnumerator),nullptr,CLSCTX_ALL,IID_PPV_ARGS(&e)),"Audio enumerator");ComPtr<IMMDeviceCollection> list;check(e->EnumAudioEndpoints(flow,DEVICE_STATE_ACTIVE,&list),"Audio devices");UINT count=0;check(list->GetCount(&count),"Audio count");json out=json::array();for(UINT i=0;i<count;i++){ComPtr<IMMDevice>d;check(list->Item(i,&d),"Audio endpoint");LPWSTR id=nullptr;check(d->GetId(&id),"Audio ID");std::string sid=utf8(id);CoTaskMemFree(id);ComPtr<IPropertyStore> props;check(d->OpenPropertyStore(STGM_READ,&props),"Audio properties");PROPVARIANT name;PropVariantInit(&name);HRESULT hr=props->GetValue(PKEY_Device_FriendlyName,&name);std::string label=SUCCEEDED(hr)&&name.vt==VT_LPWSTR?utf8(name.pwszVal):sid;PropVariantClear(&name);out.push_back({{"id",sid},{"name",label},{"hardware",audioHardware(d.Get())}});}return out;}
class Audio {
 std::thread worker;std::atomic<bool> stopped{false};std::atomic<float> volume{.75f};
 std::function<void(const BYTE*,size_t,uint32_t)> tap;
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
    check(vol->SetMasterVolume(volume.load(),nullptr),"Audio volume");UINT32 frames=0;check(reader->GetNextPacketSize(&frames),"Audio packet");while(frames){BYTE* data=nullptr;DWORD flags=0;check(reader->GetBuffer(&data,&frames,&flags,nullptr,nullptr),"Audio capture buffer");size_t size=size_t(frames)*frameBytes;if(flags&AUDCLNT_BUFFERFLAGS_SILENT)queue.insert(queue.end(),size,0);else queue.insert(queue.end(),data,data+size);std::vector<BYTE> pcm;if(tap)pcm=s16Stereo(data,frames,flags,fmt.get());check(reader->ReleaseBuffer(frames),"Release captured audio");if(tap&&!pcm.empty())tap(pcm.data(),pcm.size(),fmt->nSamplesPerSec);if(queue.size()>maxFrames*frameBytes)queue.erase(queue.begin(),queue.begin()+static_cast<std::ptrdiff_t>(queue.size()-maxFrames*frameBytes));check(reader->GetNextPacketSize(&frames),"Next audio packet");}
    UINT32 padding=0;check(render->GetCurrentPadding(&padding),"Audio padding");UINT32 writable=capacity-padding;if(writable){BYTE* dst=nullptr;check(writer->GetBuffer(writable,&dst),"Output audio buffer");size_t count=std::min(queue.size(),size_t(writable)*frameBytes);for(size_t i=0;i<count;i++){dst[i]=queue.front();queue.pop_front();}memset(dst+count,0,size_t(writable)*frameBytes-count);check(writer->ReleaseBuffer(writable,0),"Release output audio");}
   }
   capture->Stop();render->Stop();
  }catch(const std::exception& e){event({{"type","warning"},{"message",std::string("Vídeo sem áudio: ")+e.what()}});}
 }
public:
 ~Audio(){stop();}
 void setTap(std::function<void(const BYTE*,size_t,uint32_t)> fn){tap=std::move(fn);}
 void start(const std::string& in,const std::string& out,float gain){volume=gain;if(in.empty())return;worker=std::thread([this,in,out]{run(in,out);});}
 void setVolume(float value){volume=std::clamp(value,0.f,1.f);}
 void stop(){stopped=true;SetEvent(stopEvent);if(worker.joinable())worker.join();}
};
