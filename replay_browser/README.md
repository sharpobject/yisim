# Yi Xian Pai observation browser

Open `index.html` directly in a web browser. Use Previous/Next, the slider, the
round picker, or the left/right arrow keys to move through captured actions.
Click any portrait in the top player strip to inspect that player's public
previous-round deck, Immortal Fates, and Heavenly Derivation Fates. The crossed
swords mark the observed player's upcoming opponent.

To compile every complete observed-player capture below `raw-captures/` into
the recording selector:

```sh
cd /Users/sharpobject/Documents/ubiq
YXP_WIKI_ROOT=/path/to/yxp_wiki node replay_browser/build_catalog.mjs
```

Catalog builds are incremental by default. The builder stores a fingerprinted
inspection cache beside the raw capture tree and reuses existing compact files
and catalog filter metadata. Normal runs therefore parse and package only new
or changed captures; incomplete captures are reconsidered automatically when
their size or modification time changes. Use `YXP_FORCE_REBUILD=1` for a clean
historical payload rebuild (the eligibility scan remains cached),
`YXP_INCREMENTAL=0` to retain the old non-incremental behavior,
`YXP_DISABLE_SCAN_CACHE=1` to force capture reinspection, or
`YXP_SCAN_CACHE_PATH=/path/to/cache.json` to relocate the cache.

`build_catalog.mjs` accepts the raw-capture and output directories as optional
arguments. A standard complete recording must begin with round 1 and contain an
authoritative `GameStatus` with `ended = true`. Cup recordings may begin as late
as round 3, provided every round from the first captured round through the end is
present. Every eligible perspective is built to exercise the reconstruction
logic, while only Lin Xiaoyue perspectives are written to the deployable catalog.
Set `YXP_REPLAY_ROOT` when the scraped replay archive is not at
`scrape/data/replays`; its Cup progress metadata distinguishes preliminary games
from finals in the selector. Each deployable recording is delta encoded and
loaded on demand; raw traffic is not included.

Complete Lin Xiaoyue recordings in mode 2 whose capture completes from
2026-09-08 through 2026-09-18 UTC are tagged `practice`. Their selector labels
show `Practice` / `练习赛` instead of a rating. The bounded classification keeps
unrelated historical and future custom rooms from being labeled as part of
this practice period.

For a late Cup capture, the scraped replay supplies low-resolution history only
through the shop before the first shop phase that has detailed live messages.
The first server message after observation acceptance remains live even when it
is a `BattleResult`. Post-battle snapshots can disclose the next round's deal in
stages, so reconstruction waits for the last complete private snapshot before
the first card action. If activity already occurred before detailed observation
began, only the replay/live aggregate residual is attached to that first shop;
live events and snapshots always remain authoritative.

Every loaded position has a stable URL of the form
`?recording=OPAQUE_RECORDING_ID&step=STEP_NUMBER`. The public recording ID is
deliberately unrelated to the game room ID. Public packaging removes internal
`codeId` and `roomId` fields, including from previously cached payloads, while
retaining them in the private reconstruction cache. The step number is one-based,
matching the counter shown in the replay toolbar. Replay navigation updates the
URL, browser back/forward restores it, and the language switch preserves it.

To compile one live-observer capture:

```sh
cd /Users/sharpobject/Documents/ubiq
YXP_WIKI_ROOT=/path/to/yxp_wiki node replay_browser/build_data.mjs path/to/capture.jsonl replay_browser/.recording-payload-cache/example.compact.json
```

`build_catalog.mjs` stores the public catalog and recordings as deterministic
gzip-compressed JSON. Static card, talent, fate, and character metadata appears
once in the shared catalog; each recording contains only catalog references and
a schema-packed timeline. The build decodes every emitted payload and requires
deep equality with the expanded builder output before it succeeds.

## Recording regressions

