// Presentation-only acquisition steps. Card identities come from observed states;
// draw/gain wording comes exclusively from the Chinese effect description.
export function acquisitionVerb(text = '') {
  const zh = text.replace(/<[^>]*>/g, '').replace(/\\n/g, '\n');
  const draw = /抽(?:取)?\s*(?:\d+|[一二三四五六七八九十两几])?\s*张|抽取其中\d+张/.test(zh);
  const gain = /获得[^。；;\n]*(?:张|复制|【\d+】)|(?:选择|选取)[^。；;\n]*张[^。；;\n]*获得/.test(zh);
  return draw === gain ? null : draw ? 'draw' : 'gain';
}
const clone = value => structuredClone(value);
const positiveCards = p => [...(p?.hand ?? []), ...(p?.deck ?? [])].map(Number).filter(id => id > 0);
export function addedCards(before, after, baseCardId) {
  const remaining = positiveCards(before);
  const added = positiveCards(after).filter(id => {
    const i = remaining.indexOf(id);
    if (i < 0) return true;
    remaining.splice(i, 1); return false;
  });
  // A changed level is an upgrade, not a newly drawn/gained card.
  return added.filter(id => {
    const i = remaining.findIndex(old => baseCardId(old) === baseCardId(id));
    if (i < 0) return true;
    remaining.splice(i, 1); return false;
  });
}
export function appendCardAcquisitionSteps(steps, {talentInfo, fateInfo, cardName, baseCardId, cardPhase = () => 0, daoYunDescription = ""}) {
  const result = [];
  let previous = null, pending = [], deferred = [], deferredSequence = null;
  const stats = {draw:0, gain:0, cards:0, ambiguous:[], unattributed:[]};
  const source = (family, id, info) => ({family, id:Number(id),
    nameEnglish:info?.nameEnglish, nameChinese:info?.nameChinese,
    descriptionChinese:info?.descriptionChinese ?? '', verb:acquisitionVerb(info?.descriptionChinese)});
  for (const step of steps) {
    const observedState = step.state;
    const before = previous?.privatePlayer, after = observedState?.privatePlayer;
    result.push(step);
    if (!before || !after || before.uid !== after.uid || step.battle) {
      pending = []; deferred = []; previous = step.state; continue;
    }
    const roundStart = previous.round !== step.state.round || step.type === 'RoundShopStart';
    if (roundStart) { pending = []; deferred = []; }
    const priorPlayer = previous.players?.[before.uid] ?? {};
    const player = step.state.players?.[after.uid] ?? {};
    const oldTalents = new Set((priorPlayer.talents ?? []).map(t => Number(t.id)));
    const newTalents = (player.talents ?? []).filter(t => !oldTalents.has(Number(t.id)));
    const oldFates = new Map((before.selectedFateStrategies ?? []).map(f => [Number(f.id),f]));
    const currentFates = after.selectedFateStrategies ?? [];
    if (deferredSequence !== step.sequence) deferred = [];
    deferredSequence = step.sequence;
    const beforePhase = parseInt(priorPlayer.phase) || 0;
    const afterPhase = parseInt(player.phase) || 0;
    const candidates = newTalents.map(t => source('talent',t.id,talentInfo(t.id)));
    for (const f of currentFates) {
      const old = oldFates.get(Number(f.id));
      const used = old?.runtime && f.runtime && old.runtime.kind === f.runtime.kind
        && (f.runtime.kind === 'charges' ? Number(f.runtime.value) < Number(old.runtime.value)
          : f.runtime.kind === 'cooldown' && Number(f.runtime.value) > Number(old.runtime.value));
      const info = fateInfo(f.id);
      if (!old || used) candidates.push(source('fate',f.id,info));
      // Fate Path effects explicitly grant a card when the named talent is
      // selected. The underlying talent can have no draw/gain text of its own.
      const zh = (info?.descriptionChinese ?? '').replace(/<[^>]*>/g,'');
      if (old && newTalents.some(t => {
        const name = talentInfo(t.id)?.nameChinese;
        return name && zh.includes('选择' + name) && /时/.test(zh);
      })) candidates.push(source('fate',f.id,info));
    }
    if (afterPhase > beforePhase) {
      const phaseWords = ['', '炼气', '筑基', '金丹', '元婴', '化神'];
      for (const t of priorPlayer.talents ?? []) {
        const info = talentInfo(t.id), zh = info?.descriptionChinese ?? '';
        if (/每次突破|突破境界后/.test(zh)
          || (phaseWords[afterPhase] && new RegExp('(?:到达|突破至)' + phaseWords[afterPhase]).test(zh))) {
          const clauses = zh.replace(/\\n/g,'\n').split(/[。；;\n]/)
            .filter(clause => /每次突破|突破境界后/.test(clause)
              || (phaseWords[afterPhase] && new RegExp('(?:到达|突破至)' + phaseWords[afterPhase]).test(clause)));
          candidates.push(source('talent',t.id,{...info,descriptionChinese:clauses.join('；')}));
        }
      }
    }
    const valid = [...new Map([...deferred,...candidates.filter(s => s.verb)]
      .map(s => [s.family+':'+s.id,s])).values()];
    const isCardChoice = overlay => ['card-selection','daoist-rhyme'].includes(overlay?.kind);
    if (isCardChoice(after.choiceOverlay) && valid.length) pending = valid;
    const completedCardChoice = (after.cardSelections?.length ?? 0) > (before.cardSelections?.length ?? 0)
      || (after.daoYunChoices?.length ?? 0) > (before.daoYunChoices?.length ?? 0);
    const rawSources = valid.length ? valid : completedCardChoice ? pending : [];
    // A round-start snapshot can also open a used ability's card choice.
    // Remember that source while leaving ordinary round draws in their own step.
    const operation = roundStart || ['MoveCardReq','InsertCardReq','ReplaceCardResp','RefineCardResp','CardOperationResp'].includes(step.type);
    const cards = operation ? [] : addedCards(before,after,baseCardId);
    // A breakthrough can transform an existing personal card while separately
    // drawing cards. Native transformation clauses identify that replacement;
    // it is neither one of the draws nor a gained card, in either zone.
    const oldCards = positiveCards(before);
    for (const candidate of candidates) {
      for (const match of candidate.descriptionChinese.matchAll(/【(\d+)】(?:变为|变成|转变为)【(\d+)】/g)) {
        const from = Number(match[1]), to = Number(match[2]);
        const count = oldCards.filter(id => baseCardId(id) === baseCardId(from)).length;
        for (let n = 0; n < count; n++) {
          const i = cards.findIndex(id => baseCardId(id) === baseCardId(to));
          if (i < 0) break;
          cards.splice(i, 1);
        }
      }
    }
    const sources = rawSources.filter(s => {
      const refs = [...s.descriptionChinese.matchAll(/【(\d+)】/g)].map(m=>Number(m[1]));
      // A fixed-card gain may still be pending behind a follow-up choice, or
      // have been delivered by an earlier choice in the same packet.
      return s.verb !== 'gain' || !refs.length || cards.some(id=>refs.some(ref=>baseCardId(ref)===baseCardId(id)));
    });
    const groups = [];
    let remaining = [...cards];
    const rhymeSource = (verb, clause) => ({family:'daoYun',id:0,
      nameEnglish:'Daoist Rhyme Omen',nameChinese:'道韵预感',descriptionChinese:clause,verb});
    const rhymeGain = daoYunDescription.split(/。/).find(s=>s.includes('获得选择的牌')) ?? '';
    const rhymeDraw = daoYunDescription.split(/。/).find(s=>/立刻抽/.test(s)) ?? '';
    // Reserved Daoist Rhyme rewards are gains, separate from simultaneous talent draws.
    for (const [choiceIndex, choice] of (after.daoYunChoices ?? []).entries()) {
      const selected = Number(choice.selected), phase = Number(cardPhase(selected));
      const newlyChosen = choiceIndex >= (before.daoYunChoices?.length ?? 0);
      const delivered = choiceIndex === (after.daoYunChoices.length - 1) && selected > 0 && selected !== 27
        && (newlyChosen || (phase > beforePhase && phase <= afterPhase));
      // Aura may deliver a newly chosen card immediately below its phase.
      // Attribute it only when that exact card actually enters the hand.
      if (delivered && rhymeGain) {
        const received = [];
        for (let n=0;n<Math.max(1,Number(choice.multiplier)||1);n++) {
          const i=remaining.findIndex(id=>baseCardId(id)===baseCardId(selected));
          if(i<0) break; received.push(...remaining.splice(i,1));
        }
        if(received.length) groups.push({verb:'gain',cards:received,sources:[rhymeSource('gain',rhymeGain)]});
      }
      if (newlyChosen && selected===27 && rhymeDraw) sources.push(rhymeSource('draw',rhymeDraw));
    }
    // Resolve mixed gain/draw effects using the explicit card references first.
    if (new Set(sources.map(s=>s.verb)).size > 1) {
      for (const s of sources.filter(s=>s.verb==='gain')) {
        const ids=[...s.descriptionChinese.matchAll(/【(\d+)】/g)].map(m=>Number(m[1]));
        const received=remaining.filter(id=>ids.some(ref=>baseCardId(ref)===baseCardId(id)));
        if(received.length){
          groups.push({verb:'gain',cards:received,sources:[s]});
          for(const id of received)remaining.splice(remaining.indexOf(id),1);
        }
      }
    }
    const remainingSources = sources.filter(s=>!groups.some(g=>g.sources.includes(s)));
    if (remaining.length && remainingSources.length) {
      const verbs=new Set(remainingSources.map(s=>s.verb));
      if(verbs.size===1) groups.push({verb:remainingSources[0].verb,cards:remaining,sources:remainingSources});
      else stats.ambiguous.push({sequence:step.sequence,sources:remainingSources.map(s=>({family:s.family,id:s.id,verb:s.verb})),cards:remaining});
    } else if (remaining.length && (candidates.length || completedCardChoice)) {
      stats.unattributed.push({sequence:step.sequence,cards:remaining,
        sources:candidates.map(s=>({family:s.family,id:s.id,descriptionChinese:s.descriptionChinese})),completedCardChoice});
    }
    // Use the actual ordered hand additions, not a presumed effect priority.
    // Old duplicate copies are matched first, leaving the new copies' positions.
    const oldCounts = new Map();
    for(const id of positiveCards(before)) oldCounts.set(id,(oldCounts.get(id)??0)+1);
    // Existing deck copies remain in the deck; they must not consume a newly
    // acquired identical copy while matching the observed hand.
    for(const id of after.deck ?? []) {
      if((oldCounts.get(Number(id))??0)>0) oldCounts.set(Number(id),oldCounts.get(Number(id))-1);
    }
    const positions=[];
    for(const [index,id] of (after.hand??[]).entries()) {
      if((oldCounts.get(Number(id))??0)>0) oldCounts.set(Number(id),oldCounts.get(Number(id))-1);
      else positions.push({index,id:Number(id)});
    }
    const available=[...positions];
    for(const group of groups) {
      group.positions=[];
      for(const id of group.cards) {
        const i=available.findIndex(p=>p.id===id);
        if(i>=0) group.positions.push(available.splice(i,1)[0].index);
      }
    }
    groups.sort((a,b)=>(a.positions[0]??Infinity)-(b.positions[0]??Infinity));
    const canSplit=groups.every(g=>g.positions.length===g.cards.length);
    if (!canSplit) throw new Error(`Acquired cards lack observed hand positions at sequence ${step.sequence}`);
    const pendingPositions=new Set(groups.flatMap(g=>g.positions));
    if(groups.length && canSplit) {
      step.state=clone(observedState);
      step.state.privatePlayer.hand=after.hand.filter((_,i)=>!pendingPositions.has(i));
    }
    const followupOffer = groups.length && observedState.privatePlayer.choiceOverlay?.selected == null
      ? observedState.privatePlayer.choiceOverlay : null;
    if (followupOffer) {
      if (step.state === observedState) step.state=clone(observedState);
      delete step.state.privatePlayer.choiceOverlay;
    }
    for (const group of groups) {
      const {verb,cards,sources}=group;
      const names = language => sources.map(s=>s[language === 'zh' ? 'nameChinese':'nameEnglish']).join(language === 'zh' ? '、':' + ');
      const english = `${verb === 'draw' ? 'Drew' : 'Gained'} ${cards.map(id=>cardName(id,'en')).join(', ')} from ${names('en')}`;
      const chinese = `通过${names('zh')}${verb === 'draw' ? '抽取':'获得'}${cards.map(id=>cardName(id,'zh')).join('、')}`;
      const state = clone(observedState);
      for(const index of group.positions) pendingPositions.delete(index);
      if(canSplit) state.privatePlayer.hand=after.hand.filter((_,i)=>!pendingPositions.has(i));
      delete state.privatePlayer.choiceOverlay;
      result.push({sequence:step.sequence,observedAt:step.observedAt,direction:'synthetic',type:'CardAcquisition',
        description:english,details:{verb,cards,sources},humanActions:[{
          actorUid:after.uid,actorUsername:player.username,kind:verb === 'draw' ? 'draw':'gain',
          text:english,textEnglish:english,textChinese:chinese,
          cards,sources:sources.map(({family,id,nameEnglish,nameChinese})=>({family,id,nameEnglish,nameChinese})),
        }],state});
      stats[verb]++; stats.cards += cards.length;
    }
    if(followupOffer) result.push({sequence:step.sequence,observedAt:step.observedAt,
      direction:'synthetic',type:'ChoiceOffer',description:followupOffer.title ?? 'Choose',
      details:{kind:followupOffer.kind},humanActions:[],state:clone(observedState)});
    deferred = cards.length ? [] : valid;
    if (completedCardChoice || (!isCardChoice(after.choiceOverlay) && !isCardChoice(before.choiceOverlay))) pending = [];
    previous = observedState;
  }
  steps.splice(0,steps.length,...result);
  return stats;
}
