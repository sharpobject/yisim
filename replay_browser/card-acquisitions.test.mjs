import assert from 'node:assert/strict';
import {acquisitionVerb,addedCards,appendCardAcquisitionSteps} from './card-acquisitions.mjs';
const talentInfo = id => ({nameEnglish:'Sword Rhyme Cultivate',nameChinese:'剑韵修炼',descriptionChinese:'战斗开始时加1[剑意]'});
const fateInfo = id => id===70
 ? {nameEnglish:'Fate Path - Sword Rhyme Cultivate',nameChinese:'命途-剑韵修炼',descriptionChinese:'选择剑韵修炼时减1修为，抽1张描述中含剑意相关效果的牌'}
 : {nameEnglish:'Bronze Mirror (Divine Grade)',nameChinese:'铜镜（神品）',descriptionChinese:'选择手牌或卡组中一张牌，获得其1级复制'};
const opts={talentInfo,fateInfo,cardName:(id,lang)=>`${lang}:${id}`,baseCardId:id=>id%10000};
const state=(hand,talents=[],fates=[])=>({round:14,players:{u:{username:'Player',talents}},privatePlayer:{uid:'u',hand,deck:[],selectedFateStrategies:fates,cardSelections:[]}});
const step=(s,type='PlayerData')=>({sequence:1,type,state:s,humanActions:[]});
assert.equal(acquisitionVerb('抽1张云剑'),'draw');
assert.equal(acquisitionVerb('获得其1级复制'),'gain');
assert.equal(acquisitionVerb('修为+1，获得1张【1】'),'gain');
assert.equal(acquisitionVerb('获得1换牌机会'),null);
assert.equal(acquisitionVerb('抽1张牌，获得1张【1】'),null);
assert.deepEqual(addedCards({hand:[1,1],deck:[]},{hand:[1,1,1],deck:[]},opts.baseCardId),[1]);
assert.deepEqual(addedCards({hand:[1],deck:[2]},{hand:[],deck:[1,2]},opts.baseCardId),[]);
assert.deepEqual(addedCards({hand:[1],deck:[]},{hand:[10001],deck:[]},opts.baseCardId),[]);
// Counter decrements open the mirror modal; the result arrives later.
const before=state([123],[],[{id:352,runtime:{kind:'cooldown',value:0}}]);
const offer=structuredClone(before);offer.privatePlayer.selectedFateStrategies[0].runtime.value=3;
offer.privatePlayer.choiceOverlay={kind:'card-selection',options:[{id:123}]};
const chosen=structuredClone(offer);delete chosen.privatePlayer.choiceOverlay;chosen.privatePlayer.hand.push(123);chosen.privatePlayer.cardSelections=[{selected:123}];
const exchanged=structuredClone(chosen);exchanged.privatePlayer.hand=[123,456];
const steps=[step(before),step(offer),step(chosen),step(exchanged,'ReplaceCardResp')];
const audit=appendCardAcquisitionSteps(steps,opts);
assert.equal(audit.gain,1);assert.equal(steps.length,5);
assert.equal(steps[3].type,'CardAcquisition');assert.equal(steps[3].state.privatePlayer.choiceOverlay,undefined);
assert.deepEqual(steps[3].state.privatePlayer.hand,[123,123]);assert.equal(steps[4].type,'ReplaceCardResp');
assert.equal(steps[3].humanActions[0].sources[0].id,352);
assert.deepEqual(steps[4].state,exchanged);
// Sword Rhyme's own text has no draw; its selected Fate Path supplies the verb.
const start=state([],[],[{id:70}]);const end=state([789],[{id:16,choiceHistory:{selected:16}}],[{id:70}]);
const sword=[step(start),step(end),step(state([456],end.players.u.talents,[{id:70}]),'ReplaceCardResp')];
appendCardAcquisitionSteps(sword,opts);
assert.equal(sword[2].humanActions[0].kind,'draw');assert.equal(sword[2].humanActions[0].sources[0].id,70);
assert.deepEqual(sword[2].state.privatePlayer.hand,[789]);assert.equal(sword[3].type,'ReplaceCardResp');
// Upgrades, movement, exchange replacements and normal round draws are excluded.
for(const type of ['MoveCardReq','InsertCardReq','RefineCardResp','ReplaceCardResp','CardOperationResp','RoundShopStart']){
 const input=[step(before),step(chosen,type)];appendCardAcquisitionSteps(input,opts);assert.equal(input.length,2,type);
}
console.log('PASS: Chinese draw/gain semantics, duplicate counts, upgrades, modal completion, Fate Path trigger, and immediate exchange visibility');
// A breakthrough may both deliver a reserved card (gain) and draw from a fate.
const reservedBefore=state([],[],[]);reservedBefore.players.u.phase=3;
reservedBefore.privatePlayer.daoYunChoices=[{selected:222,roundOrPhase:4}];
const reservedAfter=structuredClone(reservedBefore);reservedAfter.players.u.phase=4;
reservedAfter.players.u.talents=[{id:54}];reservedAfter.privatePlayer.hand=[222,333];
const mixed=[step(reservedBefore),step(reservedAfter)];
appendCardAcquisitionSteps(mixed,{...opts,talentInfo:()=>({nameEnglish:'Cloud Sword Inheritance',nameChinese:'云剑传承',descriptionChinese:'抽1张云剑牌'}),cardPhase:()=>4,
 daoYunDescription:'从随机元婴期或化神期牌中选择1张，到达对应境界后可获得选择的牌。若没有想要的牌也可选择立刻抽1张牌。'});
