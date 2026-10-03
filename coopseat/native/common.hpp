#pragma once
#include <windows.h>
#include <wrl/client.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <nlohmann/json.hpp>
#include <atomic>
#include <algorithm>
#include <chrono>
#include <cstring>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>
#include <memory>
using Microsoft::WRL::ComPtr;
using json=nlohmann::json;
inline void check(HRESULT hr,const char* what){if(FAILED(hr)){char code[20];sprintf_s(code,"0x%08lX",static_cast<unsigned long>(hr));throw std::runtime_error(std::string(what)+" ("+code+")");}}
inline std::string utf8(const std::wstring& s){if(s.empty())return {};int n=WideCharToMultiByte(CP_UTF8,0,s.data(),static_cast<int>(s.size()),nullptr,0,nullptr,nullptr);std::string r(n,'\0');WideCharToMultiByte(CP_UTF8,0,s.data(),static_cast<int>(s.size()),r.data(),n,nullptr,nullptr);return r;}
inline std::wstring wide(const std::string& s){if(s.empty())return {};int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s.data(),static_cast<int>(s.size()),nullptr,0);if(!n)throw std::runtime_error("Invalid UTF-8");std::wstring r(n,L'\0');MultiByteToWideChar(CP_UTF8,0,s.data(),static_cast<int>(s.size()),r.data(),n);return r;}
inline std::mutex outputMutex;
inline void event(json e){std::lock_guard lock(outputMutex);std::cout<<e.dump()<<std::endl;}
struct ComInit{ComInit(){check(CoInitializeEx(nullptr,COINIT_MULTITHREADED),"COM");}~ComInit(){CoUninitialize();}};
struct MfInit{MfInit(){check(MFStartup(MF_VERSION),"MFStartup");}~MfInit(){MFShutdown();}};
struct Handle{HANDLE h=nullptr;Handle()=default;explicit Handle(HANDLE v):h(v){}~Handle(){if(h&&h!=INVALID_HANDLE_VALUE)CloseHandle(h);}Handle(const Handle&)=delete;Handle& operator=(const Handle&)=delete;operator HANDLE()const{return h;}};
inline std::wstring attrString(IMFAttributes* a,REFGUID key){wchar_t* str=nullptr;UINT32 n=0;check(a->GetAllocatedString(key,&str,&n),"Device attributes");std::wstring out(str,n);CoTaskMemFree(str);return out;}
inline std::vector<ComPtr<IMFActivate>> videoDevices(){ComPtr<IMFAttributes> a;check(MFCreateAttributes(&a,1),"Attributes");check(a->SetGUID(MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID),"Source type");IMFActivate** raw=nullptr;UINT32 count=0;check(MFEnumDeviceSources(a.Get(),&raw,&count),"Enumerate cameras");std::vector<ComPtr<IMFActivate>> out;for(UINT32 i=0;i<count;i++){ComPtr<IMFActivate> x;x.Attach(raw[i]);out.push_back(x);}CoTaskMemFree(raw);return out;}
inline ComPtr<IMFMediaSource> openSource(const std::string& id){for(auto& a:videoDevices())if(utf8(attrString(a.Get(),MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_SYMBOLIC_LINK))==id){ComPtr<IMFMediaSource>s;check(a->ActivateObject(IID_PPV_ARGS(&s)),"Open capture device");return s;}throw std::runtime_error("Placa de captura desconectada ou não encontrada.");}
inline std::string formatName(const GUID& g){if(g==MFVideoFormat_NV12)return "NV12";if(g==MFVideoFormat_YUY2)return "YUY2";if(g==MFVideoFormat_MJPG)return "MJPG";if(g==MFVideoFormat_RGB32)return "RGB32";if(g==MFVideoFormat_ARGB32)return "ARGB32";if(g==MFVideoFormat_H264)return "H264";return "Outro";}
inline bool supported(const GUID& g){return g==MFVideoFormat_NV12||g==MFVideoFormat_YUY2||g==MFVideoFormat_MJPG||g==MFVideoFormat_RGB32||g==MFVideoFormat_ARGB32;}
