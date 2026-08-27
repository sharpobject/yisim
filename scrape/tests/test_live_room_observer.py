import asyncio
import copy
import json
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import live_room_observer as observer


class FakeCapture:
    instances = []

    def __init__(self, _root, room, account):
        self.room = room
        self.account = account
        self.events = []
        self.closed = False
        self.instances.append(self)

    def event(self, event, **fields):
        self.events.append((event, fields))

    def frame(self, _direction, _raw):
        pass

    def close(self):
        self.closed = True


class FakeWebSocket:
    def __init__(self, account):
        self.account = account
        self.closed = False

    async def close(self):
        self.closed = True


class FakeTokenManager:
    def __init__(self, label):
        self.account = observer.ObserverAccount(f"sharpobject_{label}", label)


class FakeHttpResponse:
    def __init__(self, rows):
        self.rows = rows

    def raise_for_status(self):
        pass

    def json(self):
        return {"code": 1, "data": self.rows}


class FakeRoomDirectoryHttp:
    def __init__(self, pages):
        self.pages = list(pages)
        self.calls = []

    def post(self, url, **kwargs):
        self.calls.append((url, copy.deepcopy(kwargs)))
        return FakeHttpResponse(self.pages.pop(0))


class RoomDirectoryRequestTest(unittest.TestCase):
    def test_fetches_plain_json_and_advances_creation_time_pages(self):
        now = int(time.time() * 1000)

        def room(index):
            return {
                "roomId": f"room-{index}",
                "name": "game_room",
                "status": observer.ROOM_STATUS_IN_BATTLE,
                "createdTs": now - index,
                "avgRankScore": 3000 + index,
                "gameInfo": {"gameMode": observer.RANKED_MODE},
            }

        first_page = [room(index) for index in range(20)]
        second_page = [room(20)]
        directory = observer.RoomDirectory(
            SimpleNamespace(), [], max_pages=10, player_cache_seconds=20,
            sort_type=3, max_room_age_seconds=20,
        )
        directory.http = FakeRoomDirectoryHttp([first_page, second_page])

        result = directory._fetch_room_pages(
            {"gameServerUrl": "wss://example.invalid/game-server", "token": "token"}
        )

        self.assertEqual([row["roomId"] for row in result], [f"room-{i}" for i in range(21)])
        self.assertEqual(len(directory.http.calls), 2)
        first_url, first_call = directory.http.calls[0]
        _second_url, second_call = directory.http.calls[1]
        self.assertEqual(first_url, "https://example.invalid/game-server/game/fetchRooms")
        self.assertNotIn("data", first_call)
        self.assertEqual(first_call["headers"]["Content-Type"], "application/json")
        self.assertNotIn("Hash", first_call["headers"])
        self.assertEqual(first_call["json"]["lastSortValue"], -1)
        self.assertEqual(first_call["json"]["charId"], 0)
        self.assertEqual(second_call["json"]["lastSortValue"], first_page[-1]["createdTs"])
        self.assertEqual(second_call["json"]["excludeRoomIds"], [
            row["roomId"] for row in first_page
        ])


class TokenManagerVersionRefreshTest(unittest.IsolatedAsyncioTestCase):
    def make_manager(self):
        account = observer.ObserverAccount("sharpobject_version_test", "version-test")
        manager = observer.TokenManager(Path("/tmp"), Path("unused-config.json"), 2, account)
        manager.current = {
            "token": "cached-token",
            "exp": int(time.time()) + 7200,
            "serverId": 2,
            "appVersion": "1.7.2",
        }
        return manager

    async def test_reuses_current_session_when_app_version_is_unchanged(self):
        manager = self.make_manager()
        with (
            patch.object(manager, "_fetch_current_app_version", return_value="1.7.2") as check,
            patch.object(manager, "_fresh_login") as fresh_login,
        ):
            first = await manager.get()
            second = await manager.get()

        self.assertIs(first, manager.current)
        self.assertIs(second, manager.current)
        check.assert_called_once_with()
        fresh_login.assert_not_called()

    async def test_refreshes_current_session_when_app_version_changes(self):
        manager = self.make_manager()
        replacement = {
            "token": "new-token",
            "exp": int(time.time()) + 7200,
            "serverId": 2,
            "appVersion": "1.7.3",
        }
        with (
            patch.object(manager, "_fetch_current_app_version", return_value="1.7.3"),
            patch.object(manager, "_fresh_login", return_value=replacement) as fresh_login,
        ):
            result = await manager.get()

        self.assertIs(result, replacement)
        fresh_login.assert_called_once_with("1.7.3")

    async def test_keeps_valid_session_when_version_endpoint_is_unavailable(self):
        manager = self.make_manager()
        with (
            patch.object(manager, "_fetch_current_app_version", side_effect=RuntimeError("offline")),
            patch.object(manager, "_fresh_login") as fresh_login,
        ):
            result = await manager.get()

        self.assertIs(result, manager.current)
        fresh_login.assert_not_called()


