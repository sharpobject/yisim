import fs from 'node:fs';
import path from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {TextureAtlas,CanvasTexture,AtlasAttachmentLoader,SkeletonBinary,Skeleton,AnimationState,AnimationStateData,SkeletonRenderer,Physics,Vector2} from '@esotericsoftware/spine-canvas';
const [assetRoot,textureRoot,outRoot,id]=process.argv.slice(2);
const atlas=new TextureAtlas(fs.readFileSync(path.join(assetRoot,`Emoji_${id}.atlas`),'utf8'));
for(const page of atlas.pages)page.setTexture(new CanvasTexture(await loadImage(path.join(textureRoot,page.name))));
const data=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(fs.readFileSync(path.join(assetRoot,`Emoji_${id}.skel`))));
const animation=data.animations.find(a=>a.name==='animation')??data.animations[0];
if(!animation)throw new Error('No animation for '+id);
const fps=20,count=Math.max(2,Math.ceil(animation.duration*fps));
function setup(){const skeleton=new Skeleton(data);skeleton.setToSetupPose();const state=new AnimationState(new AnimationStateData(data));state.setAnimation(0,animation.name,false);return {skeleton,state};}
const offset=new Vector2(),size=new Vector2();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
let {skeleton,state}=setup();
for(let i=0;i<count;i++){if(i)state.update(1/fps);state.apply(skeleton);skeleton.updateWorldTransform(Physics.update);skeleton.getBounds(offset,size,[]);minX=Math.min(minX,offset.x);minY=Math.min(minY,offset.y);maxX=Math.max(maxX,offset.x+size.x);maxY=Math.max(maxY,offset.y+size.y);}
const scale=240/Math.max(maxX-minX,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
({skeleton,state}=setup());const canvas=createCanvas(256,256),ctx=canvas.getContext('2d'),renderer=new SkeletonRenderer(ctx);renderer.triangleRendering=true;
const dest=path.join(outRoot,id);fs.mkdirSync(dest,{recursive:true});
for(let i=0;i<count;i++){if(i)state.update(1/fps);state.apply(skeleton);skeleton.updateWorldTransform(Physics.update);ctx.resetTransform();ctx.clearRect(0,0,256,256);ctx.translate(128,128);ctx.scale(scale,-scale);ctx.translate(-cx,-cy);renderer.draw(skeleton);fs.writeFileSync(path.join(dest,`${String(i).padStart(4,'0')}.png`),canvas.toBuffer('image/png'));}
console.log(JSON.stringify({id,animations:data.animations.map(a=>({name:a.name,duration:a.duration})),frames:count,fps,bounds:{minX,minY,maxX,maxY}}));
