"""Keep generated and retained pages under the localized public site name."""
from pathlib import Path
import re

SITE_NAMES = {"en": "Yi Xian Card Gallery", "zh": "弈仙牌卡牌图鉴"}
OLD_NAMES = ("Yi Xian Wiki", "弈仙牌 Wiki", "弈仙牌Wiki")


def brand_html(html: str, lang: str) -> str:
    for old in OLD_NAMES:
        html = html.replace(old, SITE_NAMES[lang])
    return html


def apply_site_branding(root: Path) -> int:
    changed = 0
    for path in root.rglob("*.html"):
        html = path.read_text(encoding="utf-8")
        relative = path.relative_to(root)
        lang = "zh" if relative.parts[0] == "zh" or re.search(r'<html\b[^>]*\blang=["\']zh(?:-[^"\']*)?["\']', html) else "en"
        updated = brand_html(html, lang)
        if updated != html:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


if __name__ == "__main__":
    import sys
    print(f"Updated branding on {apply_site_branding(Path(sys.argv[1]))} pages")
