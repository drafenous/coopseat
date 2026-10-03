#pragma once
#include "common.hpp"
#include <d3d11.h>
#include <d3dcompiler.h>
#include <dxgi1_5.h>
class Renderer {
 ComPtr<ID3D11Device> dev;ComPtr<ID3D11DeviceContext> ctx;ComPtr<IDXGISwapChain1> swap;
 ComPtr<ID3D11RenderTargetView> target;ComPtr<ID3D11VertexShader> vs;ComPtr<ID3D11PixelShader> ps,psFxaa,psFinish,psCrt,psLcd;ComPtr<ID3D11SamplerState> sampler;ComPtr<ID3D11Buffer> constants;
 ComPtr<ID3D11Texture2D> tex[2];ComPtr<ID3D11ShaderResourceView> view[2];
 // Filters work at the capture resolution: rgb[0] holds the converted frame, rgb[1] the anti-aliased one.
 ComPtr<ID3D11Texture2D> rgb[2];ComPtr<ID3D11ShaderResourceView> rgbView[2];ComPtr<ID3D11RenderTargetView> rgbTarget[2];
 HWND hwnd;UINT width=0,height=0,windowW=0,windowH=0;GUID format{};bool tearing=false;bool bt709=true,full=false;int smoothing=0,effect=0;
 struct Params{float kind,width,bt709,full,texelX,texelY,sharpness,sharpen,outW,outH,colorMode,curve;};
 void texture(int slot,UINT w,UINT h,DXGI_FORMAT f){D3D11_TEXTURE2D_DESC d{};d.Width=w;d.Height=h;d.MipLevels=1;d.ArraySize=1;d.Format=f;d.SampleDesc.Count=1;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE;check(dev->CreateTexture2D(&d,nullptr,&tex[slot]),"Create frame texture");check(dev->CreateShaderResourceView(tex[slot].Get(),nullptr,&view[slot]),"Texture view");}
 void intermediates(){for(int i=0;i<2;i++){D3D11_TEXTURE2D_DESC d{};d.Width=width;d.Height=height;d.MipLevels=1;d.ArraySize=1;d.Format=DXGI_FORMAT_R8G8B8A8_UNORM;d.SampleDesc.Count=1;d.Usage=D3D11_USAGE_DEFAULT;d.BindFlags=D3D11_BIND_SHADER_RESOURCE|D3D11_BIND_RENDER_TARGET;check(dev->CreateTexture2D(&d,nullptr,&rgb[i]),"Smoothing texture");check(dev->CreateShaderResourceView(rgb[i].Get(),nullptr,&rgbView[i]),"Smoothing view");check(dev->CreateRenderTargetView(rgb[i].Get(),nullptr,&rgbTarget[i]),"Smoothing target");}}
 void pass(ID3D11PixelShader* shader,ID3D11RenderTargetView* rtv,ID3D11ShaderResourceView* a,ID3D11ShaderResourceView* b,const D3D11_VIEWPORT& vp,const Params& params){
  ID3D11ShaderResourceView* none[2]={};ctx->PSSetShaderResources(0,2,none);ctx->OMSetRenderTargets(1,&rtv,nullptr);ctx->RSSetViewports(1,&vp);
  ctx->UpdateSubresource(constants.Get(),0,nullptr,&params,0,0);ctx->PSSetShader(shader,nullptr,0);ID3D11ShaderResourceView* views[]={a,b};ctx->PSSetShaderResources(0,2,views);ctx->Draw(3,0);
 }
public:
 explicit Renderer(HWND window):hwnd(window){
  D3D_FEATURE_LEVEL level;check(D3D11CreateDevice(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,D3D11_CREATE_DEVICE_BGRA_SUPPORT,nullptr,0,D3D11_SDK_VERSION,&dev,&level,&ctx),"D3D11 GPU");
  ComPtr<IDXGIDevice> dx;check(dev.As(&dx),"DXGI device");ComPtr<IDXGIAdapter>a;check(dx->GetAdapter(&a),"DXGI adapter");ComPtr<IDXGIFactory2> factory;check(a->GetParent(IID_PPV_ARGS(&factory)),"DXGI factory");ComPtr<IDXGIFactory5> f5;if(SUCCEEDED(factory.As(&f5))){BOOL allow=FALSE;if(SUCCEEDED(f5->CheckFeatureSupport(DXGI_FEATURE_PRESENT_ALLOW_TEARING,&allow,sizeof(allow))))tearing=allow!=FALSE;}
  DXGI_SWAP_CHAIN_DESC1 desc{};desc.Width=1280;desc.Height=720;desc.Format=DXGI_FORMAT_B8G8R8A8_UNORM;desc.SampleDesc.Count=1;desc.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;desc.BufferCount=2;desc.SwapEffect=DXGI_SWAP_EFFECT_FLIP_DISCARD;desc.Flags=tearing?DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING:0;
  check(factory->CreateSwapChainForHwnd(dev.Get(),window,&desc,nullptr,nullptr,&swap),"Swap chain");factory->MakeWindowAssociation(window,DXGI_MWA_NO_ALT_ENTER);ComPtr<IDXGIDevice1> dx1;if(SUCCEEDED(dev.As(&dx1)))dx1->SetMaximumFrameLatency(1);
  const char* shader=R"(
Texture2D plane0 : register(t0); Texture2D plane1 : register(t1); SamplerState linearSampler : register(s0);
cbuffer Params : register(b0) { float kind; float videoWidth; float use709; float fullRange; float2 texel; float sharpness; float sharpen; float2 outSize; float colorMode; float curve; };
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
}
float3 at(float2 uv){return plane0.SampleLevel(linearSampler,uv,0).rgb;}
float luma(float3 c){return dot(c,float3(.299,.587,.114));}
float4 fxaa(V i):SV_TARGET{
 float3 nw=at(i.uv-texel),ne=at(i.uv+float2(texel.x,-texel.y)),sw=at(i.uv+float2(-texel.x,texel.y)),se=at(i.uv+texel),m=at(i.uv);
 float lNW=luma(nw),lNE=luma(ne),lSW=luma(sw),lSE=luma(se),lM=luma(m);
 float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
 if(lMax-lMin<max(.0312,lMax*.125))return float4(m,1);
 float2 dir=float2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
 float reduce=max((lNW+lNE+lSW+lSE)*(.25/8),1./128);
 dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),-8,8)*texel;
 float3 a=.5*(at(i.uv+dir*(1./3-.5))+at(i.uv+dir*(2./3-.5)));
 float3 b=a*.5+.25*(at(i.uv-dir*.5)+at(i.uv+dir*.5));
 float lB=luma(b);
 return float4(lB<lMin||lB>lMax?a:b,1);
}
float3 cas(float2 uv){
 float3 n=at(uv-float2(0,texel.y)),w=at(uv-float2(texel.x,0)),c=at(uv),e=at(uv+float2(texel.x,0)),s=at(uv+float2(0,texel.y));
 float3 mn=min(c,min(min(n,s),min(w,e))),mx=max(c,max(max(n,s),max(w,e)));
 float3 amp=sqrt(saturate(min(mn,2-mx)/max(mx,1e-5)));
 float3 wt=amp*(-1/lerp(8.,5.,sharpness));
 return saturate((n*wt+w*wt+e*wt+s*wt+c)/(1+4*wt));
}
float3 daltonize(float3 c){
 float3 seen=colorMode<2.5?mul(float3x3(.152286,1.052583,-.204868,.114503,.786281,.099216,-.003882,-.048116,1.051998),c)
  :colorMode<3.5?mul(float3x3(.367322,.860646,-.227968,.280085,.672501,.047413,-.01182,.04294,.968881),c)
  :mul(float3x3(1.255528,-.076749,-.178779,-.078411,.930809,.147602,.004733,.691367,.3039),c);
 float3 err=c-seen;
 return saturate(c+(colorMode<3.5?float3(0,.7*err.x+err.y,.7*err.x+err.z):float3(.5*err.z,.5*err.z,0)));
}
float4 finish(V i):SV_TARGET{
 float3 c=sharpen>.5?cas(i.uv):at(i.uv);
 if(colorMode>1.5)c=daltonize(c);
 else if(colorMode>.5){c=saturate(lerp(luma(c).xxx,c,1.35));c=saturate((c-.5)*1.08+.5);}
 return float4(c,1);
}
float4 crt(V i):SV_TARGET{
 float2 p=i.uv*2-1;p*=1+float2(p.y*p.y*.04,p.x*p.x*.05)*curve;float2 uv=p*.5+.5;
 if(any(uv<0)||any(uv>1))return float4(0,0,0,1);
 float3 c=at(uv);float l=luma(c);
 float d=abs(frac(uv.y*max(floor(outSize.y/3),100))-.5)*2;
 float scan=1-.5*(1-.5*l)*d*d;
 int m=(int)i.pos.x%3;float3 mask=m==0?float3(1.2,.8,.8):m==1?float3(.8,1.2,.8):float3(.8,.8,1.2);
 float vignette=pow(saturate(16*uv.x*uv.y*(1-uv.x)*(1-uv.y)),.12);
 return float4(saturate(c*scan*mask*vignette*1.2),1);
}
float4 lcd(V i):SV_TARGET{
 float cell=max(3,floor(outSize.y/240));float2 px=i.uv*outSize/cell;float2 f=frac(px);
 float3 c=at((floor(px)+.5)*cell/outSize);
 c=lerp(luma(c).xxx,c,.85)*.9+.05;
 float grid=f.x>1-1/cell||f.y>1-1/cell?.72:1;
 return float4(saturate(c*grid),1);
})";
  auto compile=[&](const char* entry,const char* target){ComPtr<ID3DBlob> blob,err;check(D3DCompile(shader,strlen(shader),nullptr,nullptr,nullptr,entry,target,D3DCOMPILE_OPTIMIZATION_LEVEL3,0,&blob,&err),entry);return blob;};
  auto v=compile("vert","vs_4_0");check(dev->CreateVertexShader(v->GetBufferPointer(),v->GetBufferSize(),nullptr,&vs),"Vertex shader object");
  auto pixelShader=[&](const char* entry,ComPtr<ID3D11PixelShader>& out){auto p=compile(entry,"ps_4_0");check(dev->CreatePixelShader(p->GetBufferPointer(),p->GetBufferSize(),nullptr,&out),entry);};
  pixelShader("pixel",ps);pixelShader("fxaa",psFxaa);pixelShader("finish",psFinish);pixelShader("crt",psCrt);pixelShader("lcd",psLcd);
  D3D11_SAMPLER_DESC sd{};sd.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;sd.AddressU=sd.AddressV=sd.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;sd.ComparisonFunc=D3D11_COMPARISON_NEVER;sd.MaxLOD=D3D11_FLOAT32_MAX;check(dev->CreateSamplerState(&sd,&sampler),"Sampler");D3D11_BUFFER_DESC bd{};bd.ByteWidth=sizeof(Params);bd.Usage=D3D11_USAGE_DEFAULT;bd.BindFlags=D3D11_BIND_CONSTANT_BUFFER;check(dev->CreateBuffer(&bd,nullptr,&constants),"Shader constants");
 }
 /** 0 off, 1 anti-aliasing, 2 anti-aliasing plus sharpening. */
 void smooth(int level){smoothing=std::clamp(level,0,2);}
 /** 0 none, 1 curved CRT, 2 flat CRT, 3 handheld LCD, 4 vivid colors, 5 protanopia, 6 deuteranopia, 7 tritanopia. */
 void look(int value){effect=std::clamp(value,0,7);}
 void configure(UINT w,UINT h,GUID f,IMFMediaType* type){width=w;height=h;format=f;for(int i=0;i<2;i++){view[i].Reset();tex[i].Reset();rgbTarget[i].Reset();rgbView[i].Reset();rgb[i].Reset();}UINT32 matrix=0,range=0;type->GetUINT32(MF_MT_YUV_MATRIX,&matrix);type->GetUINT32(MF_MT_VIDEO_NOMINAL_RANGE,&range);bt709=matrix?matrix==MFVideoTransferMatrix_BT709:h>=720;full=range==MFNominalRange_0_255;
  if(f==MFVideoFormat_NV12){texture(0,w,h,DXGI_FORMAT_R8_UNORM);texture(1,w/2,h/2,DXGI_FORMAT_R8G8_UNORM);}else if(f==MFVideoFormat_YUY2)texture(0,w/2,h,DXGI_FORMAT_R8G8B8A8_UNORM);else texture(0,w,h,DXGI_FORMAT_B8G8R8A8_UNORM);
 }
 void upload(const BYTE* bytes,LONG stride){if(stride<=0)throw std::runtime_error("Negative stride must be normalized before upload");ctx->UpdateSubresource(tex[0].Get(),0,nullptr,bytes,static_cast<UINT>(stride),0);if(format==MFVideoFormat_NV12)ctx->UpdateSubresource(tex[1].Get(),0,nullptr,bytes+size_t(stride)*height,static_cast<UINT>(stride),0);}
 bool draw(bool vsync){RECT r{};GetClientRect(hwnd,&r);UINT w=r.right,h=r.bottom;if(!w||!h||IsIconic(hwnd))return false;if(w!=windowW||h!=windowH){ctx->OMSetRenderTargets(0,nullptr,nullptr);target.Reset();check(swap->ResizeBuffers(0,w,h,DXGI_FORMAT_UNKNOWN,tearing?DXGI_SWAP_CHAIN_FLAG_ALLOW_TEARING:0),"Resize buffers");ComPtr<ID3D11Texture2D>b;check(swap->GetBuffer(0,IID_PPV_ARGS(&b)),"Back buffer");check(dev->CreateRenderTargetView(b.Get(),nullptr,&target),"Render target");windowW=w;windowH=h;}
  const float clear[4]={0,0,0,1};ctx->ClearRenderTargetView(target.Get(),clear);float scale=std::min(float(w)/width,float(h)/height);D3D11_VIEWPORT vp{(w-width*scale)/2,(h-height*scale)/2,width*scale,height*scale,0,1},source{0,0,float(width),float(height),0,1};
  ctx->VSSetShader(vs.Get(),nullptr,0);ctx->PSSetConstantBuffers(0,1,constants.GetAddressOf());ctx->PSSetSamplers(0,1,sampler.GetAddressOf());ctx->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
  Params params{format==MFVideoFormat_NV12?0.f:format==MFVideoFormat_YUY2?1.f:2.f,float(width),bt709?1.f:0.f,full?1.f:0.f,1.f/width,1.f/height,.6f,0,vp.Width,vp.Height,0,0};
  if(!smoothing&&!effect)pass(ps.Get(),target.Get(),view[0].Get(),view[1].Get(),vp,params);
  else{
   // CRT and LCD rebuild the pixel grid themselves, so anti-aliasing would only blur them.
   bool crt=effect==1||effect==2,grid=crt||effect==3;if(!rgb[0])intermediates();pass(ps.Get(),rgbTarget[0].Get(),view[0].Get(),view[1].Get(),source,params);ID3D11ShaderResourceView* input=rgbView[0].Get();
   if(smoothing&&!grid){pass(psFxaa.Get(),rgbTarget[1].Get(),input,nullptr,source,params);input=rgbView[1].Get();}
   params.kind=2;params.sharpen=smoothing>1&&!grid?1.f:0.f;params.colorMode=effect>3?float(effect-3):0.f;params.curve=effect==1?1.f:0.f;
   pass(crt?psCrt.Get():effect==3?psLcd.Get():psFinish.Get(),target.Get(),input,nullptr,vp,params);
  }
  HRESULT hr=swap->Present(vsync?1:0,!vsync&&tearing?DXGI_PRESENT_ALLOW_TEARING:0);check(hr,"Present");return hr!=DXGI_STATUS_OCCLUDED;
 }
};
