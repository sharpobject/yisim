/* Separable Magic Kernel + Sharp 2021, matching scrape/magic_kernel_sharp.c.
 * Fold the two floating-point passes per axis into one weight table; clamp
 * only after both axes, as the native resample/translate routine does. */
(function(global){
'use strict';
const sharp=[-1,6,-35,204,-35,6,-1];
function kernel(v){const x=Math.abs(v);return x<=.5?.75-x*x:x<=1.5?.5*(x-1.5)**2:0;}
function weights(source,target,scale,offset,unsharpened=false){
  const distance=Math.min(scale,1),radius=1.5/distance;
  const raw=Array.from({length:target},(_,x)=>{
    const center=(x-offset+.5)/scale-.5;const pairs=[];let sum=0;
    for(let i=Math.max(0,Math.floor(center-radius)-1);i<=Math.min(source-1,Math.ceil(center+radius)+1);i++){
      const w=kernel((i-center)*distance);if(w){pairs.push([i,w]);sum+=w;}
    }
    return pairs.map(([i,w])=>[i,w/sum]);
  });
  if(unsharpened)return raw;
  return raw.map((_,x)=>{
    const table=new Map();
    for(let k=0;k<7;k++)for(const [i,w] of raw[Math.max(0,Math.min(target-1,x+k-3))])table.set(i,(table.get(i)||0)+w*sharp[k]/144);
    return [...table].sort((a,b)=>a[0]-b[0]);
  });
}
function resample(input,w,h,sx,sy,dx,dy,method){
  const shift=method==='magic_kernel_shift_rgba';
  const sw=input.width,sh=input.height,src=input.data;
  const wx=weights(sw,w,sx,dx,shift),wy=weights(sh,h,sy,dy,shift);
  const temp=new Float64Array(sh*w*4),out=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<sh;y++)for(let x=0;x<w;x++){
    let r=0,g=0,b=0,a=0;
    for(const [i,k] of wx[x]){const p=(y*sw+i)*4;const alpha=shift?src[p+3]/255:1;r+=src[p]*alpha*k;g+=src[p+1]*alpha*k;b+=src[p+2]*alpha*k;a+=src[p+3]*k;}
    const p=(y*w+x)*4;temp[p]=r;temp[p+1]=g;temp[p+2]=b;temp[p+3]=a;
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let r=0,g=0,b=0,a=0;
    for(const [i,k] of wy[y]){const p=(i*w+x)*4;r+=temp[p]*k;g+=temp[p+1]*k;b+=temp[p+2]*k;a+=temp[p+3]*k;}
    const p=(y*w+x)*4;const alpha=shift?(a>0?255/Math.min(255,a):0):1;out[p]=r*alpha;out[p+1]=g*alpha;out[p+2]=b*alpha;out[p+3]=a;
  }
  return new ImageData(out,w,h);
}
global.CardResample=resample;
})(globalThis);
