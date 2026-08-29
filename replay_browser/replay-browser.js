(async () => {
  const $ = (selector) => document.querySelector(selector);
  document.body.classList.add("recording-browser-page");
  const preferredTargetUid = "65db92284574f980c154b895"; // 愿与林小月长相守
  const assetMode = document.body.dataset.assetMode || "wiki";
  const recordingBase = document.body.dataset.recordingBase || "data";
  const recordingVersion = document.body.dataset.recordingVersion || "";
  const versionedUrl = (filename) => `${recordingBase}/${filename}${recordingVersion
    ? `?v=${encodeURIComponent(recordingVersion)}` : ""}`;
  async function loadCompressedJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let text;
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream !== "function") throw new Error("this browser cannot decompress recordings");
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      text = await new Response(stream).text();
    } else {
      text = new TextDecoder().decode(bytes);
    }
    return JSON.parse(text);
  }
  if (!window.RECORDING_CODEC) throw new Error("recording codec did not load");
  const decodedCatalog = window.RECORDING_CODEC.unpackCatalog(
    await loadCompressedJson(versionedUrl("catalog.compact.json.gz")),
  );
  const sharedCatalog = decodedCatalog.sharedCatalog;
  const catalog = [...decodedCatalog.catalog].sort((first, second) =>
    String(first.targetUid ?? "").localeCompare(String(second.targetUid ?? ""))
      || String(second.capturedThrough ?? "").localeCompare(String(first.capturedThrough ?? "")));
  const select = $("#recording-select");
  const timeline = $("#timeline");
  const previous = $("#previous");
  const next = $("#next");
  const roundSelect = $("#round-select");
  const filterToggle = $("#recording-filter-toggle");
  const filterPopover = $("#recording-filter-popover");
  const mobileViewport = matchMedia("(max-width: 760px)");
  const mobileTooltipLayer = document.createElement("div");
  mobileTooltipLayer.className = "mobile-tooltip-layer";
  mobileTooltipLayer.hidden = true;
  mobileTooltipLayer.innerHTML = `<section class="mobile-tooltip-card" role="dialog">
    <button class="mobile-tooltip-close" type="button" aria-label="Close">×</button>
    <div class="mobile-tooltip-content"></div>
  </section>`;
  document.body.append(mobileTooltipLayer);

  function closeMobileTooltip() {
    mobileTooltipLayer.hidden = true;
    mobileTooltipLayer.querySelector(".mobile-tooltip-content").replaceChildren();
  }

  function openMobileTooltip(trigger) {
    if (!mobileViewport.matches) return;
    const popover = trigger.querySelector(".trait-popover");
    if (!popover) return;
    mobileTooltipLayer.querySelector(".mobile-tooltip-content").innerHTML = popover.innerHTML;
    mobileTooltipLayer.hidden = false;
  }
  const isChinese = document.documentElement.lang.toLowerCase().startsWith("zh");
  const language = isChinese ? "zh" : "en";
  const copy = isChinese ? {
    unknownPhase: "未知境界", noSideJob: "无副职业", emptySlot: "空卡位", unknownCard: "未知卡牌",
    inspect: "查看上一轮公开状态", upcomingOpponent: "下一位对手", immortalFates: "仙命",
    heavenlyDerivation: "天衍仙命", noneVisible: "暂无可见信息", cultivation: "修为", destiny: "命元", physique: "体魄", maxHp: "生命上限",
    exchangeChance: "换牌机会", currentView: "当前私密视角", previousView: "上一轮公开状态",
    deck: "卡组", previousDeck: "上一轮卡组", hand: "手牌", slots: "格", noDeck: "未记录到可见卡组。",
    hiddenHand: "查看其他玩家时无法看到其手牌。", round: "第", roundSuffix: "轮",
    rerollsRemaining: "次刷新剩余", selectHdf: "选择天衍仙命",
    selectTalent: "选择仙命", selectDaoYun: "选择卡牌", noActions: "尚无玩家操作。",
    jumpRound: "跳转到轮次…", loading: "正在载入…", couldNotLoad: "无法载入", noRecordings: "没有完整录像。",
    rating: "分", rounds: "轮", currentPrivate: "当前私密视角",
    actionKinds: { move: "移动", rearrange: "调整", upgrade: "合成", exchange: "换牌", absorb: "吸收", destiny: "命元", leave: "离场", emote: "表情", breakthrough: "突破", immortalFate: "仙命", heavenlyFate: "天衍仙命", heavenlyFateUse: "使用天衍仙命", reroll: "刷新" },
    battle: "战斗", battleResult: "战斗结果", win: "胜", loss: "负", draw: "平", firstAction: "先手", opponentLastRound: "对手上一轮",
    previousOffer: "此前选项", rerolled: "刷新", rerolledAway: "已刷走", unrecordedReroll: "未捕获的刷新", finalOffer: "最终选项", offer: "选项", daoYunChoices: "道韵预感", cardSelections: "卡牌选择", chosen: "已选择", innerDemon: "心魔", andOtherCards: (count) => `另有 ${count} 张牌`,
    filters: "筛选", heavenlyFateFilter: "已选择的天衍仙命", unchosenHeavenlyFateFilter: "出现但未选择的天衍仙命", sideJobFilter: "副职业", opponentFilter: "人类对手角色", anySideJob: "任意副职业", clearFilters: "清除", noMatchingRecordings: "没有符合条件的录像",
  } : {
    unknownPhase: "Unknown phase", noSideJob: "No Side Job", emptySlot: "Empty deck slot", unknownCard: "Unknown card",
    inspect: "Inspect previous-round public state", upcomingOpponent: "Upcoming opponent", immortalFates: "Immortal Fates",
    heavenlyDerivation: "Heavenly Derivation", noneVisible: "None visible", cultivation: "Cultivation", destiny: "Destiny", physique: "Physique", maxHp: "Max HP",
    exchangeChance: "Exchange Chance", currentView: "Current private view", previousView: "previous-round public state",
    deck: "Deck", previousDeck: "Previous-round deck", hand: "Hand", slots: "slots", noDeck: "No deck was visible.",
    hiddenHand: "Private hand is not visible when browsing another player.", round: "Round ", roundSuffix: "",
    rerollsRemaining: "rerolls remaining", selectHdf: "Select a Heavenly Derivation Fate",
    selectTalent: "Select an Immortal Fate", selectDaoYun: "Select a Card", noActions: "No player action has occurred yet.",
    jumpRound: "Jump to round…", loading: "Loading…", couldNotLoad: "Could not load", noRecordings: "No complete recordings are available.",
    rating: "rating", rounds: "rounds", currentPrivate: "Current private view",
    actionKinds: { move: "move", rearrange: "rearrange", upgrade: "upgrade", exchange: "exchange", absorb: "absorb", destiny: "destiny", leave: "left", emote: "emote", breakthrough: "breakthrough", immortalFate: "Immortal Fate", heavenlyFate: "Heavenly Derivation", heavenlyFateUse: "used Heavenly Derivation", reroll: "reroll" },
    battle: "battle", battleResult: "Battle result", win: "Win", loss: "Loss", draw: "Draw", firstAction: "Acts first", opponentLastRound: "Opponent · last round",
    previousOffer: "Previous offer", rerolled: "Rerolled", rerolledAway: "Rerolled away", unrecordedReroll: "Reroll not captured", finalOffer: "Final offer", offer: "Offer", daoYunChoices: "Daoist Rhyme Omens", cardSelections: "Card selections", chosen: "Chosen", innerDemon: "Inner Demon", andOtherCards: (count) => `and ${count} other cards`,
    filters: "Filters", heavenlyFateFilter: "Chosen Heavenly Derivation Fates", unchosenHeavenlyFateFilter: "Offered but not chosen", sideJobFilter: "Side Job", opponentFilter: "Human opponent characters", anySideJob: "Any Side Job", clearFilters: "Clear", noMatchingRecordings: "No matching recordings",
  };
  const vocabulary = {
    phases: {
      1: ["Meditation", "炼气"], 2: ["Foundation", "筑基"], 3: ["Virtuoso", "金丹"],
      4: ["Immortality", "元婴"], 5: ["Incarnation", "化神"], 6: ["Void Return", "返虚"],
    },
    sects: {
      1: ["Cloud Spirit Sword Sect", "云灵剑宗"], 2: ["Heptastar Pavilion", "七星阁"],
      3: ["Five Elements Alliance", "五行道盟"], 4: ["Duan Xuan Sect", "锻玄宗"],
    },
    careers: {
      0: ["No Side Job", "无副职业"], 1: ["Elixirist", "炼丹师"], 2: ["Fuluist", "符咒师"],
      3: ["Musician", "琴师"], 4: ["Painter", "画师"], 5: ["Formation Master", "阵法师"],
      6: ["Plant Master", "灵植师"], 7: ["Fortune Teller", "命理师"],
    },
  };
  const baseMaxHpByPhase = { 1: 40, 2: 45, 3: 52, 4: 62, 5: 75, 6: 100 };
  const battleBuffMetadata = {
    17: ["Will of Desperate Combat", "死战之志", "After HP drops to 0 or below for the first time, cannot be defeated until the end of this turn.", "首次生命降至0或以下后，本回合结束前不会战败。"],
    10008: ["Origin Herb", "归元草", "At battle start, gain HP and Max HP.", "战斗开始时增加生命及生命上限。"],
    10009: ["Shuttle Orchid", "金梭兰", "At battle start, deal damage.", "战斗开始时造成伤害。"],
    10010: ["Healing Chamomile", "愈甘菊", "At battle start, gain Regeneration.", "战斗开始时获得恢复。"],
    10011: ["Divine Power Grass", "神力草", "At battle start, gain Increase ATK.", "战斗开始时获得加攻。"],
    10012: ["Flying Owl Reishi", "飞枭灵芝", "At battle start, gain Speed.", "战斗开始时增加速度。"],
    10013: ["Toxic Purple Fern", "穿肠紫蕨", "At battle start, apply Internal Injury to the opponent.", "战斗开始时向对方施加内伤。"],
    10014: ["Rock Herb", "归岩草", "At battle start, gain DEF.", "战斗开始时增加防。"],
    10017: ["Fire Orchid", "火梭兰", "At battle start, reduce the opponent's Max HP.", "战斗开始时减少对方生命上限。"],
    10018: ["Lose Power Grass", "失力草", "At battle start, apply Decrease ATK to the opponent.", "战斗开始时向对方施加减攻。"],
    10019: ["Clear Chamomile", "清甘菊", "At battle start, gain Hexproof.", "战斗开始时获得辟邪。"],
    10020: ["Shadow Owl Reishi", "影枭灵芝", "At battle start, lose HP, then Chase after the first card played.", "战斗开始时自身失去生命，首次使用牌后再次行动。"],
    10037: ["Saved Hexagram", "保存的卦象", "Gain the displayed number of saved Hexagram stacks at battle start.", "战斗开始时获得所示层数的已保存卦象。"],
    10045: ["Ambush", "偷袭", "The displayed number is how many Ambush charges were used for this battle; each charge grants 6 Speed.", "所示数字为本场战斗使用的偷袭次数；每次使速度增加6。"],
    10047: ["Protective Artifact", "护身法宝", "Begin this battle with the displayed number of Guard Up stacks.", "本场战斗开始时获得所示层数的护体。"],
  };
  let recording = null;
  let states = [];
  let index = 0;
  let selectedUid = "";
  let selectionFollowsPrivate = true;
  let activeCatalogItem = null;
  let loadGeneration = 0;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const cardAsset = (id) => {
    return assetMode === "local" ? `card-images/${id}_${language}.png` : `/yxp_wiki/assets/cards/${id}_${language}.webp`;
  };
  const specialCardArt = (id) => assetMode === "local"
    ? `special-card-art/${id}.png`
    : `/yxp_wiki/assets/recordings/special-cards/${id}.webp`;
  const characterAsset = (player, kind, defaultOnly = false) => {
    const skinNumber = Number(player?.skinNumber) || 0;
    const suffix = !defaultOnly && skinNumber > 0
      ? kind === "avatar" ? `avatar-${skinNumber}` : `skin-${skinNumber}`
      : kind;
    return assetMode === "local"
      ? `character-images/${player?.characterId}-${suffix}.png`
      : `/yxp_wiki/assets/characters/${player?.characterId}-${suffix}.webp`;
  };
  const fateAsset = (entry, kind) => {
    const iconFile = kind === "talent"
      ? `Icon_Talent_${entry.iconId || entry.id}.png`
      : entry.iconFile || `Icon_FateStrategy_${entry.id}.png`;
    if (assetMode === "local") return `fate-icons/${iconFile}`;
    return `/yxp_wiki/assets/fates/${iconFile.replace(/\.png$/i, ".webp")}`;
  };
  const buffAsset = (id) => {
    if (Number(id) === 10045) {
      return assetMode === "local"
        ? "fate-icons/Icon_FateStrategy_20.png"
        : "/yxp_wiki/assets/fates/Icon_FateStrategy_20.webp";
    }
    const iconId = Number(id) === 10047 ? 5 : Number(id);
    return assetMode === "local"
      ? `buff-icons/Icon_Buff_${iconId}.png`
      : `/yxp_wiki/assets/recordings/buffs/Icon_Buff_${iconId}.webp`;
  };
  const emojiAsset = (id) => assetMode === "local"
    ? `emoji-images/${id}.png`
    : `/yxp_wiki/assets/recordings/emojis/${id}.webp`;
  const fateArtwork = (entry = {}, kind, alt = "") => {
    if (kind === "fateStrategy" && entry.compositeCardIds?.length === 2) {
      return `<span class="fate-composite" role="img" aria-label="${esc(alt)}">
        <span class="fate-composite-card first"><img data-asset-fallback src="${cardAsset(entry.compositeCardIds[0])}" alt=""></span>
        <span class="fate-composite-card second"><img data-asset-fallback src="${cardAsset(entry.compositeCardIds[1])}" alt=""></span>
        <span class="fate-composite-ink" aria-hidden="true"></span>
      </span>`;
    }
    if (kind === "fateStrategy" && /^Card_\d+\.(?:png|webp)$/.test(entry.iconFile ?? "")) {
      return `<span class="fate-card-crop" role="img" aria-label="${esc(alt)}"><img data-asset-fallback src="${fateAsset(entry, kind)}" alt=""></span>`;
    }
    return `<img data-asset-fallback src="${fateAsset(entry, kind)}" alt="${esc(alt)}">`;
  };
  const numericPrefix = (value) => Number.parseInt(String(value ?? "0"), 10) || 0;
  const localizedPair = (pair, fallback = "") => pair ? pair[isChinese ? 1 : 0] : fallback;
  const localizedInfo = (info, field = "name") => {
    const value = info?.[`${field}${isChinese ? "Chinese" : "English"}`]
      || info?.[`${field}${isChinese ? "English" : "Chinese"}`] || "";
    return typeof value === "string" ? value.replace(/\\n/g, "\n") : value;
  };
  const phaseName = (value) => localizedPair(vocabulary.phases[numericPrefix(value)], String(value ?? copy.unknownPhase));
  const priorMaxHp = (prior) => Number(baseMaxHpByPhase[numericPrefix(prior?.phase)] ?? 0) + Number(prior?.extraMaxHp ?? 0);
  const sectName = (value) => localizedPair(vocabulary.sects[numericPrefix(value)], String(value ?? ""));
  const careerName = (value) => localizedPair(vocabulary.careers[numericPrefix(value)], String(value ?? copy.noSideJob));
  const characterName = (player) => {
    const info = recording.catalog.characters[player?.characterId];
    if (!info) return player?.character || "Unknown character";
    return localizedInfo(info);
  };

  function mergePatch(target, patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(patch);
    const result = target && typeof target === "object" && !Array.isArray(target) ? structuredClone(target) : {};
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === "object" && value.$deleted === true) delete result[key];
      else result[key] = mergePatch(result[key], value);
    }
    return result;
  }

  function hydrateStates(data) {
    const result = [];
    let state = {};
    for (const step of data.steps) {
      state = mergePatch(state, step.patch);
      result.push(state);
    }
    return result;
  }

  function card(id, zeroAsNormalAttack = false) {
    if (!id && !zeroAsNormalAttack) return `<div class="empty-slot" title="${esc(copy.emptySlot)}"></div>`;
    const cardId = id || 0;
    const info = recording.catalog.cards[cardId] ?? (cardId === 0
      ? { id: 0, nameEnglish: "Normal Attack", nameChinese: "普通攻击", upgrade: 1 }
      : { id: cardId, nameEnglish: `Card ${cardId}`, nameChinese: `卡牌 ${cardId}`, upgrade: 1 });
    const name = localizedInfo(info) || copy.unknownCard;
    const level = isChinese ? `${info.upgrade ?? 1}级` : `Lv.${info.upgrade ?? 1}`;
    if (info.placeholder) return `<div class="game-card placeholder-card" title="${esc(name)}"><span class="card-fallback"><strong>${esc(name)}</strong></span><img data-asset-fallback src="${cardAsset(399)}" alt="${esc(name)}"></div>`;
    if (Number(cardId) === -1) return `<div class="game-card special-card" title="${esc(name)} ${esc(level)}"><img data-asset-fallback class="card-special-art" src="${specialCardArt(cardId)}" alt=""><span class="special-card-name"><strong>${esc(name)}</strong><small>${esc(level)}</small></span></div>`;
    return `<div class="game-card" title="${esc(name)} ${esc(level)}">
      <span class="card-fallback"><strong>${esc(name)}</strong><small>${esc(level)}</small></span>
      <img data-asset-fallback src="${cardAsset(cardId)}" alt="${esc(name)}">
    </div>`;
  }

  function offerHistory(history, kind, { showFinalLabel = true } = {}) {
    if (!history?.offers?.length) return "";
    const final = history.offers.at(-1);
    const rows = kind === "fateStrategy"
      ? (() => {
        const inferredRolledAway = history.offers.slice(0, -1).flatMap((offer, offerIndex) => {
          const remaining = [...history.offers[offerIndex + 1]];
          return offer.filter((id) => {
            const retainedIndex = remaining.indexOf(id);
            if (retainedIndex < 0) return true;
            remaining.splice(retainedIndex, 1);
            return false;
          });
        });
        const knownRolledAway = history.rolledAway?.length ? history.rolledAway : inferredRolledAway;
        const knownRows = history.rerolls?.length
          ? history.rerolls.map(({ from, to }) => {
            const possibleFrom = Array.isArray(from) ? from : [from];
            return {
              offer: [...possibleFrom, to], inputCount: possibleFrom.length,
              label: copy.rerolled, previous: true, transition: true,
            };
          })
          : knownRolledAway.map((id) => ({ offer: [id], label: copy.rerolledAway, previous: true }));
        const missingCount = Math.max(0, Number(history.rerollsUsed ?? knownRows.length) - knownRows.length);
        return knownRows
          .concat(Array.from({ length: missingCount }, () => ({
            offer: [], label: copy.unrecordedReroll, previous: true, unknown: true,
          })))
          .concat([{ offer: final, label: showFinalLabel ? copy.finalOffer : "", previous: false }]);
      })()
      : kind === "card"
        ? [{ offer: final, label: "", previous: false }]
        : history.offers.map((offer, offerIndex) => ({
          offer: offerIndex === history.offers.length - 1 ? offer : offer.slice(1),
          label: offerIndex === history.offers.length - 1
            ? showFinalLabel ? copy.finalOffer : ""
            : copy.previousOffer,
          previous: offerIndex !== history.offers.length - 1,
        }));
    return `<div class="offer-history">${rows.map((row) => {
      let displayedOffer = row.offer;
      let omittedCardCount = 0;
      if (kind === "card" && row.offer.length > 6) {
        const selectedId = Number(history.selected);
        displayedOffer = row.offer.slice(0, 4);
        if (selectedId > 0 && !displayedOffer.some((id) => Number(id) === selectedId)) {
          displayedOffer[displayedOffer.length - 1] = row.offer.find((id) => Number(id) === selectedId) ?? displayedOffer.at(-1);
        }
        omittedCardCount = row.offer.length - displayedOffer.length;
      }
      const icons = displayedOffer.map((id) => {
        if (!Number(id)) return '<span class="offer-icon unknown" aria-label="?">?</span>';
        const info = kind === "card" ? recording.catalog.cards[id]
          : kind === "talent" ? recording.catalog.talents[id]
            : recording.catalog.fateStrategies[id];
        const selected = !row.previous && Number(id) === Number(history.selected);
        const name = localizedInfo(info) || id;
        const artwork = kind === "card"
          ? `<img data-asset-fallback src="${cardAsset(id)}" alt="${esc(name)}">`
          : fateArtwork(info ?? { id }, kind, name);
        return `<span class="offer-icon${kind === "card" ? " card-art" : ""}${selected ? " selected" : ""}" title="${esc(name)}">${artwork}</span>`;
      });
      if (omittedCardCount > 0) icons.push(`<span class="offer-icon offer-more" title="${esc(copy.andOtherCards(omittedCardCount))}">${esc(copy.andOtherCards(omittedCardCount))}</span>`);
      const contents = row.transition && !row.unknown
          ? `<span class="reroll-inputs">${icons.slice(0, row.inputCount).join("")}</span><span class="reroll-arrow" aria-hidden="true">→</span>${icons.at(-1)}`
          : row.unknown ? '<span class="offer-icon unknown" aria-label="?">?</span>' : icons.join("");
        return `<div class="offer-row${row.previous ? " previous" : " final"}">${row.label ? `<small>${esc(row.label)}</small>` : ""}<div>${contents}</div></div>`;
    }).join("")}</div>`;
  }

  function trait(reference, kind, { hasMyFateMyChoice = false } = {}) {
    const info = kind === "talent" ? recording.catalog.talents[reference.id] : recording.catalog.fateStrategies[reference.id];
    if (!info) return "";
    const runtime = reference.runtime;
    const badgeText = runtime?.kind === "cooldown"
      ? isChinese ? `冷却${runtime.value}轮` : `CD ${runtime.value}`
      : runtime?.value;
    const badge = runtime
      ? `<span class="trait-count${runtime.kind === "cooldown" ? " cooldown" : ""}">${esc(badgeText)}</span>`
      : "";
    const name = localizedInfo(info);
    const localizedDescription = localizedInfo(info, "description");
    const history = reference.choiceHistory;
    const hasHeavenlyDerivationVariables = Number(history?.rerollsRemainingAtStart ?? 0) > 0
      || Number(history?.rerollsUsed ?? 0) > 0
      || Number(history?.rerollsRemaining ?? 0) > 0;
    const showFinalLabel = kind === "talent" ? hasMyFateMyChoice : hasHeavenlyDerivationVariables;
    return `<div class="trait-icon ${kind === "talent" ? "talent" : "heavenly-fate"}${reference.locked ? " locked" : ""}" tabindex="0">${fateArtwork(info, kind, name)}${badge}<div class="trait-popover"><strong>${esc(name)}</strong>${localizedDescription ? `<p>${esc(localizedDescription)}</p>` : ""}${offerHistory(history, kind, { showFinalLabel })}</div></div>`;
  }

  function battleBuff(reference) {
    const metadata = battleBuffMetadata[Number(reference.id)] ?? [String(reference.id), String(reference.id), "", ""];
    const name = metadata[isChinese ? 1 : 0];
    const description = metadata[isChinese ? 3 : 2];
    return `<div class="battle-buff" tabindex="0"><img data-asset-fallback src="${buffAsset(reference.id)}" alt="${esc(name)}"><span class="battle-buff-count">${esc(reference.value)}</span><div class="trait-popover"><strong>${esc(name)}</strong>${description ? `<p>${esc(description)}</p>` : ""}</div></div>`;
  }

  function daoYunChoice(choice) {
    const info = recording.catalog.cards[choice.selected] ?? {};
    const name = localizedInfo(info) || choice.selected;
    const multiplier = Number(choice.multiplier) > 1
      ? `<span class="trait-count dao-multiplier">${esc(choice.multiplier)}x</span>` : "";
    return `<div class="dao-yun-choice" tabindex="0"><span class="dao-pentagon-wrap"><span class="dao-pentagon"><span class="dao-art"><img data-asset-fallback src="${cardAsset(choice.selected)}" alt="${esc(name)}"></span></span>${multiplier}<span class="trait-count dao-round-badge">${esc(choice.roundOrPhase)}</span></span><div class="trait-popover"><strong>${esc(name)}</strong><p>${esc(copy.chosen)} · ${copy.round}${esc(choice.roundOrPhase)}${copy.roundSuffix}</p>${offerHistory(choice, "card", { showFinalLabel: false })}</div></div>`;
  }

  function cardSelectionChoice(choice) {
    const info = recording.catalog.cards[choice.selected] ?? {};
    const name = localizedInfo(info) || choice.selected;
    return `<div class="card-selection-choice" tabindex="0"><span class="dao-round">${copy.round}${esc(choice.roundOrPhase)}${copy.roundSuffix}</span><span class="card-selection-art"><img data-asset-fallback src="${cardAsset(choice.selected)}" alt="${esc(name)}"></span><div class="trait-popover"><strong>${esc(name)}</strong><p>${esc(copy.chosen)} · ${copy.round}${esc(choice.roundOrPhase)}${copy.roundSuffix}</p>${offerHistory(choice, "card", { showFinalLabel: false })}</div></div>`;
  }

  function playerPortrait(player, state, privateOwnerUid, emojiId = null) {
    const own = state.players[privateOwnerUid];
    const upcoming = own?.nextOpponent === player.uid;
    return `<button class="player-portrait ${selectedUid === player.uid ? "selected" : ""} ${player.uid === privateOwnerUid ? "own" : ""} ${player.settled ? "settled" : ""}" data-uid="${esc(player.uid)}" data-rating="${esc(player.rating ?? 0)}" title="${esc(copy.inspect)}: ${esc(player.username)}">
      <span class="avatar-wrap"><img data-character-fallback data-default-src="${characterAsset(player, "avatar", true)}" class="avatar ${Number(player.skinNumber) > 0 ? "costume" : ""}" src="${characterAsset(player, "avatar")}" alt=""><span class="life-gem"><span>${esc(player.life)}</span></span>${upcoming ? `<span class="opponent-badge" title="${esc(copy.upcomingOpponent)}">⚔</span>` : ""}</span>
      <span class="name">${esc(player.username)}</span><span class="character-name">${esc(characterName(player))}</span>
      ${emojiId == null ? "" : `<span class="player-emote" aria-label="${esc(copy.actionKinds.emote)} ${esc(emojiId)}"><span>${esc(emojiId)}</span><img data-emote-art src="${emojiAsset(emojiId)}" alt=""></span>`}
    </button>`;
  }

  function renderCharacter(player, traits, state, priorRound, privateOwnerUid) {
    const privatePlayer = state.privatePlayer;
    const hasMyFateMyChoice = (traits.fates ?? []).some((reference) => Number(reference.id) === 12);
    const talents = (traits.talents ?? []).map((value) => trait(value, "talent", { hasMyFateMyChoice })).join("");
    const fates = (traits.fates ?? []).map((value) => trait(value, "fateStrategy")).join("");
    const daoYunChoices = player.uid === privateOwnerUid
      ? (privatePlayer?.daoYunChoices ?? []).map(daoYunChoice).join("")
      : "";
    const cardSelections = player.uid === privateOwnerUid
      ? (privatePlayer?.cardSelections ?? []).map(cardSelectionChoice).join("")
      : "";
    const displayedStats = priorRound ?? player;
    const physique = Number(displayedStats?.physique ?? 0);
    const showPhysique = numericPrefix(player.sect) === 4 || physique > 0;
    $("#character-panel").innerHTML = `<div class="trait-panel">
        <div class="trait-group"><span class="trait-heading">${esc(copy.immortalFates)}</span><div class="trait-row">${talents || `<span class="trait-empty">${esc(copy.noneVisible)}</span>`}</div></div>
        <div class="trait-group"><span class="trait-heading">${esc(copy.heavenlyDerivation)}</span><div class="trait-row">${fates || `<span class="trait-empty">${esc(copy.noneVisible)}</span>`}</div></div>
        ${player.uid === privateOwnerUid ? `<div class="trait-group dao-yun-group"><span class="trait-heading">${esc(copy.daoYunChoices)}</span><div class="trait-row dao-yun-row">${daoYunChoices || `<span class="trait-empty">${esc(copy.noneVisible)}</span>`}</div></div>` : ""}
        ${player.uid === privateOwnerUid && cardSelections ? `<div class="trait-group card-selection-group"><span class="trait-heading">${esc(copy.cardSelections)}</span><div class="trait-row card-selection-row">${cardSelections}</div></div>` : ""}
      </div>
      <img data-character-fallback data-default-src="${characterAsset(player, "portrait", true)}" class="character-art" src="${characterAsset(player, "portrait")}" alt="${esc(characterName(player))}">
      <div class="character-stats"><strong>${esc(player.username)}</strong><span>${esc(characterName(player))}</span><span>${esc(phaseName(displayedStats?.phase))}</span>${numericPrefix(player.career) ? `<span>${esc(careerName(player.career))}</span>` : ""}<span>${esc(displayedStats?.cultivation ?? 0)} ${esc(copy.cultivation)} · ${esc(player.life)} ${esc(copy.destiny)}</span><span>${showPhysique ? `${esc(physique)} / ${esc(displayedStats?.maxPhysique ?? 0)} ${esc(copy.physique)} · ` : ""}${esc(priorMaxHp(displayedStats))} ${esc(copy.maxHp)}</span></div>`;
  }

  function renderChoice(overlay) {
    const host = $("#selection-overlay");
    if (!overlay) { host.hidden = true; host.innerHTML = ""; return; }
    const showRerolls = overlay.kind === "heavenly-derivation" && Number(overlay.roundOrPhase) !== 3;
    const canReroll = showRerolls && overlay.rerollsRemaining > 0;
    const optionIds = overlay.options.map((reference) => Number(reference.id));
    const recordedCardSelection = overlay.kind === "card-selection" && overlay.selected == null
      ? states.slice(index + 1).flatMap((futureState) => futureState.privatePlayer?.cardSelections ?? [])
        .find((history) => Number(history.roundOrPhase) === Number(overlay.roundOrPhase)
          && (history.offers ?? []).some((offer) => JSON.stringify(offer.map(Number)) === JSON.stringify(optionIds)))
      : null;
    const recordedSelected = Number(overlay.selected ?? recordedCardSelection?.selected) || 0;
    const selectedOptionIndex = !recordedSelected
      ? -1
      : overlay.options.findIndex((reference) => Number(reference.id) === recordedSelected);
    let displayedOptions = overlay.options.map((reference, optionIndex) => ({ reference, optionIndex }));
    let omittedCardCount = 0;
    if (overlay.kind === "card-selection" && overlay.options.length > 6) {
      displayedOptions = displayedOptions.slice(0, 4);
      if (selectedOptionIndex >= 0 && !displayedOptions.some(({ optionIndex }) => optionIndex === selectedOptionIndex)) {
        displayedOptions.push({ reference: overlay.options[selectedOptionIndex], optionIndex: selectedOptionIndex });
      }
      if (displayedOptions.length < 5) {
        const fifth = overlay.options.map((reference, optionIndex) => ({ reference, optionIndex }))
          .find(({ optionIndex }) => !displayedOptions.some((entry) => entry.optionIndex === optionIndex));
        if (fifth) displayedOptions.push(fifth);
      }
      // Treat the selected card as a highlighted callout alongside the four
      // preview cards. The summary count continues to describe every other
      // choice beyond those four previews.
      omittedCardCount = overlay.options.length - (selectedOptionIndex >= 0 ? 4 : displayedOptions.length);
    }
    const options = displayedOptions.map(({ reference, optionIndex }) => {
      const selected = optionIndex === selectedOptionIndex;
      if (overlay.kind === "daoist-rhyme" || overlay.kind === "card-selection") {
        const info = recording.catalog.cards[reference.id] ?? {};
        return `<article class="selection-option card-choice${selected ? " selected" : ""}"><div class="selection-icon"><img data-asset-fallback src="${cardAsset(reference.id)}" alt=""></div><span class="chosen-mark${selected ? "" : " placeholder"}">${selected ? `✓ ${esc(copy.chosen)}` : "—"}</span><strong>${esc(localizedInfo(info) || reference.id)}</strong></article>`;
      }
      const kind = overlay.kind === "immortal-fate" ? "talent" : "fateStrategy";
      const info = kind === "talent" ? recording.catalog.talents[reference.id] : recording.catalog.fateStrategies[reference.id];
      const name = localizedInfo(info) || reference.id;
      return `<article class="selection-option${selected ? " selected" : ""}"><div class="selection-icon">${fateArtwork(info, kind, name)}</div>${canReroll ? `<span class="reroll-slot">↻ <small>${optionIndex + 1}</small></span>` : ""}<span class="chosen-mark${selected ? "" : " placeholder"}">${selected ? `✓ ${esc(copy.chosen)}` : "—"}</span><strong>${esc(name)}</strong><p>${esc(localizedInfo(info, "description"))}</p></article>`;
    }).concat(omittedCardCount > 0
      ? [`<article class="selection-option card-choice selection-more"><div class="selection-icon"><span>${esc(copy.andOtherCards(omittedCardCount))}</span></div><span class="chosen-mark placeholder">—</span><strong>${esc(copy.andOtherCards(omittedCardCount))}</strong></article>`]
      : []).join("");
    const title = overlay.kind === "heavenly-derivation"
      ? copy.selectHdf
      : overlay.kind === "immortal-fate"
        ? copy.selectTalent
        : copy.selectDaoYun;
    const roundOrPhase = overlay.kind === "heavenly-derivation" || overlay.kind === "daoist-rhyme" || overlay.kind === "card-selection"
      ? `${copy.round}${esc(overlay.roundOrPhase)}${copy.roundSuffix}`
      : `${esc(phaseName(overlay.roundOrPhase))}`;
    host.dataset.kind = overlay.kind;
    host.innerHTML = `<div class="selection-frame" style="--choice-count:${displayedOptions.length + (omittedCardCount > 0 ? 1 : 0)}">
      <div class="selection-heading"><span class="selection-context">${roundOrPhase}</span><h2>${esc(title)}</h2><span class="selection-heading-spacer" aria-hidden="true"></span></div>
      <div class="selection-options">${options}</div>
      ${showRerolls ? `<div class="selection-actions"><span class="reroll-bank">↻ ${esc(overlay.rerollsRemaining)} ${esc(copy.rerollsRemaining)}</span></div>` : ""}
    </div>`;
    host.hidden = false;
  }

  function choiceOverlayForStep(state) {
    if (state.privatePlayer?.choiceOverlay) return state.privatePlayer.choiceOverlay;
    const previousState = states[index - 1];
    const privateUid = state.privatePlayer?.uid;
    if (!privateUid || previousState?.privatePlayer?.uid !== privateUid) return null;
    const currentTalents = state.players?.[privateUid]?.talents ?? [];
    const previousTalentIds = new Set((previousState?.players?.[privateUid]?.talents ?? []).map((reference) => Number(reference.id)));
    const chosenTalent = currentTalents.find((reference) => reference.choiceHistory?.selected
      && !previousTalentIds.has(Number(reference.id)));
    if (chosenTalent) {
      const history = chosenTalent.choiceHistory;
      return {
        kind: "immortal-fate",
        roundOrPhase: history.roundOrPhase,
        selected: history.selected,
        options: (history.offers?.at(-1) ?? []).map((id) => ({ id })),
      };
    }
    const previousFateIds = new Set((previousState?.privatePlayer?.selectedFateStrategies ?? []).map((reference) => Number(reference.id)));
    const chosenFate = (state.privatePlayer?.selectedFateStrategies ?? []).find((reference) => reference.choiceHistory?.selected
      && !previousFateIds.has(Number(reference.id)));
    if (chosenFate) {
      const history = chosenFate.choiceHistory;
      return {
        kind: "heavenly-derivation",
        roundOrPhase: history.roundOrPhase,
        rerollsRemaining: Number(history.rerollsRemaining ?? 0),
        selected: history.selected,
        options: (history.offers?.at(-1) ?? []).map((id) => ({ id })),
      };
    }
    const choices = state.privatePlayer?.daoYunChoices ?? [];
    const previousChoices = previousState?.privatePlayer?.daoYunChoices ?? [];
    if (choices.length > previousChoices.length) {
      const choice = choices.at(-1);
      return {
        kind: "daoist-rhyme",
        roundOrPhase: choice.roundOrPhase,
        selected: choice.selected,
        options: (choice.offers?.at(-1) ?? []).map((id) => ({ id })),
      };
    }
    const cardSelections = state.privatePlayer?.cardSelections ?? [];
    const previousCardSelections = previousState?.privatePlayer?.cardSelections ?? [];
    if (cardSelections.length <= previousCardSelections.length) return null;
    const choice = cardSelections.at(-1);
    return {
      kind: "card-selection",
      roundOrPhase: choice.roundOrPhase,
      selected: choice.selected,
      options: (choice.offers?.at(-1) ?? []).map((id) => ({ id })),
    };
  }

  function recentActions() {
    return recording.steps.slice(0, index + 1)
      .flatMap((step, stepIndex) => (step.humanActions ?? []).map((action) => ({ ...action, current: stepIndex === index })))
      .slice(-5);
  }

  const actionText = (action) => action[isChinese ? "textChinese" : "textEnglish"] || action.text || "";
  const actionKindText = (action) => action.kind === "destiny" && Number(action.round) > 0
    ? isChinese ? `${copy.round}${action.round}${copy.roundSuffix}${copy.battle}` : `${copy.round}${action.round}${copy.roundSuffix} ${copy.battle}`
    : copy.actionKinds[action.kind] || action.kind;

  function renderActions() {
    const actions = recentActions();
    $("#action-list").innerHTML = actions.length
      ? actions.map((action) => `<li class="${action.current ? "current" : ""}"><span class="action-kind">${esc(actionKindText(action))}</span>${esc(actionText(action))}</li>`).join("")
      : `<li class="empty">${esc(copy.noActions)}</li>`;
  }

  function renderBattle(battle, playerUid) {
    const host = $("#battle-panel");
    const matchups = battle?.matchups ?? (battle?.players ? [{ players: battle.players }] : []);
    const matchup = matchups.find((entry) => entry.players?.[playerUid] && !entry.players[playerUid].innerDemon)
      ?? matchups.find((entry) => entry.players?.[playerUid]);
    const selectedBattlePlayer = matchup?.players?.[playerUid];
    const opponent = matchup?.players?.[selectedBattlePlayer?.opponentUid];
    const combatants = [selectedBattlePlayer, opponent].filter(Boolean);
    host.innerHTML = `<div class="battle-heading"><span>${copy.round}${esc(battle.round)}${copy.roundSuffix}</span><strong>${esc(copy.battleResult)}</strong></div>
      <div class="battle-combatants">${combatants.map((player) => {
        const talents = (player.talents ?? []).map((reference) => trait(reference, "talent")).join("");
        const fates = (player.fateStrategies ?? []).map((reference) => trait(reference, "fateStrategy")).join("");
        const buffs = (player.battleBuffs ?? []).map(battleBuff).join("");
        const delta = Number(player.lifeDelta ?? 0);
        const deltaText = delta ? `<span class="battle-destiny-delta ${delta > 0 ? "positive" : "negative"}">${delta > 0 ? "+" : ""}${esc(delta)}</span>` : "";
        const speed = Number(player.speed ?? 0);
        const physique = Number(player.physique ?? 0);
        const showPhysique = numericPrefix(player.sect) === 4 || physique > 0;
        return `<article class="battle-combatant ${esc(player.result)}">
          <div class="battle-player">
            <img data-character-fallback data-default-src="${characterAsset(player, "avatar", true)}" src="${characterAsset(player, "avatar")}" alt="">
            <div><strong>${esc(player.username)}${player.innerDemon ? isChinese ? `（${esc(copy.innerDemon)}）` : ` (${esc(copy.innerDemon)})` : ""}</strong><span>${esc(characterName(player))}</span><span>${esc(phaseName(player.phase))}${numericPrefix(player.career) ? ` · ${esc(careerName(player.career))}` : ""}</span></div>
            <b class="battle-result-stamp">${esc(copy[player.result] ?? copy.draw)}</b>
          </div>
          <div class="battle-values">
            <span><small>${esc(copy.destiny)}</small><strong>${esc(player.lifeBefore)}${deltaText}</strong></span>
            <span><small>${esc(copy.cultivation)}</small><strong>${esc(player.cultivation)}${speed > 0 ? `<em>(+${esc(speed)})</em>` : ""}</strong></span>
            ${showPhysique ? `<span><strong>${esc(physique)} / ${esc(player.maxPhysique ?? 0)} ${esc(copy.physique)}</strong></span>` : ""}
            ${player.first ? `<span class="battle-first">◆ ${esc(copy.firstAction)}</span>` : ""}
          </div>
          <div class="battle-effects">
            <div class="battle-effect-row battle-fates">${talents}</div>
            <div class="battle-effect-row battle-heavenly-fates">${fates}</div>
            <div class="battle-effect-row battle-temp-buffs">${buffs}</div>
          </div>
          <div class="battle-deck">${(player.deck ?? []).map((id) => card(id, true)).join("")}</div>
        </article>`;
      }).join("")}</div>`;
  }

  function renderOpponentPreview(opponent) {
    const host = $("#opponent-preview");
    const prior = opponent?.lastRound;
    if (!opponent || !prior) {
      host.hidden = true;
      host.innerHTML = "";
      return false;
    }
    const talents = (prior.talents ?? []).map((reference) => trait(reference, "talent")).join("");
    const fates = (prior.fateStrategies ?? []).map((reference) => trait(reference, "fateStrategy")).join("");
    const physique = Number(prior.physique ?? 0);
    const showPhysique = numericPrefix(opponent.sect) === 4 || physique > 0;
    host.innerHTML = `<div class="opponent-summary">
        <span class="opponent-kicker">${esc(copy.opponentLastRound)}</span>
        <strong title="${esc(opponent.username)}">${esc(opponent.username)}</strong>
        <div class="opponent-stats${showPhysique ? "" : " without-physique"}">
          <span><small>${esc(copy.cultivation)}</small><b>${esc(prior.cultivation ?? "—")}</b></span>
          ${showPhysique ? `<span><b>${esc(physique)} / ${esc(prior.maxPhysique ?? 0)} ${esc(copy.physique)}</b></span>` : ""}
          <span><small>${esc(copy.maxHp)}</small><b>${esc(priorMaxHp(prior) || "—")}</b></span>
        </div>
        <div class="opponent-effects"><div>${talents}</div><div>${fates}</div></div>
      </div>
      <div class="opponent-deck">${(prior.deck ?? []).map((id) => card(id, true)).join("") || `<span class="private-hand">${esc(copy.noDeck)}</span>`}</div>`;
    host.hidden = false;
    return true;
  }

  function render() {
    closeMobileTooltip();
    const state = states[index];
    if (!state) return;
    const battle = recording.steps[index]?.battle;
    const privatePlayer = state.privatePlayer;
    const privateOwnerUid = privatePlayer?.uid || recording.targetUid;
    const players = Object.values(state.players ?? {}).sort((first, second) =>
      (Number(first.rank) || 0) - (Number(second.rank) || 0));
    if (selectionFollowsPrivate || !selectedUid || !state.players[selectedUid]) {
      selectedUid = state.players[privateOwnerUid] ? privateOwnerUid : players[0]?.uid || "";
      selectionFollowsPrivate = true;
    }
    const selected = state.players[selectedUid] ?? players[0];
    const isOwn = selected?.uid === privateOwnerUid;
    const prior = isOwn ? null : selected?.lastRound;
    const deck = isOwn ? state.privatePlayer?.deck ?? [] : prior?.deck ?? [];
    const hand = isOwn ? state.privatePlayer?.hand ?? [] : null;
    const traits = isOwn
      ? { talents: selected?.talents, fates: state.privatePlayer?.selectedFateStrategies }
      : { talents: prior?.talents, fates: prior?.fateStrategies };

    $(".game-stage").dataset.viewMode = battle ? "battle" : isOwn ? "private" : "prior-round";

    const emotes = new Map((recording.steps[index]?.humanActions ?? [])
      .filter((action) => action.kind === "emote" && action.emojiId != null)
      .map((action) => [action.actorUid, action.emojiId]));
    $("#player-roster").innerHTML = players.map((player) => playerPortrait(player, state, privateOwnerUid, emotes.get(player.uid))).join("");
    $("#round-marker").textContent = `${copy.round}${battle?.round || state.round || "—"}${copy.roundSuffix}`;
    $("#view-caption").textContent = battle
      ? `${selected?.username || recording.targetUsername} · ${copy.battleResult}`
      : isOwn
      ? `${copy.currentView} · ${selected?.username || recording.targetUsername}`
      : `${selected?.username} · ${copy.previousView}`;
    $("#board-panel").hidden = Boolean(battle);
    $("#character-panel").hidden = Boolean(battle);
    $("#battle-panel").hidden = !battle;
    if (battle) {
      renderBattle(battle, selectedUid);
    } else {
      const opponent = isOwn ? state.players[selected?.nextOpponent] : null;
      const hasOpponentPreview = renderOpponentPreview(opponent);
      $("#board-panel").classList.toggle("has-opponent-preview", hasOpponentPreview);
      $("#deck-label").textContent = isOwn ? copy.deck : copy.previousDeck;
      $("#deck").innerHTML = deck.map((id) => card(id, !isOwn)).join("") || `<span class="private-hand">${esc(copy.noDeck)}</span>`;
      $("#hand-label").textContent = isOwn ? `${copy.hand} · ${hand?.length ?? 0}` : copy.hand;
      $("#hand").innerHTML = hand ? hand.map(card).join("") : `<span class="private-hand">${esc(copy.hiddenHand)}</span>`;
    }
    const exchangeCounter = $("#exchange-counter");
    exchangeCounter.hidden = Boolean(battle) || !isOwn;
    const exchangeLimit = Number(privatePlayer?.exchangeLimit);
    exchangeCounter.textContent = isOwn
      ? `${privatePlayer?.exchangesRemaining ?? "—"}${Number.isFinite(exchangeLimit) && exchangeLimit > 0 ? `/${exchangeLimit}` : ""}`
      : "";
    exchangeCounter.title = copy.exchangeChance;
    if (!battle) renderCharacter(selected, traits, state, prior, privateOwnerUid);
    renderChoice(!battle && isOwn ? choiceOverlayForStep(state) : null);
    renderActions();

    timeline.value = index;
    previous.disabled = index === 0;
    next.disabled = index === recording.steps.length - 1;
    $("#step-label").textContent = `${index + 1} / ${recording.steps.length}`;
    $("#recording-meta").textContent = recording.targetUsername;
    document.querySelectorAll(".player-portrait").forEach((button) => button.addEventListener("click", () => {
      selectedUid = button.dataset.uid;
      selectionFollowsPrivate = selectedUid === privateOwnerUid;
      render();
    }));
    if (matchMedia("(max-width: 760px)").matches) {
      const selectedPortrait = document.querySelector(".player-portrait.selected");
      if (selectedPortrait) {
        const roster = $("#player-roster");
        roster.scrollLeft = Math.max(0, selectedPortrait.offsetLeft - (roster.clientWidth - selectedPortrait.offsetWidth) / 2);
      }
    }
  }

  function requestedLocation() {
    const params = new URLSearchParams(location.search);
    const requestedStep = Number.parseInt(params.get("step") ?? "", 10);
    return {
      recordingId: params.get("recording") || "",
      stepIndex: Number.isFinite(requestedStep) && requestedStep > 0 ? requestedStep - 1 : null,
    };
  }

  function updateLanguageLink(url) {
    const link = $(".lang");
    if (!link) return;
    const target = new URL(link.href, location.href);
    target.search = url.search;
    target.hash = url.hash;
    link.href = target.href;
  }

  function filterNumbers(params, name) {
    return new Set(params.getAll(name)
      .flatMap((value) => value.split(","))
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0));
  }

  function filterStateFromParams(params) {
    return {
      fates: filterNumbers(params, "fates"),
      unchosenFates: filterNumbers(params, "unchosenFates"),
      career: Math.max(0, Number.parseInt(params.get("career") ?? "0", 10) || 0),
      opponents: filterNumbers(params, "opponents"),
    };
  }

  function replaceFilterState(nextState) {
    replayFilters.fates = nextState.fates;
    replayFilters.unchosenFates = nextState.unchosenFates;
    replayFilters.career = nextState.career;
    replayFilters.opponents = nextState.opponents;
  }

  function writeFilterState(url) {
    for (const [name, values] of [
      ["fates", replayFilters.fates],
      ["unchosenFates", replayFilters.unchosenFates],
      ["opponents", replayFilters.opponents],
    ]) {
      url.searchParams.delete(name);
      if (values.size) url.searchParams.set(name, [...values].sort((first, second) => first - second).join(","));
    }
    url.searchParams.delete("career");
    if (replayFilters.career > 0) url.searchParams.set("career", String(replayFilters.career));
    return url;
  }

  function syncFilterLocation() {
    const url = writeFilterState(new URL(location.href));
    history.replaceState(history.state, "", url);
    updateLanguageLink(url);
  }

  function syncLocation(mode = "replace") {
    if (!recording || !activeCatalogItem) return;
    const url = new URL(location.href);
    url.searchParams.set("recording", activeCatalogItem.id);
    url.searchParams.set("step", String(index + 1));
    writeFilterState(url);
    history[mode === "push" ? "pushState" : "replaceState"](
      { recordingId: activeCatalogItem.id, step: index + 1 },
      "",
      url,
    );
    updateLanguageLink(url);
  }

  function syncPendingRecordingLocation(item, mode = "push") {
    const url = new URL(location.href);
    url.searchParams.set("recording", item.id);
    url.searchParams.delete("step");
    writeFilterState(url);
    history[mode === "push" ? "pushState" : "replaceState"](
      { recordingId: item.id }, "", url,
    );
    updateLanguageLink(url);
  }

  function navigateToRecording(item) {
    if (!item) return;
    select.value = item.id;
    syncPendingRecordingLocation(item, "push");
    loadRecording(item, { historyMode: "replace" });
  }

  function setIndex(value, sync = true) {
    if (!recording) return;
    index = Math.max(0, Math.min(recording.steps.length - 1, Number(value)));
    render();
    if (sync) syncLocation();
  }

  function installRecording(data, item, requestedStepIndex, historyMode) {
    recording = data;
    activeCatalogItem = item;
    states = hydrateStates(data);
    const firstRecordedIndex = states.findIndex((state) => state.round > 0);
    index = requestedStepIndex == null ? Math.max(0, firstRecordedIndex) : requestedStepIndex;
    index = Math.max(0, Math.min(data.steps.length - 1, index));
    selectedUid = data.targetUid;
    selectionFollowsPrivate = true;
    timeline.max = data.steps.length - 1;
    const firstByRound = new Map();
    states.forEach((state, stateIndex) => { if (state.round && !firstByRound.has(state.round)) firstByRound.set(state.round, stateIndex); });
    roundSelect.innerHTML = `<option value="">${esc(copy.jumpRound)}</option>` + [...firstByRound].map(([round, stateIndex]) => `<option value="${stateIndex}">${copy.round}${round}${copy.roundSuffix}</option>`).join("");
    $("#loading").hidden = true;
    $("#viewer").hidden = false;
    render();
    syncLocation(historyMode);
  }

  function loadRecording(item, { stepIndex = null, historyMode = "replace" } = {}) {
    if (!item) return;
    const generation = ++loadGeneration;
    $("#loading").hidden = false;
    $("#viewer").hidden = true;
    loadCompressedJson(versionedUrl(item.file))
      .then((packed) => window.RECORDING_CODEC.unpackRecording(packed, sharedCatalog))
      .then((data) => {
        if (generation !== loadGeneration) return;
        installRecording(data, item, stepIndex, historyMode);
      })
      .catch((error) => {
        console.error(`could not load recording ${item.file}`, error);
        if (generation === loadGeneration) $("#loading").textContent = `${copy.couldNotLoad} ${item.file}`;
      });
  }

  const recordingLabel = (item) => {
    if (!item.targetUsername || !item.rounds) return item.label;
    const parts = [item.targetUsername, `${item.rounds} ${copy.rounds}`];
    if (Number.isFinite(item.startingRating) && item.startingRating > 0) parts.push(`${item.startingRating} ${copy.rating}`);
    if (numericPrefix(item.career) > 0) parts.push(careerName(item.career));
    if (item.capturedThrough) parts.push(`${item.capturedThrough.slice(0, 16).replace("T", " ")} UTC`);
    return parts.join(" · ");
  };
  const legacyRecordingAliases = new Map([
    ["r-8429f9ca71dd2f18", "r-5b2e107c8e668b62"],
  ]);
  const catalogItemForId = (id) => catalog.find((candidate) =>
    candidate.id === (legacyRecordingAliases.get(id) ?? id));
  const replayFilters = filterStateFromParams(new URLSearchParams(location.search));
  let filteredCatalog = [...catalog];
  const uniqueFilterEntries = (values) => [...new Map(values.map((value) => [Number(value.id), value])).values()]
    .sort((first, second) => localizedInfo(first).localeCompare(localizedInfo(second)));
  const filterFates = uniqueFilterEntries(catalog.flatMap((item) => item.linFates ?? []));
  const filterUnchosenFates = uniqueFilterEntries(catalog.flatMap((item) => item.linUnchosenFates ?? []));
  const filterOpponents = uniqueFilterEntries(catalog.flatMap((item) => item.humanOpponentCharacters ?? []));
  const filterCareers = [...new Set(catalog.map((item) => numericPrefix(item.linCareer)).filter((value) => value > 0))]
    .sort((first, second) => first - second);

  function filterCount() {
    return replayFilters.fates.size + replayFilters.unchosenFates.size + replayFilters.opponents.size + (replayFilters.career > 0 ? 1 : 0);
  }

  function renderRecordingFilters() {
    const checkbox = (kind, entry, checked) => `<label><input type="checkbox" data-filter-kind="${kind}" value="${esc(entry.id)}"${checked ? " checked" : ""}>${esc(localizedInfo(entry))}</label>`;
    filterPopover.innerHTML = `<div class="recording-filter-head"><strong>${esc(copy.filters)}</strong><button type="button" data-clear-filters>${esc(copy.clearFilters)}</button></div>
      <fieldset><legend>${esc(copy.heavenlyFateFilter)}</legend><div class="recording-filter-options">${filterFates.map((entry) => checkbox("fates", entry, replayFilters.fates.has(Number(entry.id)))).join("")}</div></fieldset>
      <fieldset><legend>${esc(copy.unchosenHeavenlyFateFilter)}</legend><div class="recording-filter-options">${filterUnchosenFates.map((entry) => checkbox("unchosenFates", entry, replayFilters.unchosenFates.has(Number(entry.id)))).join("")}</div></fieldset>
      <fieldset><legend>${esc(copy.sideJobFilter)}</legend><select data-career-filter><option value="0">${esc(copy.anySideJob)}</option>${filterCareers.map((career) => `<option value="${career}"${replayFilters.career === career ? " selected" : ""}>${esc(careerName(career))}</option>`).join("")}</select></fieldset>
      <fieldset><legend>${esc(copy.opponentFilter)}</legend><div class="recording-filter-options">${filterOpponents.map((entry) => checkbox("opponents", entry, replayFilters.opponents.has(Number(entry.id)))).join("")}</div></fieldset>`;
    filterToggle.innerHTML = `☷${filterCount() ? `<span>${filterCount()}</span>` : ""}`;
    filterPopover.querySelectorAll("input[data-filter-kind]").forEach((input) => input.addEventListener("change", () => {
      const target = replayFilters[input.dataset.filterKind];
      if (input.checked) target.add(Number(input.value)); else target.delete(Number(input.value));
      applyRecordingFilters();
      renderRecordingFilters();
    }));
    filterPopover.querySelector("[data-career-filter]")?.addEventListener("change", (event) => {
      replayFilters.career = Number(event.target.value);
      applyRecordingFilters();
      renderRecordingFilters();
    });
    filterPopover.querySelector("[data-clear-filters]")?.addEventListener("click", () => {
      replayFilters.fates.clear(); replayFilters.unchosenFates.clear(); replayFilters.opponents.clear(); replayFilters.career = 0;
      applyRecordingFilters();
      renderRecordingFilters();
    });
  }

  function applyRecordingFilters({ navigate = true } = {}) {
    filteredCatalog = catalog.filter((item) =>
      (!replayFilters.career || numericPrefix(item.linCareer) === replayFilters.career)
      && [...replayFilters.fates].every((id) => (item.linFates ?? []).some((entry) => Number(entry.id) === id))
      && [...replayFilters.unchosenFates].every((id) => (item.linUnchosenFates ?? []).some((entry) => Number(entry.id) === id))
      && [...replayFilters.opponents].every((id) => (item.humanOpponentCharacters ?? []).some((entry) => Number(entry.id) === id)));
    const currentId = activeCatalogItem?.id || select.value;
    select.innerHTML = filteredCatalog.length
      ? filteredCatalog.map((item) => `<option value="${esc(item.id)}">${esc(recordingLabel(item))}</option>`).join("")
      : `<option value="">${esc(copy.noMatchingRecordings)}</option>`;
    select.disabled = filteredCatalog.length === 0;
    const currentStillVisible = filteredCatalog.some((item) => item.id === currentId);
    if (currentStillVisible) select.value = currentId;
    else if (navigate && activeCatalogItem && filteredCatalog.length) navigateToRecording(filteredCatalog[0]);
    syncFilterLocation();
  }

  renderRecordingFilters();
  applyRecordingFilters({ navigate: false });
  filterToggle.addEventListener("click", () => {
    filterPopover.hidden = !filterPopover.hidden;
    filterToggle.setAttribute("aria-expanded", String(!filterPopover.hidden));
  });
  document.addEventListener("click", (event) => {
    const tooltipTrigger = event.target.closest(".trait-icon, .battle-buff, .dao-yun-choice, .card-selection-choice");
    if (tooltipTrigger && mobileViewport.matches) {
      event.preventDefault();
      openMobileTooltip(tooltipTrigger);
      return;
    }
    if (!filterPopover.hidden && !event.target.closest(".recording-picker-row")) {
      filterPopover.hidden = true;
      filterToggle.setAttribute("aria-expanded", "false");
    }
  });
  mobileTooltipLayer.addEventListener("click", (event) => {
    if (event.target === mobileTooltipLayer || event.target.closest(".mobile-tooltip-close")) closeMobileTooltip();
  });
  mobileViewport.addEventListener("change", closeMobileTooltip);
  select.addEventListener("change", () => navigateToRecording(catalog.find((item) => item.id === select.value)));
  previous.addEventListener("click", () => setIndex(index - 1));
  next.addEventListener("click", () => setIndex(index + 1));
  timeline.addEventListener("input", (event) => setIndex(event.target.value));
  roundSelect.addEventListener("change", (event) => { if (event.target.value !== "") setIndex(event.target.value); });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileTooltipLayer.hidden) {
      closeMobileTooltip();
      return;
    }
    if (["INPUT", "SELECT"].includes(document.activeElement?.tagName)) return;
    if (event.key === "ArrowLeft") setIndex(index - 1);
    if (event.key === "ArrowRight") setIndex(index + 1);
  });
  addEventListener("popstate", () => {
    const requested = requestedLocation();
    replaceFilterState(filterStateFromParams(new URLSearchParams(location.search)));
    applyRecordingFilters({ navigate: false });
    renderRecordingFilters();
    let item = catalogItemForId(requested.recordingId)
      ?? catalog.find((candidate) => candidate.targetUid === preferredTargetUid)
      ?? catalog[0];
    if (!item) return;
    if (!filteredCatalog.some((candidate) => candidate.id === item.id) && filteredCatalog.length) item = filteredCatalog[0];
    select.value = item.id;
    if (recording && activeCatalogItem?.id === item.id) {
      setIndex(requested.stepIndex ?? states.findIndex((state) => state.round > 0), false);
      updateLanguageLink(new URL(location.href));
    } else loadRecording(item, { stepIndex: requested.stepIndex, historyMode: "replace" });
  });
  addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.matches("img[data-character-fallback]")) {
      if (!event.target.dataset.fallbackApplied) {
        event.target.dataset.fallbackApplied = "true";
        event.target.src = event.target.dataset.defaultSrc;
      } else event.target.hidden = true;
      return;
    }
    if (event.target instanceof HTMLImageElement && event.target.matches("img[data-asset-fallback]")) event.target.hidden = true;
    if (event.target instanceof HTMLImageElement && event.target.matches("img[data-emote-art]")) event.target.hidden = true;
  }, true);
  const requested = requestedLocation();
  const initialRecording = catalogItemForId(requested.recordingId)
    ?? catalog.find((item) => item.targetUid === preferredTargetUid)
    ?? catalog[0];
  if (initialRecording) {
    select.value = initialRecording.id;
    loadRecording(initialRecording, { stepIndex: requested.stepIndex });
  }
  else $("#loading").textContent = copy.noRecordings;
})().catch((error) => {
  console.error("could not initialize recording browser", error);
  const loading = document.querySelector("#loading");
  if (loading) loading.textContent = document.documentElement.lang.toLowerCase().startsWith("zh")
    ? "无法载入录像。" : "Could not load recordings.";
});