assert.deepEqual(mixed.slice(2).map(s=>[s.humanActions[0].kind,s.humanActions[0].cards]),[['gain',[222]],['draw',[333]]]);
console.log('PASS: simultaneous reserved-card gain and talent draw stay distinct');
const doubleBefore=structuredClone(reservedBefore);doubleBefore.privatePlayer.daoYunChoices[0].multiplier=2;
const doubleAfter=structuredClone(reservedAfter);doubleAfter.privatePlayer.daoYunChoices[0].multiplier=2;doubleAfter.privatePlayer.hand=[333,222,222];
const double=[step(doubleBefore),step(doubleAfter)];
appendCardAcquisitionSteps(double,{...opts,talentInfo:()=>({nameEnglish:'Cloud Sword Inheritance',nameChinese:'云剑传承',descriptionChinese:'抽1张云剑牌'}),cardPhase:()=>4,
 daoYunDescription:'到达对应境界后可获得选择的牌。若没有想要的牌也可选择立刻抽1张牌。'});
assert.deepEqual(double.slice(2).map(s=>[s.humanActions[0].kind,s.humanActions[0].cards]),[['draw',[333]],['gain',[222,222]]]);
assert.deepEqual(double[1].state.privatePlayer.hand,[]);
assert.deepEqual(double[2].state.privatePlayer.hand,[333]);
assert.deepEqual(double[3].state.privatePlayer.hand,[333,222,222]);
console.log('PASS: actual hand order, Double Daoist Rhyme copies and progressive hand visibility');
assert.equal(acquisitionVerb('从随机3张剑牌中选择1张获得并加入悟剑天赋领悟的牌中'),'gain');
// A reward may open another modal; keep its unselected offer after the reward.
const nextChoice=structuredClone(end);nextChoice.privatePlayer.choiceOverlay={kind:'card-selection',title:'Select a Card',options:[{id:5},{id:6}]};
const chained=[step(start),step(nextChoice)];appendCardAcquisitionSteps(chained,opts);
assert.equal(chained[2].type,'CardAcquisition');assert.equal(chained[2].state.privatePlayer.choiceOverlay,undefined);
assert.equal(chained[3].type,'ChoiceOffer');assert.equal(chained[3].state.privatePlayer.choiceOverlay.kind,'card-selection');
assert.equal(chained[3].state.privatePlayer.choiceOverlay.selected,undefined);
console.log('PASS: Chinese choose-and-gain wording and follow-up modal continuity');