When a reported recording bug is fixed, preserve it in
`recording-regressions.json`. Assertions identify a moment by semantic facts
such as the round, protocol message type, battle round, action kind, actor, or
the raw capture sequence. They never use the browser's generated step number.
If a semantic event genuinely repeats, `occurrence` is one-based among the
matching events.

Checks use JSON-pointer paths rooted at `state`, `beforeState`, `nextState`, or
`event`. Supported operations are `equals`, `notEquals`, `exists`, `includes`,
`excludes`, `includesMatch`, `excludesMatch`, and `length`. The two `Match`
operations compare an array entry with an object subset, so assertions do not
need to repeat unrelated fields. For example:

```json
{
  "name": "round 9 enlightenment upgrades Cat Sword",
  "anchor": {
    "round": 9,
    "type": "PlayerData",
    "actionKind": "heavenlyFateUse",
    "occurrence": 1
  },
  "checks": [
    {
      "path": "/state/privatePlayer/hand/2",
      "op": "equals",
      "value": 1020009
    }
  ]
}
```

Any recording with assertions is rebuilt on every catalog run, even during an
incremental build, and a missing, ambiguous, or failed assertion aborts the
build.

To copy the card images and Fate/Heavenly Derivation Fate icons used by the
generated replay from a checkout of `sharpobject/yxp_wiki`:

```sh
node replay_browser/sync_card_images.mjs replay_browser/replay-data.js /path/to/yxp_wiki replay_browser/card-images
```

The browser shows the observed player's private deck/hand, Fates, Heavenly
Derivation Fates, and the public and last-round information sent for every
opponent. The observed player's Fate number badges mirror the public counters
shown by the client; active Heavenly Derivation Fates show calculated remaining
charges or cooldown. Opponent HDF counters are intentionally omitted because
they are not present in the public prior-round snapshot. Between authoritative
`GameStatus`/`PlayerData` snapshots, hand/deck changes are reconstructed from
the observed `MoveCardReq`, `InsertCardReq`, `ReplaceCardResp`, and
`RefineCardResp` messages.

The five-item activity history translates those messages into game actions and
also reports attributed destiny changes derived from consecutive authoritative
states.

To stage the viewer in a checkout of `sharpobject/yxp_wiki`:

```sh
node replay_browser/stage_wiki.mjs /path/to/yxp_wiki
```

This creates `en/recordings/index.html`, places the viewer and compact data
under `assets/recordings/`, and adds a Recordings link to the English and
Chinese landing-page navigation bars without rewriting every generated page.
Card, character, Talent, and Heavenly Derivation Fate images continue to use
the wiki's existing asset tree.

## Historical metadata variants

The shared catalog provides baseline metadata. Recordings with differing
metadata retain exact per-recording overrides in an optional fourth packed
element. The decoder still accepts legacy three-element recordings. This
preserves removed fields and historical rule text across extraction updates
without dropping recordings or silently replacing their metadata.

## Emote artwork and site branding

Emotes are Spine 4.2 animations, not individual texture sprites. Keep each
`.skel`, `.atlas`, and texture together from the same bundle.
`extract_emote_assets.py BUNDLE_ROOT MEDIA_MANIFEST OUTPUT` extracts these
from already-downloaded client bundles using UnityPy. Install
`@esotericsoftware/spine-canvas@4.2` and `@napi-rs/canvas` in an isolated npm
directory and copy `render_emote_frames.mjs` there. Run it with
`ASSET_ROOT TEXTURE_ROOT FRAME_ROOT EMOTE_ID`, then run
`encode_emotes.py FRAME_ROOT replay_browser/emoji-images`. The wiki uses the
animated WebP; the local viewer uses its PNG preview. Preserve deployed assets
when extraction output is absent. Official text-only emotes use localized
text bubbles and must not request nonexistent image files.

The public name is **Yi Xian Card Gallery** / **弈仙牌卡牌图鉴**.
`scrape/wiki/scripts/site_branding.py` applies the localized name to all
generated and retained HTML; the Hetz generator calls it at the end of
`build_site`. Recording templates and the tier-list dynamic title also use
these names. September 17 rendering and generator patch evidence is stored
on Hetz in `reports/emotes-branding-20260917/`.

