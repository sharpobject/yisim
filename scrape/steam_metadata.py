#!/usr/bin/env python3
import json
import sys
from urllib.request import urlopen


APP_ID = 1948800


def main() -> int:
    url = f"https://store.steampowered.com/api/appdetails?appids={APP_ID}"
    with urlopen(url, timeout=20) as response:
        data = json.load(response)

    app = data.get(str(APP_ID), {})
    details = app.get("data", {})
    summary = {
        "app_id": APP_ID,
        "success": app.get("success"),
        "name": details.get("name"),
        "type": details.get("type"),
        "is_free": details.get("is_free"),
        "developers": details.get("developers"),
        "publishers": details.get("publishers"),
        "release_date": details.get("release_date"),
    }
    json.dump(summary, sys.stdout, indent=2, ensure_ascii=False)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

