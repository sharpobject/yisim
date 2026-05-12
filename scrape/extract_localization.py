#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import UnityPy


UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"

VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
DEFAULT_BUNDLE_DIR = ROOT / "YiXianPai/YiXianPai_Data/StreamingAssets/aa/StandaloneLinux64"
DEFAULT_OUTPUT = ROOT / "extracted_assets" / VERSION / "localization.json"


def is_language_source(tree: dict[str, Any]) -> bool:
    source = tree.get("mSource")
    return isinstance(source, dict) and isinstance(source.get("mTerms"), list) and isinstance(source.get("mLanguages"), list)


def extract_language_source(bundle_dir: Path) -> dict[str, Any]:
    for bundle in sorted(bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(bundle))
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != "MonoBehaviour":
                continue
            try:
                tree = obj.read_typetree()
            except Exception:
                continue
            if not is_language_source(tree):
                continue
            source = tree["mSource"]
            languages = [
                {
                    "name": language.get("Name", ""),
                    "code": language.get("Code", ""),
                }
                for language in source["mLanguages"]
            ]
            terms: dict[str, dict[str, str]] = {}
            for term in source["mTerms"]:
                key = term.get("Term", "")
                values = term.get("Languages", [])
                if not key or not isinstance(values, list):
                    continue
                translations = {}
                for index, language in enumerate(languages):
                    if index < len(values):
                        translations[language["code"]] = values[index]
                terms[key] = translations
            return {
                "source_bundle": bundle.name,
                "asset_name": tree.get("m_Name", ""),
                "languages": languages,
                "terms": terms,
            }
    raise RuntimeError(f"No I2 LanguageSourceAsset found under {bundle_dir}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-dir", type=Path, default=DEFAULT_BUNDLE_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    data = extract_language_source(args.bundle_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.output.relative_to(ROOT))
    print(f"{len(data['terms'])} terms from {data['source_bundle']}")


if __name__ == "__main__":
    main()
