#!/usr/bin/env python3
"""Observe up to four qualifying Lin Xiaoyue players in new ranked or Dao Mindset rooms."""

from __future__ import annotations

import argparse
import asyncio
import base64
import copy
import fcntl
import json
import os
import signal
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlsplit, urlunsplit

import msgpack
import requests
import websockets

from login import LoginTokenError, load_config, login
from request_join_sect import bump_patch


LIN_XIAOYUE_ID = 1_000_004
RANKED_MODE = 3
ROOM_STATUS_IN_BATTLE = 2
HIGH_RATING_LOBBY_THRESHOLD = 6000
COLYSEUS_JOIN_ROOM = 0x0A
COLYSEUS_ERROR = 0x0B
COLYSEUS_LEAVE_ROOM = 0x0C
COLYSEUS_ROOM_DATA = 0x0D
COLYSEUS_ROOM_STATE = 0x0E
GAME_STATUS_REQ = b"\x08\x03"  # SimpleClientPact { type: GameStatusReq }
APP_VERSION_CHECK_INTERVAL_SECONDS = 30.0
ROOM_DIRECTORY_HTTP_TIMEOUT_SECONDS = 8.0


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def log(message: str) -> None:
    print(f"{utc_now()} {message}", flush=True)


class ObservableCharacterConfig:
    def __init__(self, path: Path):
        self.path = path
        self.character_ids: frozenset[int] = frozenset({LIN_XIAOYUE_ID})
        self.signature: tuple[int, int] | None = None
        self.reload(force=True)

    def reload(self, force: bool = False) -> bool:
        try:
            stat = self.path.stat()
        except FileNotFoundError:
            if force:
                log(
                    f"observable character file {self.path} is absent; "
                    f"using default [{LIN_XIAOYUE_ID}]"
                )
            return False
        signature = (stat.st_mtime_ns, stat.st_size)
        if not force and signature == self.signature:
            return False
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            values = raw.get("characterIds") if isinstance(raw, dict) else raw
            if not isinstance(values, list):
                raise ValueError("expected a JSON array or an object with a characterIds array")
            character_ids = frozenset(
                int(value)
                for value in values
                if not isinstance(value, bool) and int(value) > 0
            )
            if len(character_ids) != len(values):
                raise ValueError("characterIds must contain unique positive integers")
        except (OSError, TypeError, ValueError, json.JSONDecodeError) as exc:
            self.signature = signature
            log(
                f"observable character reload ignored for {self.path}: "
                f"{type(exc).__name__}: {exc}"
            )
            return False
        self.signature = signature
        self.character_ids = character_ids
        log(f"observable characters reloaded from {self.path}: {sorted(character_ids)}")
        return True


def jwt_payload(token: str) -> dict[str, Any]:
    encoded = token.split(".")[1]
    encoded += "=" * ((4 - len(encoded) % 4) % 4)
    return json.loads(base64.urlsafe_b64decode(encoded))


