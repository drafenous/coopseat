import { useEffect, useState, type RefObject } from 'react';
import type { EffectIndex, SmoothingLevel } from '../types';

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  smoothing: SmoothingLevel;
  effect: EffectIndex;
  enabled: boolean;
  /**
   * Match the canvas to the source frame size (for `captureStream` outbound).
   * Default scales to the video element's layout box (local preview).
   */
  fullRes?: boolean;
};
type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?(cb: () => void): number;
  cancelVideoFrameCallback?(id: number): void;
};

const vertex = `#version 300 es
out vec2 uv;
void main(){uv=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(uv*vec2(2,-2)+vec2(-1,1),0,1);}`;
const header = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;uniform sampler2D src;uniform vec2 texel;uniform vec2 outSize;uniform float sharpness;uniform float sharpen;uniform float colorMode;uniform float curve;
vec3 at(vec2 p){return texture(src,p).rgb;}
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
`;
const fxaa = `${header}void main(){
 vec3 nw=at(uv-texel),ne=at(uv+vec2(texel.x,-texel.y)),sw=at(uv+vec2(-texel.x,texel.y)),se=at(uv+texel),m=at(uv);
 float lNW=luma(nw),lNE=luma(ne),lSW=luma(sw),lSE=luma(se),lM=luma(m);
 float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
 if(lMax-lMin<max(.0312,lMax*.125)){color=vec4(m,1);return;}
 vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
 float reduce=max((lNW+lNE+lSW+lSE)*(.25/8.),1./128.);
 dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),-8.,8.)*texel;
 vec3 a=.5*(at(uv+dir*(1./3.-.5))+at(uv+dir*(2./3.-.5)));
 vec3 b=a*.5+.25*(at(uv-dir*.5)+at(uv+dir*.5));
 float lB=luma(b);
 color=vec4(lB<lMin||lB>lMax?a:b,1);
}`;
const finish = `${header}
vec3 cas(vec2 p){
 vec3 n=at(p-vec2(0,texel.y)),w=at(p-vec2(texel.x,0)),c=at(p),e=at(p+vec2(texel.x,0)),s=at(p+vec2(0,texel.y));
 vec3 mn=min(c,min(min(n,s),min(w,e))),mx=max(c,max(max(n,s),max(w,e)));
 vec3 amp=sqrt(clamp(min(mn,2.-mx)/max(mx,vec3(1e-5)),0.,1.));
 vec3 wt=amp*(-1./mix(8.,5.,sharpness));
 return clamp((n*wt+w*wt+e*wt+s*wt+c)/(1.+4.*wt),0.,1.);
}
vec3 daltonize(vec3 c){
 vec3 seen=colorMode<2.5?c*mat3(.152286,1.052583,-.204868,.114503,.786281,.099216,-.003882,-.048116,1.051998)
  :colorMode<3.5?c*mat3(.367322,.860646,-.227968,.280085,.672501,.047413,-.01182,.04294,.968881)
  :c*mat3(1.255528,-.076749,-.178779,-.078411,.930809,.147602,.004733,.691367,.3039);
 vec3 err=c-seen;
 return clamp(c+(colorMode<3.5?vec3(0,.7*err.x+err.y,.7*err.x+err.z):vec3(.5*err.z,.5*err.z,0)),0.,1.);
}
void main(){
 vec3 c=sharpen>.5?cas(uv):at(uv);
 if(colorMode>1.5)c=daltonize(c);
 else if(colorMode>.5){c=clamp(mix(vec3(luma(c)),c,1.35),0.,1.);c=clamp((c-.5)*1.08+.5,0.,1.);}
 color=vec4(c,1);
}`;
const crt = `${header}void main(){
 vec2 p=uv*2.-1.;p*=1.+vec2(p.y*p.y*.04,p.x*p.x*.05)*curve;vec2 q=p*.5+.5;
 if(any(lessThan(q,vec2(0)))||any(greaterThan(q,vec2(1)))){color=vec4(0,0,0,1);return;}
 vec3 c=at(q);float l=luma(c);
 float d=abs(fract(q.y*max(floor(outSize.y/3.),100.))-.5)*2.;
 float scan=1.-.5*(1.-.5*l)*d*d;
 int m=int(gl_FragCoord.x)%3;vec3 mask=m==0?vec3(1.2,.8,.8):m==1?vec3(.8,1.2,.8):vec3(.8,.8,1.2);
 float vignette=pow(clamp(16.*q.x*q.y*(1.-q.x)*(1.-q.y),0.,1.),.12);
 color=vec4(clamp(c*scan*mask*vignette*1.2,0.,1.),1);
}`;
const lcd = `${header}void main(){
 float cell=max(3.,floor(outSize.y/240.));vec2 px=uv*outSize/cell;vec2 f=fract(px);
 vec3 c=at((floor(px)+.5)*cell/outSize);
 c=mix(vec3(luma(c)),c,.85)*.9+.05;
 float grid=f.x>1.-1./cell||f.y>1.-1./cell?.72:1.;
 color=vec4(clamp(c*grid,0.,1.),1);
}`;

type Program = {
  p: WebGLProgram;
  u: Record<
    'texel' | 'outSize' | 'sharpness' | 'sharpen' | 'colorMode' | 'curve',
    WebGLUniformLocation | null
  >;
};
function program(gl: WebGL2RenderingContext, fragment: string): Program {
  const p = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s) || 'shader');
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(p) || 'program');
  const u = (name: string) => gl.getUniformLocation(p, name);
  return {
    p,
    u: {
      texel: u('texel'),
      outSize: u('outSize'),
      sharpness: u('sharpness'),
      sharpen: u('sharpen'),
      colorMode: u('colorMode'),
      curve: u('curve'),
    },
  };
}

function texture(gl: WebGL2RenderingContext) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  for (const [k, v] of [
    [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
    [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
  ])
    gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t;
}

/**
 * Redraws the compatibility-mode video on a WebGL2 canvas with the same filters as the native core:
 * FXAA (plus CAS at level 2) and a screen effect (CRT, LCD, vivid colors or color-blind correction).
 * The `<video>` keeps playing underneath so Picture in Picture and frame callbacks still work.
 * Returns whether the canvas is showing the filtered picture; on any GPU failure it stays hidden.
 */
export function useVideoFilters({
  videoRef,
  canvasRef,
  smoothing,
  effect,
  enabled,
  fullRes = false,
}: Options) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const video = videoRef.current as FrameVideo | null,
      canvas = canvasRef.current;
    if (!enabled || (!smoothing && !effect) || !video || !canvas) return;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: 'high-performance',
    });
    if (!gl) return;
    const crtEffect = effect === 1 || effect === 2,
      grid = crtEffect || effect === 3,
      antiAlias = smoothing > 0 && !grid;
    let stopped = false,
      shown = false,
      frame = 0,
      width = 0,
      height = 0;
    let programs: { fxaa: Program; final: Program };
    try {
      programs = {
        fxaa: program(gl, fxaa),
        final: program(gl, crtEffect ? crt : effect === 3 ? lcd : finish),
      };
    } catch {
      return;
    }
    const source = texture(gl),
      smoothed = texture(gl),
      fbo = gl.createFramebuffer();
    // Each pass flips rows (uv.y=0 is the top of the viewport, but the bottom of a framebuffer texture), so the upload flips
    // once more when there are two passes and not at all when the final pass reads the video directly.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, antiAlias);

    const draw = () => {
      if (stopped) return;
      const vw = video.videoWidth,
        vh = video.videoHeight;
      if (vw && vh && video.readyState >= 2) {
        const cw = fullRes
          ? vw
          : Math.max(
              1,
              Math.round(
                vw *
                  Math.min(video.clientWidth / vw, video.clientHeight / vh) *
                  devicePixelRatio,
              ),
            );
        const ch = fullRes
          ? vh
          : Math.max(
              1,
              Math.round(
                vh *
                  Math.min(video.clientWidth / vw, video.clientHeight / vh) *
                  devicePixelRatio,
              ),
            );
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );
        if (antiAlias) {
          if (vw !== width || vh !== height) {
            width = vw;
            height = vh;
            gl.bindTexture(gl.TEXTURE_2D, smoothed);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA8,
              vw,
              vh,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              null,
            );
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(
              gl.FRAMEBUFFER,
              gl.COLOR_ATTACHMENT0,
              gl.TEXTURE_2D,
              smoothed,
              0,
            );
            gl.bindTexture(gl.TEXTURE_2D, source);
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.viewport(0, 0, vw, vh);
          gl.useProgram(programs.fxaa.p);
          gl.uniform2f(programs.fxaa.u.texel, 1 / vw, 1 / vh);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.bindTexture(gl.TEXTURE_2D, smoothed);
        }
        const f = programs.final;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, cw, ch);
        gl.useProgram(f.p);
        gl.uniform2f(f.u.texel, 1 / vw, 1 / vh);
        gl.uniform2f(f.u.outSize, cw, ch);
        gl.uniform1f(f.u.sharpness, 0.6);
        gl.uniform1f(f.u.sharpen, smoothing > 1 && !grid ? 1 : 0);
        gl.uniform1f(f.u.colorMode, effect > 3 ? effect - 3 : 0);
        gl.uniform1f(f.u.curve, effect === 1 ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!shown) {
          shown = true;
          setActive(true);
        }
      }
      schedule();
    };
    const schedule = () => {
      frame = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(draw)
        : requestAnimationFrame(draw);
    };
    const lost = (e: Event) => {
      e.preventDefault();
      stopped = true;
      setActive(false);
    };
    canvas.addEventListener('webglcontextlost', lost);
    schedule();
    return () => {
      stopped = true;
      setActive(false);
      canvas.removeEventListener('webglcontextlost', lost);
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      gl.deleteTexture(source);
      gl.deleteTexture(smoothed);
      gl.deleteFramebuffer(fbo);
      gl.deleteProgram(programs.fxaa.p);
      gl.deleteProgram(programs.final.p);
    };
  }, [videoRef, canvasRef, smoothing, effect, enabled, fullRes]);
  return active;
}
