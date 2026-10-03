#pragma once
#include "common.hpp"
#include <d3d11.h>
#include <d3dcompiler.h>
#include <dxgi1_5.h>
class Renderer {
 ComPtr<ID3D11Device> dev;ComPtr<ID3D11DeviceContext> ctx;ComPtr<IDXGISwapChain1> swap;
 ComPtr<ID3D11RenderTargetView> target;ComPtr<ID3D11VertexShader> vs;ComPtr<ID3D11PixelShader> ps;ComPtr<ID3D11SamplerState> sampler;ComPtr<ID3D11Buffer> constants;
 ComPtr<ID3D11Texture2D> tex[2];ComPtr<ID3D11ShaderResourceView> view[2];
 HWND hwnd;UINT width=0,height=0,windowW=0,windowH=0;GUID format{};bool tearing=false;bool bt709=true,full=false;
 struct Params{float kind,width,bt709,full;};
 void texture(int slot,UINT w,UINT h,DXGI_FORMAT f){D3D11_TEXTURE2D_DESC d{};d.Width=w;d.Height=h;d.MipLevels=1;d.ArraySize=1;d.Format=f;d.SampleDesc.Count=1;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;check(dev->CreateTexture2D(&d,nullptr,&tex[slot]),"Create frame texture");check(dev->CreateShaderResourceView(tex[slot].Get(),nullptr,&view[slot]),"Texture view");}
public:
 explicit Renderer(HWND window):hwnd(window){
  D3D_FEATURE_LEVEL level;check(D3D11CreateDevice(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,D3D11_CREATE_DEVICE_BGRA_SUPPORT,nullptr,0,D3D11_SDK_VERSION,&dev,&level,&ctx),"D3D11 GPU");
  ComPtr<IDXGIDevice> dx;check(dev.As(&dx),"DXGI device");ComPtr<IDXGIAdapter>a;check(dx->GetAdapter(&a),"DXGI adapter");ComPtr<IDXGIFactory2> factory;check(a->GetParent(IID_PPV_ARGS(&factory)),"DXGI factory");ComPtr<IDXGIFactory5> f5;if(SUCCEEDED(factory.As(&f5))){BOOL allow=FALSE;if(SUCCEEDED(f5->CheckFeatureSupport(DXGI_FEATURE_PRESENT_ALLOW_TEARING,&allow,sizeof(allow))))tearing=allow!=FALSE;}
  DXGI_SWAP_CHAIN_DESC1 desc{};desc.Width=1280;desc.Height=720;desc.Format=DXGI_FORMAT_B8G8R8A8_UNORM;desc.SampleDesc.Count=1;desc.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;desc.BufferCount=2;desc.SwapEffect=DXGI_SWAP_EFFECT_FLIP_DISCARD;desc.Flags=tearing?DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING:0;
  check(factory->CreateSwapChainForHwnd(dev.Get(),window,&desc,nullptr,nullptr,&swap),"Swap chain");factory->MakeWindowAssociation(window,DXGI_MWA_NO_ALT_ENTER);ComPtr<IDXGIDevice1> dx1;if(SUCCEEDED(dev.As(&dx1)))dx1->SetMaximumFrameLatency(1);
  const char* shader=R"(
Texture2D plane0 : register(t0); Texture2D plane1 : register(t1); SamplerState linearSampler : register(s0);
cbuffer Params : register(b0) { float kind; float videoWidth; float use709; float fullRange; };
struct V { float4 pos:SV_POSITION; float2 uv:TEXCOORD0; };
V vert(uint id:SV_VertexID){V o;o.uv=float2((id<<1)&2,id&2);o.pos=float4(o.uv*float2(2,-2)+float2(-1,1),0,1);return o;}
float4 pixel(V i):SV_TARGET{
 if(kind>1.5)return float4(plane0.Sample(linearSampler,i.uv).rgb,1);
 float y,u,v;
 if(kind<.5){y=plane0.Sample(linearSampler,i.uv).r;float2 uv=plane1.Sample(linearSampler,i.uv).rg;u=uv.r-.5019608;v=uv.g-.5019608;}
 else{uint w,h;plane0.GetDimensions(w,h);uint x=min((uint)(i.uv.x*videoWidth),(uint)videoWidth-1);float4 packed=plane0.Load(int3(x/2,min((uint)(i.uv.y*h),h-1),0));y=(x&1)?packed.b:packed.r;u=packed.g-.5019608;v=packed.a-.5019608;}
 if(fullRange<.5){y=(y-.0627451)*1.1643836;u*=1.1383929;v*=1.1383929;}
 float3 rgb=use709>.5?float3(y+1.5748*v,y-.187324*u-.468124*v,y+1.8556*u):float3(y+1.402*v,y-.344136*u-.714136*v,y+1.772*u);
 return float4(saturate(rgb),1);
})";
  ComPtr<ID3DBlob> v,p,err;check(D3DCompile(shader,strlen(shader),nullptr,nullptr,nullptr,"vert","vs_4_0",D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&v,&err),"Vertex shader");check(D3DCompile(shader,strlen(shader),nullptr,nullptr,nullptr,"pixel","ps_4_0",D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&p,&err),"Pixel shader");check(dev->CreateVertexShader(v->GetBufferPointer(),v->GetBufferSize(),nullptr,&vs),"Vertex shader object");check(dev->CreatePixelShader(p->GetBufferPointer(),p->GetBufferSize(),nullptr,&ps),"Pixel shader object");
  D3D11_SAMPLER_DESC sd{};sd.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;sd.AddressU=sd.AddressV=sd.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;sd.ComparisonFunc=D3D11_COMPARISON_NEVER;sd.MaxLOD=D3D11_FLOAT32_MAX;check(dev->CreateSamplerState(&sd,&sampler),"Sampler");D3D11_BUFFER_DESC bd{};bd.ByteWidth=sizeof(Params);bd.Usage=D3D11_USAGE_DEFAULT;bd.BindFlags=D3D11_BIND_CONSTANT_BUFFER;check(dev->CreateBuffer(&bd,nullptr,&constants),"Shader constants");
 }
 void configure(UINT w,UINT h,GUID f,IMFMediaType* type){width=w;height=h;format=f;for(int i=0;i<2;i++){view[i].Reset();tex[i].Reset();}UINT32 matrix=0,range=0;type->GetUINT32(MF_MT_YUV_MATRIX,&matrix);type->GetUINT32(MF_MT_VIDEO_NOMINAL_RANGE,&range);bt709=matrix?matrix==MFVideoTransferMatrix_BT709:h>=720;full=range==MFNominalRange_0_255;
  if(f==MFVideoFormat_NV12){texture(0,w,h,DXGI_FORMAT_R8_UNORM);texture(1,w/2,h/2,DXGI_FORMAT_R8G8_UNORM);}else if(f==MFVideoFormat_YUY2)texture(0,w/2,h,DXGI_FORMAT_R8G8B8A8_UNORM);else texture(0,w,h,DXGI_FORMAT_B8G8R8A8_UNORM);
 }
 void upload(const BYTE* bytes,LONG stride){if(stride<=0)throw std::runtime_error("Negative stride must be normalized before upload");ctx->UpdateSubresource(tex[0].Get(),0,nullptr,bytes,static_cast<UINT>(stride),0);if(format==MFVideoFormat_NV12)ctx->UpdateSubresource(tex[1].Get(),0,nullptr,bytes+size_t(stride)*height,static_cast<UINT>(stride),0);}
 bool draw(bool vsync){RECT r{};GetClientRect(hwnd,&r);UINT w=r.right,h=r.bottom;if(!w||!h||IsIconic(hwnd))return false;if(w!=windowW||h!=windowH){ctx->OMSetRenderTargets(0,nullptr,nullptr);target.Reset();check(swap->ResizeBuffers(0,w,h,DXGI_FORMAT_UNKNOWN,tearing?DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING:0),"Resize buffers");ComPtr<ID3D11Texture2D>b;check(swap->GetBuffer(0,IID_PPV_ARGS(&b)),"Back buffer");check(dev->CreateRenderTargetView(b.Get(),nullptr,&target),"Render target");windowW=w;windowH=h;}
  const float clear[4]={0,0,0,1};ctx->ClearRenderTargetView(target.Get(),clear);ctx->OMSetRenderTargets(1,target.GetAddressOf(),nullptr);float scale=std::min(float(w)/width,float(h)/height);D3D11_VIEWPORT vp{(w-width*scale)/2,(h-height*scale)/2,width*scale,height*scale,0,1};ctx->RSSetViewports(1,&vp);
  Params params{format==MFVideoFormat_NV12?0.f:format==MFVideoFormat_YUY2?1.f:2.f,float(width),bt709?1.f:0.f,full?1.f:0.f};ctx->UpdateSubresource(constants.Get(),0,nullptr,&params,0,0);ctx->PSSetConstantBuffers(0,1,constants.GetAddressOf());ctx->VSSetShader(vs.Get(),nullptr,0);ctx->PSSetShader(ps.Get(),nullptr,0);ctx->PSSetSamplers(0,1,sampler.GetAddressOf());ID3D11ShaderResourceView* views[]={view[0].Get(),view[1].Get()};ctx->PSSetShaderResources(0,2,views);ctx->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);ctx->Draw(3,0);HRESULT hr=swap->Present(vsync?1:0,!vsync&&tearing?DXGI_PRESENT_ALLOW_TEARING:0);check(hr,"Present");return hr!=DXGI_STATUS_OCCLUDED;
 }
};