def replace_ws_scheme(url: str, scheme: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((scheme, parts.netloc, parts.path.rstrip("/"), "", ""))


def encode_varint(value: int) -> bytes:
    if value < 0:
        value &= (1 << 64) - 1
    out = bytearray()
    while value >= 0x80:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    out.append(value)
    return bytes(out)


def protobuf_string(field_number: int, value: str) -> bytes:
    raw = value.encode("utf-8")
    return encode_varint((field_number << 3) | 2) + encode_varint(len(raw)) + raw


def protobuf_fields(raw: bytes):
    offset = 0
    while offset < len(raw):
        tag, offset = decode_varint(raw, offset)
        field_number = tag >> 3
        wire_type = tag & 7
        if wire_type == 0:
            value, offset = decode_varint(raw, offset)
        elif wire_type == 1:
            value = raw[offset : offset + 8]
            offset += 8
        elif wire_type == 2:
            length, offset = decode_varint(raw, offset)
            value = raw[offset : offset + length]
            offset += length
        elif wire_type == 5:
            value = raw[offset : offset + 4]
            offset += 4
        else:
            raise ValueError(f"unsupported protobuf wire type {wire_type}")
        yield field_number, wire_type, value


def decode_varint(raw: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while offset < len(raw):
        byte = raw[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
        shift += 7
        if shift > 70:
            break
    raise ValueError("truncated or oversized varint")


def field_value(fields: list[tuple[int, int, Any]], number: int, default=None):
    for field_number, _wire_type, value in fields:
        if field_number == number:
            return value
    return default


def decode_text(value: bytes | None) -> str:
    return value.decode("utf-8", errors="replace") if value else ""


def encode_room_data(message_type: str, protobuf: bytes) -> bytes:
    envelope = {
        "type": message_type,
        "data": base64.b64encode(protobuf).decode("ascii"),
    }
    return (
        bytes([COLYSEUS_ROOM_DATA])
        + msgpack.packb("data", use_bin_type=True)
        + msgpack.packb(envelope, use_bin_type=True)
    )


def decode_room_data(frame: bytes) -> tuple[str, bytes] | None:
    if not frame or frame[0] != COLYSEUS_ROOM_DATA:
        return None
    unpacker = msgpack.Unpacker(raw=False, strict_map_key=False)
    unpacker.feed(frame[1:])
    try:
        kind = unpacker.unpack()
        envelope = unpacker.unpack()
    except (msgpack.OutOfData, ValueError):
        return None
    if kind != "data" or not isinstance(envelope, dict):
        return None
    message_type = envelope.get("type")
    encoded = envelope.get("data")
    if not isinstance(message_type, str) or not isinstance(encoded, str):
        return None
    try:
        return message_type, base64.b64decode(encoded)
    except ValueError:
        return None


@dataclass(frozen=True)
class Player:
    uid: str
    username: str
    rank_score: int
    char_id: int
    is_ai: bool

    def as_json(self) -> dict[str, Any]:
        return {
            "uid": self.uid,
            "username": self.username,
            "rankScore": self.rank_score,
            "charId": self.char_id,
            "isAI": self.is_ai,
        }


@dataclass(frozen=True)
class ObserverAccount:
    steam_name: str
    label: str


@dataclass(frozen=True)
class RoomPlayerProfile:
    uid: str
    username: str
    char_id: int
    is_ai: bool
    is_dao_mindset: bool
    random_character: bool
    rank_score: int
    dao_score: int

    @property
    def actual_mode_score(self) -> int:
        return self.dao_score if self.is_dao_mindset else self.rank_score

    @property
    def is_human_lin(self) -> bool:
        return not self.is_ai and self.char_id == LIN_XIAOYUE_ID

    @property
    def selection_priority(self) -> tuple[int, int, str]:
        if self.is_dao_mindset and not self.random_character:
            tier = 2
        elif not self.is_dao_mindset and not self.random_character:
            tier = 1
        else:
            tier = 0
        return tier, self.actual_mode_score, self.uid

    def qualifies_capture(self, min_dao_score: int, min_ranked_score: int) -> bool:
        if not self.is_human_lin:
            return False
        if self.is_dao_mindset:
            return self.dao_score >= min_dao_score
        return self.rank_score >= min_ranked_score

    def as_json(self) -> dict[str, Any]:
        return {
            "uid": self.uid,
            "username": self.username,
            "charId": self.char_id,
            "isAI": self.is_ai,
            "isDaoXinRank": self.is_dao_mindset,
            "randomCharacter": self.random_character,
            "rankScore": self.rank_score,
            "daoXinRankScore": self.dao_score,
            "actualModeScore": self.actual_mode_score,
        }


def prioritized_observation_targets(
    profiles: list[RoomPlayerProfile],
    min_dao_score: int,
    min_ranked_score: int,
    observable_character_ids: frozenset[int] = frozenset({LIN_XIAOYUE_ID}),
) -> list[RoomPlayerProfile]:
    human_lins = sorted(
        (profile for profile in profiles if profile.is_human_lin),
        key=lambda profile: profile.selection_priority,
        reverse=True,
    )
    qualifying_lins = [
        profile
        for profile in human_lins
        if LIN_XIAOYUE_ID in observable_character_ids
        and profile.qualifies_capture(min_dao_score, min_ranked_score)
    ]
    allowlisted_fallbacks = sorted(
        (
            profile
            for profile in profiles
            if not profile.is_ai
            and profile.char_id != LIN_XIAOYUE_ID
            and profile.char_id in observable_character_ids
        ),
        key=lambda profile: (profile.actual_mode_score, profile.uid),
        reverse=True,
    )
    return qualifying_lins + allowlisted_fallbacks


@dataclass
class RoomCandidate:
    room_id: str
    process_id: str
    created_ts: int
    round: int
    avg_rank_score: int
    players: list[Player] = field(default_factory=list)

    @property
    def human_players(self) -> list[Player]:
        return sorted(
            (player for player in self.players if not player.is_ai),
            key=lambda player: (player.rank_score, player.uid),
            reverse=True,
        )

    @property
    def lin_humans(self) -> list[Player]:
        return [
            player
            for player in self.human_players
            if player.char_id == LIN_XIAOYUE_ID
        ]

    @property
    def score(self) -> int:
        return self.human_players[0].rank_score if self.human_players else -1


def parse_lobby_user(raw: bytes) -> tuple[str, str, int]:
    fields = list(protobuf_fields(raw))
    return (
        decode_text(field_value(fields, 1)),
        decode_text(field_value(fields, 6)),
        int(field_value(fields, 9, 0)),
    )


def parse_lobby_player(raw: bytes) -> Player:
    fields = list(protobuf_fields(raw))
    user_raw = field_value(fields, 1, b"")
    uid, username, rank_score = parse_lobby_user(user_raw)
    return Player(
        uid=uid,
        username=username,
        rank_score=rank_score,
        # The lobby response has been observed omitting isAI for server bots even
        # though the authoritative GamePlayer state sets it. Bot UIDs are not
        # hexadecimal account UIDs and use the stable ai*-lv* namespace.
        is_ai=bool(field_value(fields, 10, 0)) or (uid.startswith("ai") and "-lv" in uid),
        char_id=int(field_value(fields, 103, 0)),
    )


def parse_lobby_players_response(raw: bytes) -> list[Player]:
    return [parse_lobby_player(value) for number, wire, value in protobuf_fields(raw) if number == 1 and wire == 2]


def parse_realtime_response(raw: bytes) -> dict[str, Any]:
    fields = list(protobuf_fields(raw))
    return {
        "senderUid": decode_text(field_value(fields, 1)),
        "targetUid": decode_text(field_value(fields, 2)),
        "result": int(field_value(fields, 3, 0)),
    }


def parse_room_player_profile(raw: dict[str, Any]) -> RoomPlayerProfile:
    encoded = str(raw.get("customData") or "")
    profile_fields = list(protobuf_fields(base64.b64decode(encoded))) if encoded else []
    return RoomPlayerProfile(
        uid=str(raw.get("uid") or decode_text(field_value(profile_fields, 1))),
        username=str(raw.get("username") or ""),
        char_id=int(field_value(profile_fields, 4, 0)),
        is_ai=bool(raw.get("isAI", False)),
        is_dao_mindset=bool(field_value(profile_fields, 10, 0)),
        random_character=bool(field_value(profile_fields, 17, 0)),
        rank_score=int(field_value(profile_fields, 6, 0)),
        dao_score=int(field_value(profile_fields, 16, 0)),
    )


class TokenManager:
    def __init__(self, root: Path, config_path: Path, server_id: int, account: ObserverAccount):
        self.root = root
        self.config_path = config_path
        self.server_id = server_id
        self.account = account
        self.session_path = root / f".live-observer-session.{account.label}.json"
        self.lock_path = root / f".{account.label}-steam-login.lock"
        self.current: dict[str, Any] | None = None
        self.generation = 0
        self.get_lock = asyncio.Lock()
        self.last_app_version_check = 0.0
        self.observed_app_version: str | None = None

    async def get(self, force: bool = False) -> dict[str, Any]:
        async with self.get_lock:
            session = None
            if not force and self.current and self.current["exp"] - time.time() > 3600:
                session = self.current
            elif not force and self.session_path.exists():
                try:
                    cached = json.loads(self.session_path.read_text(encoding="utf-8"))
                    if cached["exp"] - time.time() > 3600 and cached.get("serverId") == self.server_id:
                        self.current = cached
                        session = cached
                except (OSError, ValueError, KeyError, TypeError):
                    pass

            live_app_version = None
            if session is not None:
                live_app_version = await self._current_app_version()
                session_app_version = session.get("appVersion")
                if live_app_version is None or session_app_version == live_app_version:
                    return session
                log(
                    f"{self.account.label} app version changed "
                    f"{session_app_version or 'unknown'} -> {live_app_version}; refreshing login"
                )

            return await asyncio.to_thread(self._fresh_login, live_app_version)

    def _fetch_current_app_version(self) -> str:
        config = load_config(self.config_path)
        response = requests.get(config["app_version_url"], timeout=20)
        response.raise_for_status()
        app_version = response.text.strip()
        if not app_version:
            raise RuntimeError("app-version endpoint returned an empty response")
        return app_version

    async def _current_app_version(self) -> str | None:
        now = time.monotonic()
        if (
            self.observed_app_version is not None
            and now - self.last_app_version_check < APP_VERSION_CHECK_INTERVAL_SECONDS
        ):
            return self.observed_app_version
        try:
            app_version = await asyncio.to_thread(self._fetch_current_app_version)
        except Exception as exc:
            self.last_app_version_check = now
            log(f"{self.account.label} app-version check failed: {type(exc).__name__}: {exc}")
            return None
        self.observed_app_version = app_version
        self.last_app_version_check = now
        return app_version

    def _fresh_login(self, current_app_version: str | None = None) -> dict[str, Any]:
        self.lock_path.touch(mode=0o600, exist_ok=True)
        with self.lock_path.open("r+") as lock_handle:
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX)
            log(f"refreshing {self.account.steam_name} Steam ticket")
            ticket_result = subprocess.run(
                ["node", "steam_ticket_node/get_ticket.js", self.account.steam_name, "1948800"],
                cwd=self.root,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=240,
            )
            ticket = ticket_result.stdout.strip().splitlines()[-1]
            config = load_config(self.config_path)
            http = requests.Session()
            if current_app_version is None:
                response = http.get(config["app_version_url"], timeout=20)
                response.raise_for_status()
                current_app_version = response.text.strip()
                if not current_app_version:
                    raise RuntimeError("app-version endpoint returned an empty response")
            with tempfile.NamedTemporaryFile(
                "w", prefix=f"yisim-{self.account.label}-", suffix=".ticket", delete=True
            ) as handle:
                handle.write(ticket + "\n")
                handle.flush()
                os.chmod(handle.name, 0o600)
                last_version_error: Exception | None = None
                for offset in range(31):
                    candidate = copy.deepcopy(config)
                    candidate["ticket_file"] = handle.name
                    candidate.pop("ticket_command", None)
                    candidate["device_id"] = ""
                    candidate["device_id_path"] = str(self.root / f".device_id.{self.account.label}")
                    candidate["app_version"] = current_app_version
                    candidate["resource_version"] = bump_patch(str(config["resource_version"]), offset)
                    candidate["game_version"] = bump_patch(str(config["game_version"]), offset, width=4)
                    candidate["login_payload"] = copy.deepcopy(candidate["login_payload"])
                    candidate["login_payload"]["extra"]["serverId"] = self.server_id
                    try:
                        token, response = login(candidate, session=http)
                        break
                    except LoginTokenError as exc:
                        body = exc.response_body if isinstance(exc.response_body, dict) else {}
                        if body.get("code") != 20102:
                            raise
                        last_version_error = exc
                else:
                    raise RuntimeError("all Yi Xian client-version login candidates were rejected") from last_version_error

            data = response.get("data") if isinstance(response, dict) else None
            if not isinstance(data, dict):
                raise RuntimeError(f"login returned no data: {response!r}")
            claims = jwt_payload(token)
            user_info = data.get("userInfo") or {}
            server_urls = data.get("serverUrlInfo") or {}
            result = {
                "token": token,
                "uid": str(user_info.get("uid") or claims.get("uid") or ""),
                "username": str(user_info.get("username") or "Tea Maid 01"),
                "exp": int(claims["exp"]),
                "serverId": self.server_id,
                "appVersion": current_app_version,
                "lobbyServerUrl": str(server_urls["lobbyServerUrl"]),
                "gameServerUrl": str(server_urls["gameServerUrl"]),
                "loginAt": utc_now(),
            }
            temporary = self.session_path.with_suffix(".tmp")
            temporary.write_text(json.dumps(result, ensure_ascii=False) + "\n", encoding="utf-8")
            os.chmod(temporary, 0o600)
            temporary.replace(self.session_path)
            self.current = result
            self.observed_app_version = current_app_version
            self.last_app_version_check = time.monotonic()
            self.generation += 1
            log(
                f"{self.account.steam_name} login succeeded uid={result['uid']} "
                f"tokenHours={(result['exp'] - time.time()) / 3600:.1f}"
            )
            return result


class LobbyConnection:
    def __init__(self, number: int, token_manager: TokenManager):
        self.number = number
        self.token_manager = token_manager
        self.ws = None
        self.token_generation = -1
        self.lock = asyncio.Lock()

    async def close(self) -> None:
        if self.ws is not None:
            try:
                await self.ws.close()
            except Exception:
                pass
        self.ws = None

    async def ensure_connected(self) -> None:
        session = await self.token_manager.get()
        if self.ws is not None and self.token_generation == self.token_manager.generation:
            return
        await self.close()
        base_ws = session["lobbyServerUrl"].rstrip("/")
        base_http = replace_ws_scheme(base_ws, "https")
        response = await asyncio.to_thread(
            requests.get,
            f"{base_http}/connect",
            headers={"Authorization": f"Bearer {session['token']}"},
            timeout=15,
        )
        response.raise_for_status()
        root = response.json()
        reservation = root.get("data") if root.get("code") == 1 else None
        if not isinstance(reservation, dict):
            raise RuntimeError(f"lobby reservation rejected: {root!r}")
        room = reservation["room"]
        uri = f"{base_ws}/{room['processId']}/{room['roomId']}?sessionId={quote(reservation['sessionId'])}"
        self.ws = await websockets.connect(
            uri,
            extra_headers={"Authorization": f"Bearer {session['token']}"},
            open_timeout=15,
            close_timeout=5,
            ping_interval=20,
            ping_timeout=300,
            max_size=None,
        )
        first = await asyncio.wait_for(self.ws.recv(), timeout=15)
        if not isinstance(first, bytes) or not first or first[0] != COLYSEUS_JOIN_ROOM:
            await self.close()
            raise RuntimeError(f"lobby {self.number} unexpected join frame")
        await self.ws.send(bytes([COLYSEUS_JOIN_ROOM]))
        self.token_generation = self.token_manager.generation
        log(f"lobby detail connection {self.number} connected")

    async def fetch_players(self, room_id: str) -> list[Player]:
        async with self.lock:
            try:
                await self.ensure_connected()
                request = protobuf_string(1, room_id)
                await self.ws.send(encode_room_data("FetchLobbyGamePlayersReq", request))
                deadline = asyncio.get_running_loop().time() + 8
                while True:
                    remaining = deadline - asyncio.get_running_loop().time()
                    if remaining <= 0:
                        raise TimeoutError("lobby player response timeout")
                    frame = await asyncio.wait_for(self.ws.recv(), timeout=remaining)
                    if not isinstance(frame, bytes):
                        continue
                    decoded = decode_room_data(frame)
                    if decoded and decoded[0] == "FetchLobbyGamePlayersResp":
                        return parse_lobby_players_response(decoded[1])
                    if frame and frame[0] in (COLYSEUS_ERROR, COLYSEUS_LEAVE_ROOM):
                        raise ConnectionError(f"lobby closed with opcode {frame[0]}")
            except Exception:
                await self.close()
                raise


class RoomDirectory:
    def __init__(
        self,
        token_manager: TokenManager,
        lobby_pool: list[LobbyConnection],
        max_pages: int,
        player_cache_seconds: float,
        sort_type: int,
        max_room_age_seconds: float,
    ):
        self.token_manager = token_manager
        self.lobby_pool = lobby_pool
        self.max_pages = max_pages
        self.player_cache_seconds = player_cache_seconds
        self.sort_type = sort_type
        self.max_room_age_seconds = max_room_age_seconds
        self.player_cache: dict[str, tuple[float, list[Player]]] = {}
        self.http = requests.Session()

    def _fetch_room_pages(self, session: dict[str, Any]) -> list[dict[str, Any]]:
        base_http = replace_ws_scheme(session["gameServerUrl"], "https")
        found: list[dict[str, Any]] = []
        excluded: list[str] = []
        seen: set[str] = set()
        last_sort_value = -1
        cutoff_ms = int(time.time() * 1000 - self.max_room_age_seconds * 1000)
        for _page in range(self.max_pages):
            payload = {
                "gameMode": RANKED_MODE,
                "subMode": 0,
                "status": ROOM_STATUS_IN_BATTLE,
                "sortType": self.sort_type,
                "charId": 0,
                "lastSortValue": last_sort_value,
                "otherParams": [],
                "excludeRoomIds": excluded,
            }
            response = self.http.post(
                f"{base_http}/game/fetchRooms",
                json=payload,
                headers={
                    "Authorization": f"Bearer {session['token']}",
                    "Content-Type": "application/json",
                    "User-Agent": "UnityPlayer/2020.3.49f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
                },
                timeout=ROOM_DIRECTORY_HTTP_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            root = response.json()
            if root.get("code") != 1:
                raise RuntimeError(f"fetchRooms rejected: code={root.get('code')} msg={root.get('msg')!r}")
            raw_page = root.get("data") or []
            if not isinstance(raw_page, list):
                raise RuntimeError("fetchRooms returned non-list data")
            valid_page = [
                room for room in raw_page
                if room.get("name") == "game_room"
                and (room.get("gameInfo") or {}).get("gameMode") == RANKED_MODE
                and room.get("status") == ROOM_STATUS_IN_BATTLE
                and str(room.get("roomId") or "") not in seen
            ]
            page = [
                room for room in valid_page
                if int(room.get("createdTs") or 0) >= cutoff_ms
            ]
            if not page:
                break
            found.extend(page)
            new_ids = [str(room["roomId"]) for room in page]
            seen.update(new_ids)
            excluded.extend(new_ids)
            # Creation-time sorting puts all older rooms after the first old row.
            # Stop there instead of repeatedly fetching player details for games
            # that can no longer pass the admission-age check.
            if len(page) < len(valid_page) or len(raw_page) < 20:
                break
            last_sort_value = int(
                page[-1].get("createdTs") if self.sort_type == 3 else page[-1].get("avgRankScore") or -1
            )
        return found

    async def poll(self) -> list[RoomCandidate]:
        session = await self.token_manager.get()
        room_rows = await asyncio.to_thread(self._fetch_room_pages, session)
        now = time.monotonic()

        async def get_players(index: int, row: dict[str, Any]):
            room_id = str(row["roomId"])
            cached = self.player_cache.get(room_id)
            if cached and now - cached[0] < self.player_cache_seconds:
                return row, cached[1]
            connection = self.lobby_pool[index % len(self.lobby_pool)]
            try:
                players = await connection.fetch_players(room_id)
                self.player_cache[room_id] = (time.monotonic(), players)
                return row, players
            except Exception as exc:
                log(f"room={row.get('roomId')} player-detail fetch failed: {type(exc).__name__}: {exc}")
                return row, cached[1] if cached else []

        results = await asyncio.gather(*(get_players(i, row) for i, row in enumerate(room_rows)))
        candidates: list[RoomCandidate] = []
        for row, players in results:
            candidate = RoomCandidate(
                room_id=str(row["roomId"]),
                process_id=str(row.get("processId") or ""),
                created_ts=int(row.get("createdTs") or 0),
                round=int(row.get("round") or 0),
                avg_rank_score=int(row.get("avgRankScore") or 0),
                players=players,
            )
            if candidate.human_players:
                candidates.append(candidate)
        visible_ids = {str(row["roomId"]) for row in room_rows}
        self.player_cache = {
            room_id: cached for room_id, cached in self.player_cache.items()
            if room_id in visible_ids or now - cached[0] < 120
        }
        candidates.sort(key=lambda room: (room.score, room.avg_rank_score, room.room_id), reverse=True)
        return candidates


class Capture:
    def __init__(self, root: Path, room: RoomCandidate, account: ObserverAccount):
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        directory = root / day
        directory.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        self.path = directory / f"room-{room.room_id}-{account.label}-{stamp}.jsonl"
        self.handle = self.path.open("a", encoding="utf-8", buffering=1)
        self.sequence = 0

    def event(self, event: str, **fields: Any) -> None:
        self.sequence += 1
        record = {
            "sequence": self.sequence,
            "observedAt": utc_now(),
            "monotonicNs": time.monotonic_ns(),
            "event": event,
            **fields,
        }
        self.handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")

    def frame(self, direction: str, raw: bytes) -> None:
        decoded = decode_room_data(raw)
        fields: dict[str, Any] = {
            "direction": direction,
            "bytes": len(raw),
            "rawBase64": base64.b64encode(raw).decode("ascii"),
        }
        if decoded:
            fields["messageType"] = decoded[0]
            fields["protobufBase64"] = base64.b64encode(decoded[1]).decode("ascii")
        self.event("websocket_frame", **fields)

    def close(self) -> None:
        self.handle.close()


@dataclass
class ObserverHandle:
    room: RoomCandidate
    task: asyncio.Task
    started_at: str
    accepted_targets: list[dict[str, Any]] = field(default_factory=list)
    status: str = "joining"
    missing_polls: int = 0


class ObservationManager:
    def __init__(
        self,
        args: argparse.Namespace,
        token_managers: list[TokenManager],
        directory: RoomDirectory,
    ):
        self.args = args
        self.token_managers = token_managers
        self.primary_token_manager = token_managers[0]
        self.directory = directory
        self.active: dict[str, ObserverHandle] = {}
        self.cooldown_until: dict[str, float] = {}
        self.capture_root = args.output_dir
        self.stopping = asyncio.Event()
        self.observable_characters = ObservableCharacterConfig(
            getattr(
                args,
                "observable_characters_file",
                Path("data/live-observer/observable-characters.json"),
            )
        )
        self.restart_requested = False
        self.restart_blocker_signature: str | None = None

    def request_restart(self) -> None:
        if self.restart_requested:
            return
        self.restart_requested = True
        log(
            "deferred restart requested; pausing new room admissions until no "
            "6000+ Lin Xiaoyue observation remains"
        )

    def restart_blockers(self) -> list[dict[str, Any]]:
        blockers = []
        for room_id, handle in sorted(self.active.items()):
            if handle.task.done():
                continue
            if handle.status in {"joining", "requesting"} and not handle.accepted_targets:
                blockers.append({"roomId": room_id, "status": handle.status})
            for accepted in handle.accepted_targets:
                target = accepted.get("target") or {}
                if (
                    int(target.get("charId") or 0) == LIN_XIAOYUE_ID
                    and int(target.get("actualModeScore") or 0)
                    >= HIGH_RATING_LOBBY_THRESHOLD
                ):
                    blockers.append(
                        {
                            "roomId": room_id,
                            "status": handle.status,
                            "uid": target.get("uid"),
                            "username": target.get("username"),
                            "rating": target.get("actualModeScore"),
                        }
                    )
        return blockers

    async def send_frame(self, ws, capture: Capture, raw: bytes) -> None:
        capture.frame("client->server", raw)
        await ws.send(raw)

    async def join_game_room(
        self,
        token_manager: TokenManager,
        room: RoomCandidate,
        capture: Capture,
    ):
        session = await token_manager.get()
        base_ws = session["gameServerUrl"].rstrip("/")
        base_http = replace_ws_scheme(base_ws, "https")
        response = await asyncio.to_thread(
            requests.post,
            f"{base_http}/matchmake/joinById/{quote(room.room_id)}",
            json={},
            headers={"Authorization": f"Bearer {session['token']}"},
            timeout=15,
        )
        response.raise_for_status()
        reservation = response.json()
        if "room" not in reservation or "sessionId" not in reservation:
            raise RuntimeError(f"joinById rejected: {reservation!r}")
        reserved_room = reservation["room"]
        process_id = str(reserved_room["processId"])
        session_id = str(reservation["sessionId"])
        capture.event(
            "seat_reservation",
            account=token_manager.account.label,
            roomId=room.room_id,
            processId=process_id,
            sessionId=session_id,
            room=reserved_room,
        )
        uri = f"{base_ws}/{process_id}/{room.room_id}?sessionId={quote(session_id)}"
        ws = await websockets.connect(
            uri,
            extra_headers={"Authorization": f"Bearer {session['token']}"},
            open_timeout=15,
            close_timeout=5,
            ping_interval=20,
            ping_timeout=300,
            max_size=None,
        )
        first = await asyncio.wait_for(ws.recv(), timeout=15)
        if not isinstance(first, bytes):
            await ws.close()
            raise RuntimeError("game room sent a text join frame")
        capture.frame("server->client", first)
        if not first or first[0] != COLYSEUS_JOIN_ROOM:
            await ws.close()
            raise RuntimeError(f"unexpected game-room join opcode {first[:1].hex()}")
        await self.send_frame(ws, capture, bytes([COLYSEUS_JOIN_ROOM]))
        deadline = asyncio.get_running_loop().time() + 15
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                await ws.close()
                raise TimeoutError("game room state timeout")
            frame = await asyncio.wait_for(ws.recv(), timeout=remaining)
            if not isinstance(frame, bytes):
                continue
            capture.frame("server->client", frame)
            if frame and frame[0] == COLYSEUS_ROOM_STATE:
                return ws, first, frame
            if frame and frame[0] in (COLYSEUS_ERROR, COLYSEUS_LEAVE_ROOM):
                await ws.close()
                raise ConnectionError(f"room closed before initial state, opcode={frame[0]}")

    async def decode_room_profiles(self, join_frame: bytes, state_frame: bytes) -> list[RoomPlayerProfile]:
        command = [
            str(self.args.room_profile_decoder),
            base64.b64encode(join_frame).decode("ascii"),
            base64.b64encode(state_frame).decode("ascii"),
        ]

        def run_decoder() -> list[dict[str, Any]]:
            result = subprocess.run(
                command,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10,
            )
            return json.loads(result.stdout.strip().splitlines()[-1])

        decoded = await asyncio.to_thread(run_decoder)
        return [parse_room_player_profile(player) for player in decoded]

    async def attempt_target(
        self,
        token_manager: TokenManager,
        ws,
        capture: Capture,
        target: RoomPlayerProfile,
    ) -> bool:
        session = await token_manager.get()
        request_pb = (
            protobuf_string(1, session["uid"])
            + protobuf_string(2, target.uid)
            + protobuf_string(3, session["username"])
        )
        await self.send_frame(ws, capture, encode_room_data("RealtimeSpectateReq", request_pb))
        deadline = asyncio.get_running_loop().time() + self.args.auth_timeout
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                capture.event("realtime_spectate_timeout", target=target.as_json())
                return False
            try:
                frame = await asyncio.wait_for(ws.recv(), timeout=remaining)
            except asyncio.TimeoutError:
                capture.event("realtime_spectate_timeout", target=target.as_json())
                return False
            if not isinstance(frame, bytes):
                continue
            capture.frame("server->client", frame)
            decoded = decode_room_data(frame)
            if decoded and decoded[0] == "RealtimeSpectateResp":
                response = parse_realtime_response(decoded[1])
                # The response reverses the client request: senderUid is the observed player.
                if response["senderUid"] != target.uid and response["targetUid"] != target.uid:
                    continue
                capture.event("realtime_spectate_result", target=target.as_json(), response=response)
                return response["result"] == 0
            if frame and frame[0] in (COLYSEUS_ERROR, COLYSEUS_LEAVE_ROOM):
                raise ConnectionError(f"room closed while requesting target, opcode={frame[0]}")

    async def observe_target(
        self,
        handle: ObserverHandle,
        token_manager: TokenManager,
        target: RoomPlayerProfile,
        capture: Capture,
        ws,
    ) -> str:
        room = handle.room
        account = token_manager.account
        capture.event("target_observer_started", account=account.label, target=target.as_json())
        try:
            accepted_record = {"account": account.label, "target": target.as_json()}
            handle.accepted_targets.append(accepted_record)
            handle.status = "observing"
            capture.event("observation_accepted", **accepted_record)
            log(
                f"room={room.room_id} account={account.label} observing={target.username!r} "
                f"uid={target.uid} mode={'dao' if target.is_dao_mindset else 'ranked'} "
                f"rating={target.actual_mode_score} random={target.random_character}"
            )
            await self.send_frame(ws, capture, encode_room_data("SpectateReq", protobuf_string(1, target.uid)))
            await self.send_frame(ws, capture, encode_room_data("SimpleClientPact", GAME_STATUS_REQ))
            next_snapshot = asyncio.get_running_loop().time() + self.args.snapshot_seconds
            while not self.stopping.is_set():
                timeout = max(0.1, next_snapshot - asyncio.get_running_loop().time())
                try:
                    frame = await asyncio.wait_for(ws.recv(), timeout=timeout)
                except asyncio.TimeoutError:
                    await self.send_frame(ws, capture, encode_room_data("SimpleClientPact", GAME_STATUS_REQ))
                    next_snapshot = asyncio.get_running_loop().time() + self.args.snapshot_seconds
                    continue
                if not isinstance(frame, bytes):
                    continue
                capture.frame("server->client", frame)
                if frame and frame[0] in (COLYSEUS_ERROR, COLYSEUS_LEAVE_ROOM):
                    return f"server-opcode-{frame[0]}"
                decoded = decode_room_data(frame)
                if decoded and decoded[0] == "BattleResult":
                    # BattleResult is delivered after the server has resolved the battle.
                    # Match the real client's refresh so that the next shop hand is
                    # captured before the player can act on it.
                    await self.send_frame(
                        ws,
                        capture,
                        encode_room_data("SimpleClientPact", GAME_STATUS_REQ),
                    )
                    capture.event("post_battle_game_status_requested")
            return "stopping"
        except asyncio.CancelledError:
            capture.event("observer_cancelled", account=account.label, target=target.as_json())
            raise
        except Exception as exc:
            capture.event(
                "observer_error",
                account=account.label,
                target=target.as_json(),
                errorType=type(exc).__name__,
                error=str(exc),
            )
            log(
                f"room={room.room_id} account={account.label} target={target.username!r} "
                f"observer failed: {type(exc).__name__}: {exc}"
            )
            return f"error:{type(exc).__name__}"
        finally:
            if ws is not None:
                try:
                    await ws.close()
                except Exception:
                    pass
            capture.event("observer_stopped", account=account.label, status=handle.status)
            capture.close()

    async def observe_room(self, handle: ObserverHandle) -> str:
        room = handle.room
        primary = self.token_managers[0]
        capture = Capture(self.capture_root, room, primary.account)
        ws = None
        observer_tasks: list[asyncio.Task] = []
        free_slots: list[tuple[TokenManager, Capture, Any]] = []
        try:
            room_age = (time.time() * 1000 - room.created_ts) / 1000
            capture.event(
                "room_admission_started",
                roomId=room.room_id,
                createdTs=room.created_ts,
                ageSeconds=room_age,
                round=room.round,
                avgRankScore=room.avg_rank_score,
            )
            if room.created_ts <= 0 or room_age > self.args.max_room_age_seconds or room.round > 1:
                handle.status = "too-old-before-join"
                capture.event("room_too_old", ageSeconds=room_age, round=room.round)
                return "too-old-before-join"

            ws, join_frame, state_frame = await self.join_game_room(primary, room, capture)
            profiles = await self.decode_room_profiles(join_frame, state_frame)
            high_rated_players = sorted(
                (
                    profile
                    for profile in profiles
                    if not profile.is_ai
                    and profile.actual_mode_score >= HIGH_RATING_LOBBY_THRESHOLD
                ),
                key=lambda profile: (profile.actual_mode_score, profile.uid),
                reverse=True,
            )
            targets = prioritized_observation_targets(
                profiles,
                self.args.min_dao_score,
                self.args.min_ranked_score,
                self.observable_characters.character_ids,
            )
            capture.event(
                "room_profiles_decoded",
                players=[profile.as_json() for profile in profiles],
                qualifyingLobbyPlayers=[
                    profile.as_json() for profile in high_rated_players
                ],
                prioritizedTargets=[profile.as_json() for profile in targets],
            )
            if not high_rated_players:
                handle.status = "not-qualifying"
                return "not-qualifying"

            handle.status = "requesting"
            capture.event(
                "room_admitted",
                qualifyingLobbyPlayers=[
                    profile.as_json() for profile in high_rated_players
                ],
                prioritizedTargets=[profile.as_json() for profile in targets],
            )
            slot_count = min(
                self.args.max_targets_per_room,
                len(self.token_managers),
                len(targets),
            )
            free_slots.append((primary, capture, ws))
            capture = None
            ws = None

            async def open_slot(token_manager: TokenManager):
                account_capture = Capture(self.capture_root, room, token_manager.account)
                try:
                    account_ws, _join_frame, _state_frame = await self.join_game_room(
                        token_manager, room, account_capture
                    )
                    return token_manager, account_capture, account_ws
                except Exception as exc:
                    account_capture.event(
                        "observer_slot_open_failed",
                        account=token_manager.account.label,
                        errorType=type(exc).__name__,
                        error=str(exc),
                    )
                    account_capture.close()
                    log(
                        f"room={room.room_id} account={token_manager.account.label} "
                        f"slot open failed: {type(exc).__name__}: {exc}"
                    )
                    return None

            opened = await asyncio.gather(
                *(open_slot(manager) for manager in self.token_managers[1:slot_count])
            )
            free_slots.extend(slot for slot in opened if slot is not None)

            target_index = 0
            allocation_round = 0
            while free_slots and target_index < len(targets):
                allocation_round += 1
                assignment_count = min(len(free_slots), len(targets) - target_index)
                assigned_slots = free_slots[:assignment_count]
                unassigned_slots = free_slots[assignment_count:]
                assigned_targets = targets[target_index : target_index + assignment_count]
                target_index += assignment_count

                for (token_manager, account_capture, _account_ws), target in zip(
                    assigned_slots, assigned_targets
                ):
                    account_capture.event(
                        "realtime_spectate_attempt",
                        allocationRound=allocation_round,
                        account=token_manager.account.label,
                        target=target.as_json(),
                    )
                results = await asyncio.gather(
                    *(
                        self.attempt_target(token_manager, account_ws, account_capture, target)
                        for (token_manager, account_capture, account_ws), target in zip(
                            assigned_slots, assigned_targets
                        )
                    ),
                    return_exceptions=True,
                )

                rejected_slots = []
                for slot, target, result in zip(assigned_slots, assigned_targets, results):
                    token_manager, account_capture, account_ws = slot
                    if result is True:
                        observer_tasks.append(
                            asyncio.create_task(
                                self.observe_target(
                                    handle,
                                    token_manager,
                                    target,
                                    account_capture,
                                    account_ws,
                                ),
                                name=f"observe-{room.room_id}-{token_manager.account.label}",
                            )
                        )
                    elif isinstance(result, Exception):
                        account_capture.event(
                            "realtime_spectate_error",
                            allocationRound=allocation_round,
                            account=token_manager.account.label,
                            target=target.as_json(),
                            errorType=type(result).__name__,
                            error=str(result),
                        )
                        await account_ws.close()
                        account_capture.close()
                    else:
                        account_capture.event(
                            "realtime_spectate_rejected",
                            allocationRound=allocation_round,
                            account=token_manager.account.label,
                            target=target.as_json(),
                        )
                        rejected_slots.append(slot)
                free_slots = rejected_slots + unassigned_slots

            for token_manager, account_capture, account_ws in free_slots:
                account_capture.event(
                    "no_remaining_target_accepted",
                    account=token_manager.account.label,
                )
                await account_ws.close()
                account_capture.close()
            free_slots = []

            if not observer_tasks:
                handle.status = "no-target-accepted"
                return "no-target-accepted"
            results = await asyncio.gather(*observer_tasks)
            return "targets-ended:" + ",".join(results)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            if capture is not None:
                capture.event("room_admission_error", errorType=type(exc).__name__, error=str(exc))
            log(f"room={room.room_id} admission failed: {type(exc).__name__}: {exc}")
            return f"error:{type(exc).__name__}"
        finally:
            for task in observer_tasks:
                if not task.done():
                    task.cancel()
            if observer_tasks:
                await asyncio.gather(*observer_tasks, return_exceptions=True)
            for _token_manager, account_capture, account_ws in free_slots:
                try:
                    await account_ws.close()
                except Exception:
                    pass
                account_capture.close()
            if ws is not None:
                try:
                    await ws.close()
                except Exception:
                    pass
            if capture is not None:
                capture.event("room_admission_stopped", status=handle.status)
                capture.close()

    def start_observer(self, room: RoomCandidate) -> None:
        placeholder = ObserverHandle(room=room, task=None, started_at=utc_now())  # type: ignore[arg-type]
        task = asyncio.create_task(self.observe_room(placeholder), name=f"observe-{room.room_id}")
        placeholder.task = task
        self.active[room.room_id] = placeholder
        top = room.human_players[0]
        log(
            f"room={room.room_id} selected topHuman={top.username!r} "
            f"listedRating={top.rank_score} round={room.round}"
        )

    def reap(self) -> None:
        for room_id, handle in list(self.active.items()):
            if not handle.task.done():
                continue
            try:
                reason = handle.task.result()
            except asyncio.CancelledError:
                reason = "cancelled"
            except Exception as exc:
                reason = f"error:{type(exc).__name__}"
            log(f"room={room_id} observer ended reason={reason}")
            self.active.pop(room_id, None)
            self.cooldown_until[room_id] = time.monotonic() + (60 if reason == "no-target-accepted" else 12)

    def write_status(self, candidates: list[RoomCandidate], poll_error: str | None = None) -> None:
        status = {
            "updatedAt": utc_now(),
            "pollSeconds": self.args.poll_seconds,
            "roomLimit": self.args.room_limit,
            "maxRoomAgeSeconds": self.args.max_room_age_seconds,
            "minDaoScore": self.args.min_dao_score,
            "minRankedScore": self.args.min_ranked_score,
            "maxTargetsPerRoom": self.args.max_targets_per_room,
            "observableCharactersFile": str(self.observable_characters.path),
            "observableCharacterIds": sorted(self.observable_characters.character_ids),
            "restartRequested": self.restart_requested,
            "restartBlockers": self.restart_blockers() if self.restart_requested else [],
            "observerAccounts": [manager.account.label for manager in self.token_managers],
            "pollError": poll_error,
            "active": [
                {
                    "roomId": room_id,
                    "status": handle.status,
                    "startedAt": handle.started_at,
                    "selectedFor": (
                        handle.room.human_players[0].as_json()
                        if handle.room.human_players
                        else None
                    ),
                    "observedTargets": handle.accepted_targets,
                }
                for room_id, handle in sorted(self.active.items())
            ],
            "candidates": [
                {
                    "roomId": room.room_id,
                    "createdTs": room.created_ts,
                    "ageSeconds": max(0.0, (time.time() * 1000 - room.created_ts) / 1000),
                    "round": room.round,
                    "avgRankScore": room.avg_rank_score,
                    "topHuman": room.human_players[0].as_json(),
                    "topLin": room.lin_humans[0].as_json() if room.lin_humans else None,
                    "humanCount": len(room.human_players),
                }
                for room in candidates
            ],
        }
        self.args.status_file.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.args.status_file.with_suffix(".tmp")
        temporary.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(self.args.status_file)

    async def run(self) -> None:
        started = time.monotonic()
        candidates: list[RoomCandidate] = []
        while not self.stopping.is_set():
            cycle_start = time.monotonic()
            self.reap()
            self.observable_characters.reload()
            poll_error = None
            if self.restart_requested:
                blockers = self.restart_blockers()
                blocker_signature = json.dumps(blockers, ensure_ascii=False, sort_keys=True)
                if blocker_signature != self.restart_blocker_signature:
                    self.restart_blocker_signature = blocker_signature
                    log(f"deferred restart blockers={blocker_signature}")
                if not blockers:
                    log("deferred restart is safe; exiting for systemd restart")
                    self.stopping.set()
            else:
                try:
                    candidates = await self.directory.poll()
                    now = time.monotonic()
                    for room in candidates:
                        if self.args.room_limit and len(self.active) >= self.args.room_limit:
                            break
                        room_age = (time.time() * 1000 - room.created_ts) / 1000
                        if (
                            room.created_ts <= 0
                            or room_age > self.args.max_room_age_seconds
                            or room.round > 1
                        ):
                            continue
                        if room.room_id in self.active or self.cooldown_until.get(room.room_id, 0) > now:
                            continue
                        self.start_observer(room)
                    summary = ", ".join(
                        f"{room.human_players[0].username}:{room.score}@{room.room_id}"
                        for room in candidates[:5]
                    )
                    log(f"poll roomsWithHumans={len(candidates)} active={len(self.active)} top=[{summary}]")
                except Exception as exc:
                    poll_error = f"{type(exc).__name__}: {exc}"
                    log(f"poll failed: {poll_error}")
                    if "401" in str(exc):
                        try:
                            await self.primary_token_manager.get(force=True)
                        except Exception as login_exc:
                            log(f"forced relogin failed: {type(login_exc).__name__}: {login_exc}")
            self.write_status(candidates, poll_error)
            if self.args.once:
                break
            if self.args.run_seconds and time.monotonic() - started >= self.args.run_seconds:
                break
            wait = max(0.0, self.args.poll_seconds - (time.monotonic() - cycle_start))
            try:
                await asyncio.wait_for(self.stopping.wait(), timeout=wait)
            except asyncio.TimeoutError:
                pass

        self.stopping.set()
        for handle in self.active.values():
            handle.task.cancel()
        await asyncio.gather(*(handle.task for handle in self.active.values()), return_exceptions=True)
        for connection in self.directory.lobby_pool:
            await connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path("config.json"))
    parser.add_argument("--server-id", type=int, default=2)
    parser.add_argument("--poll-seconds", type=float, default=4.0)
    parser.add_argument(
        "--room-limit",
        type=int,
        default=0,
        help="maximum simultaneously tracked rooms; zero means unlimited",
    )
    parser.add_argument(
        "--max-room-age-seconds",
        type=float,
        default=20.0,
        help="only begin observing a round-1 room this many seconds after its server creation time",
    )
    parser.add_argument("--lobby-connections", type=int, default=4)
    parser.add_argument("--max-pages", type=int, default=10)
    parser.add_argument(
        "--sort-type",
        type=int,
        default=3,
        help="fetchRooms sort type; 3 is newest creation time first",
    )
    parser.add_argument("--player-cache-seconds", type=float, default=20.0)
    parser.add_argument("--min-dao-score", type=int, default=4000)
    parser.add_argument("--min-ranked-score", type=int, default=3000)
    parser.add_argument("--max-targets-per-room", type=int, default=4)
    parser.add_argument(
        "--steam-accounts",
        default="sharpobject_tea_01,sharpobject_tea_03,sharpobject_tea_04,sharpobject_tea_05",
    )
    parser.add_argument(
        "--room-profile-decoder",
        type=Path,
        default=Path("room_profile_decoder/bin/Release/net8.0/room_profile_decoder"),
    )
    parser.add_argument("--auth-timeout", type=float, default=11.0)
    parser.add_argument("--snapshot-seconds", type=float, default=60.0)
    parser.add_argument("--output-dir", type=Path, default=Path("data/live-observer/traffic"))
    parser.add_argument("--status-file", type=Path, default=Path("data/live-observer/status.json"))
    parser.add_argument(
        "--observable-characters-file",
        type=Path,
        default=Path("data/live-observer/observable-characters.json"),
        help="hot-reloaded JSON array/object containing observable character IDs",
    )
    parser.add_argument("--once", action="store_true", help="poll once without waiting for observer tasks")
    parser.add_argument("--run-seconds", type=float, default=0)
    args = parser.parse_args()
    if (
        args.room_limit < 0
        or args.lobby_connections < 1
        or args.poll_seconds <= 0
        or args.max_room_age_seconds < 0
        or args.min_dao_score < 0
        or args.min_ranked_score < 0
        or args.max_targets_per_room < 1
    ):
        parser.error(
            "room-limit and score/age thresholds must be non-negative; "
            "lobby-connections, poll-seconds, and max-targets-per-room must be positive"
        )
    account_names = [name.strip() for name in args.steam_accounts.split(",") if name.strip()]
    if len(account_names) < args.max_targets_per_room:
        parser.error("steam-accounts must contain at least max-targets-per-room accounts")
    args.observer_accounts = [
        ObserverAccount(steam_name=name, label=f"tea{name.rsplit('_', 1)[-1]}")
        for name in account_names
    ]
    return args


async def main() -> None:
    args = parse_args()
    root = Path.cwd()
    token_managers = [
        TokenManager(root, args.config, args.server_id, account)
        for account in args.observer_accounts
    ]
    primary_token_manager = token_managers[0]
    lobby_pool = [
        LobbyConnection(i + 1, primary_token_manager)
        for i in range(args.lobby_connections)
    ]
    directory = RoomDirectory(
        primary_token_manager,
        lobby_pool,
        args.max_pages,
        args.player_cache_seconds,
        args.sort_type,
        args.max_room_age_seconds,
    )
    manager = ObservationManager(args, token_managers, directory)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, manager.stopping.set)
    loop.add_signal_handler(signal.SIGUSR1, manager.request_restart)
    await manager.run()


if __name__ == "__main__":
    asyncio.run(main())
