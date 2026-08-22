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
historical rebuild, `YXP_INCREMENTAL=0` to retain the old non-incremental
behavior, or `YXP_SCAN_CACHE_PATH=/path/to/cache.json` to relocate the cache.

`build_catalog.mjs` accepts the raw-capture and output directories as optional
arguments. A complete recording must begin with round 1 and contain an
authoritative `GameStatus` with `ended = true`. Each deployable recording is
delta encoded and loaded on demand; raw traffic is not included.

Every loaded position has a stable URL of the form
`?recording=OPAQUE_RECORDING_ID&step=STEP_NUMBER`. The public recording ID is
deliberately unrelated to the game room ID. The step number is one-based,
matching the counter shown in the replay toolbar. Replay navigation updates the
URL, browser back/forward restores it, and the language switch preserves it.

To compile one live-observer capture:

```sh
cd /Users/sharpobject/Documents/ubiq
YXP_WIKI_ROOT=/path/to/yxp_wiki node replay_browser/build_data.mjs path/to/capture.jsonl replay_browser/data/example.compact.js
```

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
