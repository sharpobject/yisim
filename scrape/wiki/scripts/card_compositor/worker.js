'use strict';
importScripts('resample.js','render.js');
self.onmessage=async({data:{id,recipe,base}})=>{
  try{
    const canvas=await CardScene.render(recipe.n,base,recipe.s);
    const drawMs=CardScene.render.lastDrawMs;
    const blob=await canvas.convertToBlob({type:'image/png'});
    self.postMessage({id,blob,drawMs});
  }catch(error){self.postMessage({id,error:String(error.stack||error)});}
};
