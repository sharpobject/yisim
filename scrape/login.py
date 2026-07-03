#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import requests

import xxtea


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def make_hash_key() -> str:
    timestamp_ms = str(int(time.time() * 1000))
    return hashlib.md5(timestamp_ms.encode("ascii")).hexdigest()


def get_device_id(config: dict[str, Any]) -> str:
    configured = config.get("device_id")
    if configured:
        return configured

    path = Path(config.get("device_id_path", ".device_id"))
    if path.exists():
        return path.read_text(encoding="utf-8").strip()

    device_id = str(uuid.uuid4()).upper()
    path.write_text(device_id + "\n", encoding="utf-8")
    return device_id


def read_ticket(config: dict[str, Any]) -> str:
    ticket_file = config.get("ticket_file")
    if ticket_file:
        return Path(ticket_file).read_text(encoding="utf-8").strip()

    command = config.get("ticket_command")
    if not command:
        raise ValueError("config needs ticket_file or ticket_command")

    completed = subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return completed.stdout.strip().splitlines()[-1]


def replace_placeholders(value: Any, replacements: dict[str, str]) -> Any:
    if isinstance(value, str):
        for key, replacement in replacements.items():
            value = value.replace("{" + key + "}", replacement)
        return value
    if isinstance(value, list):
        return [replace_placeholders(item, replacements) for item in value]
    if isinstance(value, dict):
        return {key: replace_placeholders(item, replacements) for key, item in value.items()}
    return value


def extract_path(value: Any, path: list[str]) -> Any:
    current = value
    for part in path:
        current = current[part]
    return current


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path("config.json"))
    parser.add_argument("--print-request-json", action="store_true")
    args = parser.parse_args()

    config = load_config(args.config)
    ticket_b64 = read_ticket(config)
    payload = replace_placeholders(
        config["login_payload"],
        {
            "ticket_b64": ticket_b64,
            "device_id": get_device_id(config),
            "version": config.get("version", ""),
            "app_version": config.get("app_version", ""),
            "resource_version": config.get("resource_version", ""),
            "game_version": config.get("game_version", ""),
        },
    )
    request_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    hash_key = make_hash_key()
    encrypted = base64.b64encode(xxtea.encrypt(request_json, hash_key.encode("utf-8")))

    if args.print_request_json:
        print(request_json.decode("utf-8"))
        return 0

    headers = {
        "Content-Type": "application/octet-stream",
        "Hash": hash_key,
    }
    headers.update(config.get("headers", {}))
    response = requests.post(
        config["login_url"],
        data=encrypted,
        headers=headers,
        timeout=config.get("timeout_seconds", 20),
    )
    response.raise_for_status()

    try:
        response_body = response.json()
    except requests.JSONDecodeError:
        response_body = json.loads(response.text)

    try:
        token = extract_path(response_body, config.get("token_json_path", ["access_token"]))
    except (KeyError, TypeError) as exc:
        diagnostic_path = Path(config.get("login_response_debug_path", ".login_response.json"))
        diagnostic_path.write_text(
            json.dumps(response_body, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        code = response_body.get("code") if isinstance(response_body, dict) else None
        message = response_body.get("message") if isinstance(response_body, dict) else None
        msg = response_body.get("msg") if isinstance(response_body, dict) else None
        raise KeyError(
            f"token path missing at {exc}; wrote response to {diagnostic_path}; "
            f"code={code!r} message={message!r} msg={msg!r}"
        ) from exc
    output_path = Path(config.get("token_output_path", ".access_token"))
    output_path.write_text(str(token) + "\n", encoding="utf-8")
    print(f"wrote token to {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
