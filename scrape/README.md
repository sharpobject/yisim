# Yi Xian Auth Scrape

Small tools for getting a Steam auth session ticket for Yi Xian and exchanging it
for the game's login JWT.

Known public metadata:

- Steam AppID: `1948800`
- Steam store: <https://store.steampowered.com/app/1948800/Yi_Xian_The_Cultivation_Card_Game/>
- SteamDB: <https://steamdb.info/app/1948800/>
- Auth endpoint: `POST https://p3.gate.darksungame.com/auth/login`
- App version endpoint:
  `GET https://p3.gate.darksungame.com/serverConfig/appVersion?platform=1&unityPlatform=1`
- Current app version from that endpoint: `1.6.5`
- Current login game version: `001.0006.0014`
- Current login resource version: `1.6.0`
- WebSocket lobby: `wss://p3.gate.darksungame.com/lobby-server`
- WebSocket game: `wss://p3.gate.darksungame.com/game-server`
- JWT signing: `RS256`
- Token lifetime: about 3 days
- Refresh flow: none known; re-run Steam ticket login when the token expires.

This assumes you are authenticating an account you control. Steam must be
running and logged in on the machine that generates the session ticket.

## Files

- `steam_appid.txt`: lets Steamworks initialize as Yi Xian when running from this
  directory.
- `config.example.json`: copy to `config.json` and fill in the server details
  found from the current game client.
- `steam_metadata.py`: fetches public Steam app metadata.
- `steamcmd.sh`: runs the locally installed SteamCMD under `tools/steamcmd`.
- `scan_install.py`: scans a local game install for candidate auth URLs, version
  strings, and XXTEA-looking references.
- `extract_structured_assets.py`: extracts loose JSON files and protobuf
  TextAssets from the installed Unity/Addressables game data.
- `extract_media_and_code.py`: extracts Texture2D PNGs, embedded fonts, managed
  assemblies, bundled hot-update code blobs, and ILSpy decompiled C#.
- `scan_bundles.py`: searches bundle TextAssets for strings when investigating
  client code or config references.
- `steam_ticket.c` / `steam_ticket`: small C Steamworks ticket generator that
  loads the game's bundled `libsteam_api.so`. By default it prints an encrypted
  app ticket for `steamEncryptedTicket`; pass `--auth-session` to print the
  older auth session ticket format.
- `ticket_steamworks.py`: best-effort Steamworks ticket generator. The Python
  Steamworks wrappers differ by platform/package version, so this is isolated.
- `login.py`: end-to-end login exchange once `config.json` and a ticket provider
  are available.
- `xxtea.py`: local XXTEA implementation used by `login.py`.

## Setup

```bash
cd scrape
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp config.example.json config.json
```

SteamCMD is installed locally under `tools/steamcmd`; run it with:

```bash
./steamcmd.sh +login anonymous +app_info_print 1948800 +quit
```

SteamCMD can download the game and request the free license, but it is not
enough for Steamworks auth tickets. `steam_ticket` needs the desktop Steam client
running and logged in as the target account.

For a headless session, create an ignored credentials file and start Steam:

```bash
cp steam_credentials.env.example steam_credentials.env
chmod 600 steam_credentials.env
$EDITOR steam_credentials.env
./steam_login_headless.sh
```

This uses Steam's `-login` arguments, so the password may be visible briefly in
the local process table while Steam starts. Prefer an interactive desktop login
when that matters.

Install a Steamworks Python wrapper only if you want to use
`ticket_steamworks.py` directly. Otherwise set `ticket_command` in `config.json`
to any program that prints the base64 session ticket.

## Find Current Client Details

On macOS, the local install path is commonly:

```bash
python scan_install.py "/Users/$USER/Library/Application Support/Steam/steamapps/common/YiXianPai"
```

On Linux/Proton, inspect your Steam library under:

```bash
python scan_install.py "$HOME/.local/share/Steam/steamapps/common/YiXianPai"
```

The scanner is intentionally noisy: it prints candidate strings so we can confirm
the current API base URL, login path, app version, and encryption references.

## Extract Structured Assets

Install the Python dependencies in the local venv, then extract:

```bash
cd scrape
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install UnityPy
.venv/bin/python extract_structured_assets.py
```

