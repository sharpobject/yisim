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