class ObservableCharacterConfigTest(unittest.TestCase):
    def test_hot_reload_changes_the_allowlist_and_preserves_last_valid_value(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "characters.json"
            path.write_text(json.dumps({"characterIds": [observer.LIN_XIAOYUE_ID]}))
            config = observer.ObservableCharacterConfig(path)
            self.assertEqual(config.character_ids, {observer.LIN_XIAOYUE_ID})

            path.write_text(json.dumps({"characterIds": [2_000_001, 3_000_002]}))
            self.assertTrue(config.reload())
            self.assertEqual(config.character_ids, {2_000_001, 3_000_002})

            path.write_text("not json")
            self.assertFalse(config.reload())
            self.assertEqual(config.character_ids, {2_000_001, 3_000_002})


class ConcurrentAllocatorTest(unittest.IsolatedAsyncioTestCase):
    def test_priority_and_room_qualification_use_actual_mode_fields(self):
        def profile(uid, *, dao, random, rank_score, dao_score):
            return observer.RoomPlayerProfile(
                uid=uid,
                username=uid,
                char_id=observer.LIN_XIAOYUE_ID,
                is_ai=False,
                is_dao_mindset=dao,
                random_character=random,
                rank_score=rank_score,
                dao_score=dao_score,
            )

        profiles = [
            profile("dao-5000", dao=True, random=False, rank_score=100, dao_score=5000),
            profile("regular-10000", dao=False, random=False, rank_score=10000, dao_score=0),
            profile("random-dao-12000", dao=True, random=True, rank_score=1, dao_score=12000),
            profile("dao-8000", dao=True, random=False, rank_score=200, dao_score=8000),
            profile("dao-zero", dao=True, random=False, rank_score=0, dao_score=0),
            profile("regular-6000", dao=False, random=False, rank_score=6000, dao_score=0),
            profile("regular-2999", dao=False, random=False, rank_score=2999, dao_score=0),
            profile("random-ranked-11000", dao=False, random=True, rank_score=11000, dao_score=0),
        ]
        ordered = sorted(profiles, key=lambda item: item.selection_priority, reverse=True)
        self.assertEqual(
            [item.uid for item in ordered],
            [
                "dao-8000",
                "dao-5000",
                "dao-zero",
                "regular-10000",
                "regular-6000",
                "regular-2999",
                "random-dao-12000",
                "random-ranked-11000",
            ],
        )
        self.assertEqual(
            [item.uid for item in profiles if item.qualifies_capture(0, 3000)],
            [
                "dao-5000",
                "regular-10000",
                "random-dao-12000",
                "dao-8000",
                "dao-zero",
                "regular-6000",
                "random-ranked-11000",
            ],
        )


    def test_queued_rating_and_allowlisted_target_priority(self):
        def profile(
            uid,
            *,
            char_id,
            dao,
            random=False,
            rank_score=0,
            dao_score=0,
            is_ai=False,
        ):
            return observer.RoomPlayerProfile(
                uid=uid,
                username=uid,
                char_id=char_id,
                is_ai=is_ai,
                is_dao_mindset=dao,
                random_character=random,
                rank_score=rank_score,
                dao_score=dao_score,
            )

        profiles = [
            profile(
                "qualified-ranked-lin",
                char_id=observer.LIN_XIAOYUE_ID,
                dao=False,
                rank_score=3100,
                dao_score=9000,
            ),
            profile(
                "qualified-dao-lin",
                char_id=observer.LIN_XIAOYUE_ID,
                dao=True,
                rank_score=9000,
                dao_score=200,
            ),
            profile(
                "unqualified-ranked-lin",
                char_id=observer.LIN_XIAOYUE_ID,
                dao=False,
                rank_score=2999,
            ),
            profile(
                "random-dao-non-lin",
                char_id=2_000_001,
                dao=True,
                random=True,
                rank_score=3000,
                dao_score=6200,
            ),
            profile(
                "ranked-non-lin",
                char_id=3_000_001,
                dao=False,
                rank_score=6100,
                dao_score=9500,
            ),
            profile(
                "lower-non-lin",
                char_id=4_000_001,
                dao=False,
                rank_score=5000,
            ),
            profile(
                "high-bot",
                char_id=4_000_002,
                dao=False,
                rank_score=9999,
                is_ai=True,
            ),
        ]

        self.assertEqual(
            {profile.uid: profile.actual_mode_score for profile in profiles},
            {
                "qualified-ranked-lin": 3100,
                "qualified-dao-lin": 200,
                "unqualified-ranked-lin": 2999,
                "random-dao-non-lin": 6200,
                "ranked-non-lin": 6100,
                "lower-non-lin": 5000,
                "high-bot": 9999,
            },
        )
        high_rated_humans = [
            profile.uid
            for profile in profiles
            if not profile.is_ai
            and profile.actual_mode_score >= observer.HIGH_RATING_LOBBY_THRESHOLD
        ]
        self.assertEqual(
            high_rated_humans,
            ["random-dao-non-lin", "ranked-non-lin"],
        )
        targets = observer.prioritized_observation_targets(profiles, 0, 3000)
        self.assertEqual(
            [profile.uid for profile in targets],
            [
                "qualified-dao-lin",
                "qualified-ranked-lin",
            ],
        )
        targets_with_fallbacks = observer.prioritized_observation_targets(
            profiles,
            0,
            3000,
            frozenset({
                observer.LIN_XIAOYUE_ID,
                2_000_001,
                3_000_001,
                4_000_001,
            }),
        )
        self.assertEqual(
            [profile.uid for profile in targets_with_fallbacks],
            [
                "qualified-dao-lin",
                "qualified-ranked-lin",
                "random-dao-non-lin",
                "ranked-non-lin",
                "lower-non-lin",
            ],
        )

    def test_reload_restart_waits_only_for_joining_rooms_and_6000_plus_lin(self):
        args = SimpleNamespace(output_dir=Path("/tmp/unused-live-observer-test"))
        manager = observer.ObservationManager(
            args,
            [FakeTokenManager("tea01")],
            SimpleNamespace(),
        )

        def handle(room_id, *, status="observing", targets=()):
            room = observer.RoomCandidate(room_id, "process", 1, 1, 7000, [])
            return observer.ObserverHandle(
                room=room,
                task=SimpleNamespace(done=lambda: False),
                started_at=observer.utc_now(),
                status=status,
                accepted_targets=[{"account": "tea01", "target": target} for target in targets],
            )

        non_lin = {"uid": "other", "charId": 2_000_001, "actualModeScore": 9000}
        low_lin = {"uid": "low", "charId": observer.LIN_XIAOYUE_ID, "actualModeScore": 5999}
        high_lin = {
            "uid": "high",
            "username": "high cat",
            "charId": observer.LIN_XIAOYUE_ID,
            "actualModeScore": 6000,
        }
        manager.active = {"known": handle("known", targets=(non_lin, low_lin))}
        self.assertEqual(manager.restart_blockers(), [])

        manager.active["joining"] = handle("joining", status="joining")
        self.assertEqual(manager.restart_blockers(), [{"roomId": "joining", "status": "joining"}])

        manager.active.pop("joining")
        manager.active["high"] = handle("high", targets=(high_lin,))
        self.assertEqual(manager.restart_blockers(), [{
            "roomId": "high",
            "status": "observing",
            "uid": "high",
            "username": "high cat",
            "rating": 6000,
        }])

    async def test_top_four_are_concurrent_and_rejection_backfills_fifth(self):
        args = SimpleNamespace(
            output_dir=Path("/tmp/unused-live-observer-test"),
            max_room_age_seconds=10.0,
            min_dao_score=0,
            min_ranked_score=3000,
            max_targets_per_room=4,
            auth_timeout=1.0,
            snapshot_seconds=60.0,
        )
        managers = [FakeTokenManager(label) for label in ("tea01", "tea03", "tea04", "tea05")]
        manager = observer.ObservationManager(args, managers, SimpleNamespace())
        room = observer.RoomCandidate(
            room_id="test-room",
            process_id="process",
            created_ts=int(time.time() * 1000),
            round=1,
            avg_rank_score=7000,
            players=[],
        )
        handle = observer.ObserverHandle(room=room, task=None, started_at=observer.utc_now())
        profiles = [
            observer.RoomPlayerProfile(
                uid=f"p{index}",
                username=f"player-{index}",
                char_id=observer.LIN_XIAOYUE_ID,
                is_ai=False,
                is_dao_mindset=True,
                random_character=False,
                rank_score=9000 - index,
                dao_score=9000 - index,
            )
            for index in range(5)
        ]
        attempts = []
        observed = []

        async def fake_join(token_manager, _room, _capture):
            return FakeWebSocket(token_manager.account.label), b"join", b"state"

        async def fake_decode(_join_frame, _state_frame):
            return profiles

        async def fake_attempt(token_manager, _ws, _capture, target):
            attempts.append((token_manager.account.label, target.uid, time.monotonic()))
            await asyncio.sleep(0.03)
            return target.uid != "p0"

        async def fake_observe(_handle, token_manager, target, capture, ws):
            observed.append((token_manager.account.label, target.uid))
            await ws.close()
            capture.close()
            return "done"

        manager.join_game_room = fake_join
        manager.decode_room_profiles = fake_decode
        manager.attempt_target = fake_attempt
        manager.observe_target = fake_observe
        FakeCapture.instances = []
        with patch.object(observer, "Capture", FakeCapture):
            result = await manager.observe_room(handle)

        self.assertEqual(result, "targets-ended:done,done,done,done")
        self.assertEqual(
            [(account, uid) for account, uid, _started in attempts],
            [
                ("tea01", "p0"),
                ("tea03", "p1"),
                ("tea04", "p2"),
                ("tea05", "p3"),
                ("tea01", "p4"),
            ],
        )
        first_round_times = [started for _account, _uid, started in attempts[:4]]
        self.assertLess(max(first_round_times) - min(first_round_times), 0.01)
        self.assertEqual(
            sorted(observed),
            sorted([("tea03", "p1"), ("tea04", "p2"), ("tea05", "p3"), ("tea01", "p4")]),
        )
        self.assertTrue(all(capture.closed for capture in FakeCapture.instances))

    async def test_rejection_without_fallback_closes_the_room_socket(self):
        args = SimpleNamespace(
            output_dir=Path("/tmp/unused-live-observer-test"),
            max_room_age_seconds=10.0,
            min_dao_score=0,
            min_ranked_score=3000,
            max_targets_per_room=4,
            auth_timeout=1.0,
            snapshot_seconds=60.0,
        )
        token_manager = FakeTokenManager("tea01")
        manager = observer.ObservationManager(args, [token_manager], SimpleNamespace())
        room = observer.RoomCandidate(
            room_id="rejected-room",
            process_id="process",
            created_ts=int(time.time() * 1000),
            round=1,
            avg_rank_score=7000,
            players=[],
        )
        handle = observer.ObserverHandle(room=room, task=None, started_at=observer.utc_now())
        target = observer.RoomPlayerProfile(
            uid="denied-player",
            username="denied-player",
            char_id=observer.LIN_XIAOYUE_ID,
            is_ai=False,
            is_dao_mindset=True,
            random_character=False,
            rank_score=7000,
            dao_score=7000,
        )
        socket = FakeWebSocket("tea01")

        async def fake_join(_token_manager, _room, _capture):
            return socket, b"join", b"state"

        async def fake_decode(_join_frame, _state_frame):
            return [target]

        async def fake_attempt(_token_manager, _ws, _capture, _target):
            return False

        manager.join_game_room = fake_join
        manager.decode_room_profiles = fake_decode
        manager.attempt_target = fake_attempt
        FakeCapture.instances = []
        with patch.object(observer, "Capture", FakeCapture):
            result = await manager.observe_room(handle)

        self.assertEqual(result, "no-target-accepted")
        self.assertTrue(socket.closed)
        self.assertEqual(handle.accepted_targets, [])
        self.assertTrue(all(capture.closed for capture in FakeCapture.instances))


if __name__ == "__main__":
    unittest.main()