### Partial round-one openings

Every eligible live capture looks for a matching scraped replay, including
ordinary games that start partway through round one. When the first live state
shows prior activity, the first step receives an approximate shop summary for
replay-derived activity absent from the detailed live actions. It does not
invent card identities, intermediate states, or an order for missing actions.
Observed combinations and absorptions are subtracted together before splitting
the remaining estimate, since a combined card can subsequently be absorbed.
All captured states and detailed events are retained.

The replay's top-level UID is not sufficient to identify a human perspective:
AI perspectives can retain human metadata. Require the human to participate in
the perspective's battles, and never let an AI view replace that human's view.
Initial Curiosity counters come from the talent configuration.

Private payload-cache dependency receipts include the matching replay and its
siblings; replay arrival or modification automatically invalidates the cached
recording on the next catalog build. The private .opening-repair-audit.json
records residual estimates and uncertainty and persists across incremental
builds. This does not broaden the eligibility of late-start non-Cup captures.

## Side-job choices

Regular side-job selection and Additional Side Job career selection use two
consecutive modal steps: all available jobs, then the same options with the
chosen job highlighted. Add a localized side-job action to the result step.
Read available jobs from the extracted OpenConfig OpenCareer rows for the live
client environment; currently all seven careers are enabled. The existing
career remains an option for Additional Side Job.

Decode BattlePlayerPrivateData.FZJXCareers (protobuf field 103) and
BattlePlayerLastRoundData.FZJXCareers (field 11). This map uses one-based
Immortal Fate slots as keys and career IDs as values. Annotate the corresponding
Additional Side Job fate reference only once that career is known, then render
Icon_Career_<id> in its chosen-fate slot, including last-round/battle views.
Keep the generic fate artwork in offer history. Normalize replay-summary maps
at the recording boundary without changing the replay-summary schema.

After reconstruction changes, run the full corpus rebuild and catch-up, then
`node replay_browser/audit_side_job_steps.mjs replay_browser/data` alongside
the privacy, timeline, and battle-destiny audits. The side-job audit requires
an unselected offer immediately before each career reveal, a highlighted
result, a timeline action, and matching chosen-fate icon metadata.


### Draws and gained cards after choices/active effects

`card-acquisitions.mjs` adds an explicit, modal-free hand step after a selected
Immortal Fate or used seasonal ability delivers cards. The result modal remains
a separate step; cards are revealed on their acquisition step before subsequent
exchanges, combinations or other actions. Follow-up choices retain their own
unselected offer/result steps.

Draw (`抽`) and gain (`获得`, including `选择…张获得`) are classified from the
Chinese effect description, never the English localization or hand increase
alone. Fate Path triggers use the chosen talent's Chinese name. Fixed-card gains
must match the delivered card references; a pending reward or a level upgrade
is not a draw/gain. Breakthrough passives use only the triggering Chinese clause,
not unrelated game-start grants elsewhere in their description.

Reserved Daoist Rhyme rewards use the selected card, its phase requirement and
recorded multiplier; only the latest still-relevant reservation can deliver.
They are gains, while At Own Pace uses the native tooltip's immediate-draw rule.
Simultaneous rewards follow their actual positions in the recorded hand rather
than an assumed global priority. Separate gain/draw steps reveal those cards
progressively and preserve the original final snapshot.

Run `node replay_browser/card-acquisitions.test.mjs` and, after a full corpus
rebuild, `node replay_browser/audit_card_acquisition_steps.mjs replay_browser/data`.
Private per-recording diagnostics are under `.recording-payload-cache/.card-acquisition-audit/`;
never publish those audit files. Cases without enough evidence for attribution
are recorded there instead of guessing a draw/gain verb.

### Card transition highlights

