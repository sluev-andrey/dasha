# -*- coding: utf-8 -*-
"""Ищет вертикальные (portrait) изображения по косметологической теме в Commons."""
import json
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

API = "https://commons.wikimedia.org/w/api.php"
UA = "KodaAssetPicker/1.0 (site placeholder assets)"

QUERIES = [
    "cosmetology treatment",
    "facial treatment",
    "beauty salon",
    "spa treatment room",
    "aesthetic cosmetology",
    "skin care treatment",
]


def api(params):
    params = dict(params)
    params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))


for q in QUERIES:
    print("\n=== " + q + " ===")
    try:
        data = api({
            "action": "query", "generator": "search", "gsrsearch": q, "gsrnamespace": "6",
            "gsrlimit": "30", "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1200",
        })
    except Exception as exc:  # noqa: BLE001
        print("  ошибка:", exc)
        continue
    for p in ((data.get("query") or {}).get("pages") or {}).values():
        info = (p.get("imageinfo") or [{}])[0]
        w, h = info.get("width", 0), info.get("height", 0)
        if info.get("mime") not in ("image/jpeg", "image/png") or w < 800:
            continue
        if h / w < 1.15:          # нужны вертикальные
            continue
        lic = (info.get("extmetadata", {}).get("LicenseShortName", {}) or {}).get("value", "?")
        print(f"  {w}x{h} r={h / w:.2f} {lic} :: {p.get('title', '')[:58]}")
        print("      " + (info.get("thumburl") or "").split("?")[0])