The extractor writes ignored output under `extracted_assets/<game_version>/`.
By default it reads `game_version` from `config.json`, so sub-patch/content
versions such as `001.0006.0014` stay separate from the public app version
`1.6.5`. You can override the folder explicitly:

```bash
.venv/bin/python extract_structured_assets.py --version 001.0006.0014
```

Inside each version folder:

- `json/`: loose JSON files from `StreamingAssets`, including Addressables
  catalogs and Unity services config.
- `protobuf/`: raw protobuf `TextAsset` blobs, mostly generated from game config
  spreadsheets such as `CardConfig.pb`, `CharacterConfig.pb`, `BuffConfig.pb`,
  `SeasonConfig.pb`, and event configs.
- `protobuf_raw_json/`: best-effort wire-format previews for quick inspection.
  These are schema-less, so they show field numbers rather than semantic field
  names.
- `manifest.json`: source bundle, asset name, output path, size, and SHA-256 for
  every extracted structured asset.
- `metadata.json`: app, resource, and specific game/content versions used for
  the extraction.

The current `001.0006.0014` extracted set is 4 JSON files and 127 protobuf
config assets.

## Extract Textures, Fonts, And Code

Install ILSpy once, then run the media/code extractor:

```bash
dotnet tool install ilspycmd --version 9.1.0.7988 --tool-path tools/dotnet-tools
.venv/bin/python extract_media_and_code.py
```

The extractor writes into the same versioned folder as structured assets,
`extracted_assets/<game_version>/`, and adds:

- `textures/`: Unity `Texture2D` assets converted to PNG.
- `fonts/`: embedded Unity font blobs such as `DefaultFont.otf`.
- `code/assemblies/`: selected managed game assemblies plus bundled hot-update
  DLL/PDB blobs.
- `code/decompiled/`: ILSpy project decompilations for assemblies that have a
  normal .NET PE layout.
- `code/async_kinds.json`: async method builder families detected in the copied
  assemblies.
- `media_code_manifest.json`: source bundle, output path, size, SHA-256, and
  decompile status for extracted media/code.

Useful options:

```bash
.venv/bin/python extract_media_and_code.py --skip-textures
.venv/bin/python extract_media_and_code.py --skip-decompile
.venv/bin/python extract_media_and_code.py --clean
```

Yi Xian's async methods use Cysharp UniTask builders:

- `Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskMethodBuilder`
- `Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskMethodBuilder<T>`
- `Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskVoidMethodBuilder`

ILSpy 9.1 reconstructs these as `async UniTask` / `async UniTask<T>` as long as
it is run with `-r YiXianPai/YiXianPai_Data/Managed`, so `Managed/UniTask.dll`
is available as a reference. The bundled `DarkSun.HotUpdate` blob is copied out,
but its PE header is nonstandard/protected and current ILSpy fails on it with a
`BadImageFormatException`.

The current `001.0006.0014` media/code pass exported 7,323 textures, 1 embedded
font, 5 normal managed assemblies, and the bundled HotUpdate DLL/PDB. One Unity
font atlas texture failed to decode through UnityPy.

## Run The Login Exchange

After filling in `config.json` with a working Steam ticket provider:

```bash
python login.py --config config.json
```

The access token is written to the configured `token_output_path`. Keep that file
out of git.

## Wire Format

Encrypted requests use XXTEA and are sent as base64 ciphertext:

- Plaintext is compact JSON.
- `Hash` header is `MD5(unix_timestamp_milliseconds.toString())`.
- XXTEA key is the UTF-8 MD5 hex string from `Hash`; the XXTEA implementation
  uses `includeLength=true`.
- `Content-Type` is `application/octet-stream`.

Login payload:

```json
{
  "steamEncryptedTicket": "<base64 Steam encrypted app ticket>",
  "steamAuthTicket": null,
  "steamOwnerId": null,
  "loginType": 1,
  "autoCreate": false,
  "extra": {
    "appVersion": "1.6.5",
    "resourceVersion": "1.6.0",
    "gameVersion": "001.0006.0014",
    "deviceId": "<UUID>",
    "routeIndex": 0,
    "serverId": 1,
    "platform": 1,
    "unityPlatform": 1
  }
}
```
