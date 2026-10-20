#pragma once
#include "common.hpp"
struct Frame{ComPtr<IMFSample> sample;std::chrono::steady_clock::time_point received;};
class Callback final: public IMFSourceReaderCallback{
 std::atomic<ULONG> refs{1};std::mutex mutex;ComPtr<IMFSourceReader> reader;Frame latest;bool active=true;
public:
 Handle ready{CreateEvent(nullptr,FALSE,FALSE,nullptr)};std::atomic<uint64_t> dropped{0};std::atomic<HRESULT> failure{S_OK};
 STDMETHODIMP QueryInterface(REFIID riid,void** out)override{if(!out)return E_POINTER;*out=nullptr;if(riid==__uuidof(IUnknown)||riid==__uuidof(IMFSourceReaderCallback)){*out=static_cast<IMFSourceReaderCallback*>(this);AddRef();return S_OK;}return E_NOINTERFACE;}
 STDMETHODIMP_(ULONG) AddRef()override{return ++refs;}
 STDMETHODIMP_(ULONG) Release()override{ULONG n=--refs;if(!n)delete this;return n;}
 STDMETHODIMP OnReadSample(HRESULT hr,DWORD,DWORD flags,LONGLONG,IMFSample* sample)override{
  ComPtr<IMFSourceReader> next;
  {std::lock_guard lock(mutex);if(!active)return S_OK;if(FAILED(hr)||(flags&(MF_SOURCE_READERF_ERROR|MF_SOURCE_READERF_ENDOFSTREAM|MF_SOURCE_READERF_CURRENTMEDIATYPECHANGED))){failure=FAILED(hr)?hr:E_FAIL;SetEvent(ready);return S_OK;}if(sample){if(latest.sample)dropped++;latest={sample,std::chrono::steady_clock::now()};SetEvent(ready);}next=reader;}
  if(next){HRESULT result=next->ReadSample(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,nullptr,nullptr,nullptr,nullptr);if(FAILED(result)){failure=result;SetEvent(ready);}}return S_OK;
 }
 STDMETHODIMP OnFlush(DWORD)override{return S_OK;}
 STDMETHODIMP OnEvent(DWORD,IMFMediaEvent*)override{return S_OK;}
 void attach(IMFSourceReader* r){std::lock_guard lock(mutex);reader=r;}
 void detach(){std::lock_guard lock(mutex);active=false;reader.Reset();latest.sample.Reset();}
 Frame take(){std::lock_guard lock(mutex);Frame result=std::move(latest);latest={};return result;}
};
class Capture{
 ComPtr<IMFMediaSource> source;ComPtr<IMFSourceReader> reader;
public:
 ComPtr<Callback> callback;ComPtr<IMFMediaType> type;UINT width=0,height=0;GUID format{};LONG stride=0;double fps=0;
 Capture(const std::string& device,DWORD mode){
  try{source=openSource(device);callback.Attach(new Callback());ComPtr<IMFAttributes> attr;check(MFCreateAttributes(&attr,3),"Reader attributes");check(attr->SetUnknown(MF_SOURCE_READER_ASYNC_CALLBACK,callback.Get()),"Async callback");check(attr->SetUINT32(MF_LOW_LATENCY,TRUE),"Low latency");check(MFCreateSourceReaderFromMediaSource(source.Get(),attr.Get(),&reader),"Source reader");
   check(reader->SetStreamSelection(MF_SOURCE_READER_ALL_STREAMS,FALSE),"Deselect streams");check(reader->SetStreamSelection(MF_SOURCE_READER_FIRST_VIDEO_STREAM,TRUE),"Select video");ComPtr<IMFMediaType> native;check(reader->GetNativeMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,mode,&native),"Native capture mode");GUID input{};native->GetGUID(MF_MT_SUBTYPE,&input);if(!supported(input))throw std::runtime_error("Formato não suportado pelo renderizador. Use Compatibilidade.");
   // Set the exact native mode before requesting decompression; no silent 30 fps fallback.
   check(reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,nullptr,native.Get()),"Set native capture mode");
   if(input==MFVideoFormat_MJPG){HRESULT hr=E_FAIL;for(auto subtype:{MFVideoFormat_NV12,MFVideoFormat_YUY2,MFVideoFormat_RGB32}){ComPtr<IMFMediaType> decoded;MFCreateMediaType(&decoded);native->CopyAllItems(decoded.Get());decoded->SetGUID(MF_MT_SUBTYPE,subtype);decoded->DeleteItem(MF_MT_SAMPLE_SIZE);decoded->DeleteItem(MF_MT_DEFAULT_STRIDE);decoded->SetUINT32(MF_MT_COMPRESSED,FALSE);hr=reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,nullptr,decoded.Get());if(SUCCEEDED(hr))break;}check(hr,"MJPEG decoder (try Chromium compatibility)");}
   check(reader->GetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,&type),"Actual media type");check(MFGetAttributeSize(type.Get(),MF_MT_FRAME_SIZE,&width,&height),"Frame dimensions");check(type->GetGUID(MF_MT_SUBTYPE,&format),"Frame format");if(format!=MFVideoFormat_NV12&&format!=MFVideoFormat_YUY2&&format!=MFVideoFormat_RGB32&&format!=MFVideoFormat_ARGB32)throw std::runtime_error("Decoder output unsupported");if(!width||!height||width>8192||height>8192||((format==MFVideoFormat_NV12)&&(width%2||height%2))||((format==MFVideoFormat_YUY2)&&width%2))throw std::runtime_error("Invalid frame dimensions");
   UINT32 n=0,d=1;MFGetAttributeRatio(type.Get(),MF_MT_FRAME_RATE,&n,&d);fps=d?double(n)/d:0;UINT32 rawStride=0;if(SUCCEEDED(type->GetUINT32(MF_MT_DEFAULT_STRIDE,&rawStride)))stride=static_cast<LONG>(rawStride);else check(MFGetStrideForBitmapInfoHeader(format.Data1,width,&stride),"Frame stride");
   callback->attach(reader.Get());check(reader->ReadSample(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,nullptr,nullptr,nullptr,nullptr),"Start capture");
  }catch(...){stop();throw;}
 }
 ~Capture(){stop();}
 void stop(){if(callback)callback->detach();if(source)source->Shutdown();reader.Reset();source.Reset();}
 template<class F>void pixels(IMFSample* sample,F upload){ComPtr<IMFMediaBuffer> b;check(sample->ConvertToContiguousBuffer(&b),"Frame buffer");ComPtr<IMF2DBuffer> two;BYTE* p=nullptr;LONG pitch=stride;bool locked2D=false;DWORD length=0;HRESULT hr=b.As(&two);if(SUCCEEDED(hr)&&SUCCEEDED(two->Lock2D(&p,&pitch)))locked2D=true;else{check(b->Lock(&p,nullptr,&length),"Lock frame");size_t required=size_t(std::abs(pitch))*height*(format==MFVideoFormat_NV12?3:2)/2;if(length<required){b->Unlock();throw std::runtime_error("Truncated video frame");}if(pitch<0)p+=size_t(-pitch)*(height-1);}
  try{if(pitch<0){if(format==MFVideoFormat_NV12)throw std::runtime_error("Unsupported NV12 stride");std::vector<BYTE> packed(size_t(-pitch)*height);for(UINT y=0;y<height;y++)memcpy(packed.data()+size_t(-pitch)*y,p+ptrdiff_t(pitch)*y,size_t(-pitch));upload(packed.data(),-pitch);}else upload(p,pitch);}catch(...){if(locked2D)two->Unlock2D();else b->Unlock();throw;}if(locked2D)two->Unlock2D();else b->Unlock();
 }
};
inline json modesFor(const std::string& device){auto source=openSource(device);struct Shutdown{IMFMediaSource* s;~Shutdown(){s->Shutdown();}} shutdown{source.Get()};ComPtr<IMFSourceReader> r;check(MFCreateSourceReaderFromMediaSource(source.Get(),nullptr,&r),"Mode reader");json modes=json::array();for(DWORD i=0;;i++){ComPtr<IMFMediaType> t;HRESULT hr=r->GetNativeMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,i,&t);if(hr==MF_E_NO_MORE_TYPES)break;check(hr,"Enumerate modes");GUID f{};UINT32 w=0,h=0,n=0,d=1;t->GetGUID(MF_MT_SUBTYPE,&f);MFGetAttributeSize(t.Get(),MF_MT_FRAME_SIZE,&w,&h);MFGetAttributeRatio(t.Get(),MF_MT_FRAME_RATE,&n,&d);modes.push_back({{"index",i},{"width",w},{"height",h},{"fps",d?double(n)/d:0},{"format",formatName(f)},{"supported",supported(f)}});}return {{"modes",modes}};}
