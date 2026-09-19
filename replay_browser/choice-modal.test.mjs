import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./replay-browser.js',import.meta.url),'utf8');
const renderer=source.slice(source.indexOf('  function renderChoice('),source.indexOf('  function choiceOverlayForStep('));
const host={dataset:{}};
const copy={chosen:'Chosen',andOtherCards:n=>`and ${n} other cards`,selectDaoYun:'Select a Card',selectHdf:'Fate',selectTalent:'Talent',round:'Round ',roundSuffix:'',rerollsRemaining:'rerolls'};
const context=vm.createContext({$:()=>host,copy,isChinese:false,esc:String,cardAsset:String,careerAsset:String,careerName:String,phaseName:String,localizedInfo:()=>'',fateArtwork:()=>'',recording:{catalog:{cards:{},talents:{},fateStrategies:{}}},states:new Proxy([],{get(){throw new Error('Rendering an offer must not inspect future state')}})});
vm.runInContext(renderer,context);
for(const kind of ['card-selection','daoist-rhyme','immortal-fate','heavenly-derivation','side-job','additional-side-job']){
 for(const count of [3,9]){
  const options=Array.from({length:count},(_,i)=>({id:100+i}));
  for(const selected of [undefined,options[0].id,options.at(-1).id]){
   context.overlay={kind,roundOrPhase:14,options,...(selected==null?{}:{selected})};
   vm.runInContext('renderChoice(overlay)',context);
   assert.equal((host.innerHTML.match(/✓ Chosen/g)||[]).length,selected==null?0:1,kind);
   assert.equal((host.innerHTML.match(/class="selection-option[^"\n]* selected"/g)||[]).length,selected==null?0:1,kind);
  }
 }
}
console.log('PASS: 36 offer/result render cases, including large pools and hidden result cards; future-state access forbidden');
