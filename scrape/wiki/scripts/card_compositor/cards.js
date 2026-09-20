/* Preserve ordinary <img> layout, accessibility, hover and image saving while
 * composing shared card components lazily in a worker. */
(function(){
'use strict';
const base=new URL('.',document.currentScript.src).href;
const blank='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22308%22 height=%22508%22/%3E';
const cache=new Map(),pending=new Map(),queue=[];let running=0,sequence=0,worker;
const stats={rendered:0,failed:0,drawMs:[]};
function source(key){const image=key.startsWith('KeYinCard_')?blank.replace('308','352').replace('508','620'):blank;return image+'#yxp-card='+encodeURIComponent(key);}
function keyFor(url){
  const marker=String(url).match(/#yxp-card=([^&]+)/);if(marker)return decodeURIComponent(marker[1]);
  const card=String(url).match(/\/assets\/cards\/(-?\d+_(?:en|zh))\.(?:png|webp)(?:\?|$)/);if(card)return card[1];
  const sigil=String(url).match(/\/assets\/sigils\/(?:en|zh)\/(KeYinCard_\d+_(?:en|zh))\.(?:png|webp)(?:\?|$)/);if(sigil)return sigil[1];
  const heart=String(url).match(/\/clear-heart\/((?:embryo|formation)-[^/]+_(?:en|zh))\.webp(?:\?|$)/);if(heart)return 'heart-'+heart[1];
  return null;
}
function fallback(key){
  if(key.startsWith('KeYinCard_'))return new URL(`../../sigils/${key.split('_').at(-1)}/${key}.webp`,base).href;
  if(key.startsWith('heart-'))return new URL(`../../recordings/clear-heart/${key.slice(6)}.webp`,base).href;
  return new URL(`../../cards/${key}.webp`,base).href;
}
function sourceUrl(url){const key=keyFor(url);return key?source(key):url;}
function getWorker(){
  if(!worker){
    worker=new Worker(new URL('worker.js',base));
    worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;pending.delete(data.id);if(data.drawMs!=null)stats.drawMs.push(data.drawMs);if(stats.drawMs.length>128)stats.drawMs.shift();data.error?item.reject(new Error(data.error)):item.resolve(data.blob);};
    worker.onerror=error=>{for(const item of pending.values())item.reject(new Error(error.message));pending.clear();worker.terminate();worker=null;};
  }
  return worker;
}
async function compose(key){
  if(!/^[\w-]+$/.test(key))throw new Error('Invalid card key');
  const response=await fetch(new URL(`c/${key}.json.gz`,base));
  if(!response.ok)throw new Error(`Missing card recipe ${key}: ${response.status}`);
  const recipe=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  let blob;
  if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'){
    blob=await new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});getWorker().postMessage({id,recipe,base});});
  }else{
    if(!window.CardScene){await script('resample.js');await script('render.js');}
    const canvas=await CardScene.render(recipe.n,base,recipe.s);
    blob=canvas.convertToBlob?await canvas.convertToBlob({type:'image/png'}):await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  }
  stats.rendered++;return URL.createObjectURL(blob);
}
const scripts=new Map();
function script(name){if(!scripts.has(name))scripts.set(name,new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=new URL(name,base);el.onload=resolve;el.onerror=reject;document.head.append(el);}));return scripts.get(name);}
function pump(){
  while(running<2&&queue.length){const job=queue.shift();running++;compose(job.key).then(job.resolve,job.reject).finally(()=>{running--;pump();});}
}
function render(key){
  if(!cache.has(key)){
    const promise=new Promise((resolve,reject)=>{queue.push({key,resolve,reject});pump();});
    cache.set(key,{promise,url:null});
    promise.then(url=>{const item=cache.get(key);if(item)item.url=url;},()=>cache.delete(key));
  }
  return cache.get(key).promise;
}
function trim(){
  if(cache.size<=96)return;
  const visible=new Set([...document.images].map(im=>im.currentSrc||im.src));
  for(const [key,item]of cache){if(cache.size<=96)break;if(item.url&&!visible.has(item.url)){URL.revokeObjectURL(item.url);cache.delete(key);}}
}
const states=new WeakMap();
function hydrate(im){
  const key=im.dataset.cardKey||keyFor(im.getAttribute('src')||'');
  if(!key)return;
  const old=states.get(im);if(old?.key===key)return;
  states.set(im,{key,started:false});
  if(observer)observer.observe(im);else start(im);
}
function start(im){
  const state=states.get(im);if(!state||state.started)return;state.started=true;observer?.unobserve(im);
  render(state.key).then(url=>{
    if(states.get(im)!==state)return;
    im.src=url;im.dataset.cardRendered=state.key;im.classList.remove('asset-missing');setTimeout(trim,0);
  }).catch(error=>{if(states.get(im)!==state)return;stats.failed++;im.dataset.cardError=state.key;console.warn('Shared card failed; using preserved WebP',error);im.src=fallback(state.key);});
}
const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)start(e.target);},{rootMargin:'350px'}):null;
function scan(root){if(root instanceof HTMLImageElement)hydrate(root);root.querySelectorAll?.('img').forEach(hydrate);}
const mutations=new MutationObserver(entries=>{
 for(const e of entries){if(e.type==='attributes')hydrate(e.target);else for(const node of e.addedNodes)if(node.nodeType===1)scan(node);}
});
mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-card-key']});
scan(document);
Object.defineProperties(stats,{queued:{get:()=>queue.length},running:{get:()=>running}});
window.YxpCards={source,sourceUrl,render,stats};
})();
