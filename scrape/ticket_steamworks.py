#!/usr/bin/env python3
import base64
import sys
import time


APP_ID = 1948800


def main() -> int:
    try:
        from steamworks import STEAMWORKS
    except ImportError:
        print(
            "Install a compatible Python Steamworks wrapper, or set "
            "ticket_command to another ticket provider.",
            file=sys.stderr,
        )
        return 2

    steam = STEAMWORKS(APP_ID)
    if not steam.initialize():
        print("Steamworks initialization failed. Is Steam running and logged in?", file=sys.stderr)
        return 1

    users = getattr(steam, "Users", None) or getattr(steam, "users", None)
    if users is None:
        print("Steamworks wrapper does not expose a Users API.", file=sys.stderr)
        return 1

    method = getattr(users, "GetAuthSessionTicket", None) or getattr(
        users, "get_auth_session_ticket", None
    )
    if method is None:
        print("Steamworks wrapper does not expose GetAuthSessionTicket().", file=sys.stderr)
        return 1

    result = method()
    ticket = result
    if isinstance(result, tuple):
        ticket = result[0]
    if isinstance(ticket, str):
        ticket = bytes.fromhex(ticket)
    if not isinstance(ticket, bytes):
        print(f"Unexpected ticket type from Steamworks wrapper: {type(ticket)!r}", file=sys.stderr)
        return 1

    # Give wrappers that dispatch callbacks on a background thread a brief window.
    time.sleep(0.2)
    print(base64.b64encode(ticket).decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