// Daoist Rhyme Aura actually delivers the chosen card below its normal phase.
const auraBefore=state([46]);auraBefore.players.u.phase=4;
const auraAfter=state([444]);auraAfter.players.u.phase=4;
auraAfter.privatePlayer.daoYunChoices=[{selected:444,roundOrPhase:13}];
const aura=[step(auraBefore),step(auraAfter)];
appendCardAcquisitionSteps(aura,{...opts,cardPhase:()=>5,daoYunDescription:'到达对应境界后可获得选择的牌。'});
assert.equal(aura[2].humanActions[0].kind,'gain');
assert.deepEqual(aura[2].humanActions[0].cards,[444]);
const notDelivered=structuredClone(auraAfter);notDelivered.privatePlayer.hand=[];
const waiting=[step(auraBefore),step(notDelivered)];
appendCardAcquisitionSteps(waiting,{...opts,cardPhase:()=>5,daoYunDescription:'到达对应境界后可获得选择的牌。'});
assert.equal(waiting.length,2);
console.log('PASS: below-phase Aura reward requires an actually delivered matching card');

// A matching card already in the deck must not hide a newly gained hand copy.
const deckBefore=structuredClone(before);deckBefore.privatePlayer.hand=[];deckBefore.privatePlayer.deck=[123];
const deckOffer=structuredClone(offer);deckOffer.privatePlayer.hand=[];deckOffer.privatePlayer.deck=[123];
const deckChosen=structuredClone(chosen);deckChosen.privatePlayer.hand=[123];deckChosen.privatePlayer.deck=[123];
const deckCopy=[step(deckBefore),step(deckOffer),step(deckChosen)];
appendCardAcquisitionSteps(deckCopy,opts);
assert.deepEqual(deckCopy[2].state.privatePlayer.hand,[]);
assert.deepEqual(deckCopy[3].state.privatePlayer.hand,[123]);
assert.deepEqual(deckCopy[3].state.privatePlayer.deck,[123]);
console.log('PASS: identical existing deck copy does not hide a new hand copy');

// A personal-card transformation can coincide with an inheritance draw.
for (const zone of ['hand','deck']) {
 const b=state([],[{id:204}]);b.players.u.phase=4;b.privatePlayer[zone]=[219];
 const a=structuredClone(b);a.players.u.phase=5;a.players.u.talents.push({id:30143});
 a.privatePlayer[zone]=[220];a.privatePlayer.hand.push(444,445,446);
 const input=[step(b),step(a)];
 appendCardAcquisitionSteps(input,{...opts,talentInfo:id=>id===204
  ? {nameEnglish:'Personal transformation',descriptionChinese:'突破至化神期时手牌或卡组中的【219】变为【220】'}
  : {nameEnglish:'Inheritance of Crash Fist',descriptionChinese:'抽3张崩拳牌'}});
 assert.deepEqual(input.at(-1).humanActions[0].cards,[444,445,446]);
 assert.deepEqual(input.at(-1).state.privatePlayer,a.privatePlayer);
}
console.log('PASS: simultaneous personal-card transformations are not inheritance draws');

// An ability offer can be the first snapshot of a new round, alongside normal
// round draws. Keep its source until the later choice result arrives.
for(const type of ['PlayerData','RoundShopStart']) {
 const b=structuredClone(before);b.round=13;
 const o=structuredClone(offer);o.privatePlayer.hand=[123,456];
 const a=structuredClone(chosen);a.privatePlayer.hand=[123,456,123];
 const input=[step(b),step(o,type),step(a)];
 const stats=appendCardAcquisitionSteps(input,opts);
 assert.equal(stats.gain,1);assert.equal(stats.draw,0);
 assert.deepEqual(input[1].state.privatePlayer.hand,[123,456]);
 assert.deepEqual(input[2].state.privatePlayer.hand,[123,456]);
 assert.deepEqual(input[3].humanActions[0].cards,[123]);
 assert.equal(input[3].humanActions[0].sources[0].id,352);
}
console.log('PASS: first-round-snapshot ability offers retain their source without claiming normal round draws');