The viewer compares adjacent states for moves, rearrangements, exchanges,
combinations, absorption, draws and gains. New cards/positions are green; old
copies remain red with a cross for that step. An emptied deck slot displays its
red historical card in place, without an origin label or extra position. When
a replacement occupies that slot, exactly one red card is appended after the
real deck slots (at most nine visible
positions in a full deck). Otherwise no extra position is rendered. This card
is historical, carries its original slot number, and never enters the hand.
Deck rearrangements never append a historical card, even when slots are occupied.
Combines show only the consumed/dragged copy in red; the upgraded target shows
green with no old-level ghost. Absorb-triggered upgrades follow the same rule.
Historical hand copies are excluded from the hand count. Hand matching
is duplicate-aware, and seeking or stepping backwards gives the same display.
At round starts, newly added hand copies are green even without a draw action;
existing copies remain unhighlighted, and no red history or deck changes carry
across the round boundary. Opponent snapshots, battles and unrelated actions
do not inherit highlights. Run `node replay_browser/card-transitions.test.mjs`.

An ability choice may open in the first snapshot of a new round, alongside
ordinary round draws. Preserve that ability's source until its choice result
arrives; the round's normal draws must not be attributed to that ability.

## Qi Wangyou Plant Master collection

`stage_recordings_751.mjs PRIVATE_MANIFEST TEMPLATE_WIKI PRIVATE_OUTPUT` packages
an explicitly selected complete Plant Master Qi Wangyou collection from the
private payload cache. The private manifest has a `matches` array in the normal
capture-scan format. Run from the authoritative checkout containing that cache.
It produces bilingual `recordings_751` pages and their separate compact data,
reusing the existing viewer assets. It does not modify the template wiki or the
normal Lin Xiaoyue collection. Publication is a separate explicit operation.

Each payload is sanitized with the existing public contract (no room/game IDs
or capture paths), compacted and round-trip checked. Target-player filters stop
following private state when spectators switch players after elimination; the
recording itself retains its full ending. Validate the private output with the
timeline, side-job and battle-destiny audits and both language pages before
publishing. Never copy the private selection manifest or account research.

## Five Elements Pure Vase

The viewer shows Qi Wangyou's three fixed vase slots beside her hand when her
private perspective has talent 199. `cardStorage[199]` comes from the native
`talentDatas[199].commonParams`; slots stay ordered, including zeros.
`CardOperationResp` operation 1 / useCase 6 supplies `[fromPosition, fromIndex,
toPosition, toIndex]`, where hand is 0 and vase is 6. Withdrawal omits toIndex.
Emit a separate localized move/rearrange action, retaining transfer coordinates
for audits. Hand-to-occupied-slot swaps return the displaced card to hand;
only an empty-slot deposit adds 1 cultivation, withdrawal subtracts 1, and
internal swaps do not change cultivation.

Authoritative retail build 25343702: `Talent199Panel.Refresh`,
`CardGridCunQuItem.MoveCardToGrid`, `MoveCardToHand`, `RefreshTalent199Icon`,
`CardPanel.RefreshCardDes`, and `GameDefineClientOnly.WU_XING`. Only the first
slot's native Chinese card name determines the icon. Start with 199; scan
金灵/水灵/木灵/火灵/土灵 in that order, assigning 10199/20199/30199/40199/50199
for matches (last match wins). Slots two/three have no icon effect. Five native
variants are losslessly stored in `vase-icons/`; the neutral variant uses the
existing fate asset. Do not expose another player's private vase while browsing
public prior-round snapshots.

Run `vase.test.mjs`, `card-transitions.test.mjs`, the complete reconstruction,
and `audit_vase_steps.mjs DATA_ROOT` alongside timeline/side-job/battle checks.
The vase audit checks exact hand/vase transitions and cultivation deltas for
every explicit transfer. The `recordings_751` packager hashes payload contents
as well as the catalog, so changed timelines invalidate browser caches.

For hand-to-deck swaps, omit appended red deck history when the displaced copy
is already shown as a new hand position. Keep red in-place in emptied slots.
