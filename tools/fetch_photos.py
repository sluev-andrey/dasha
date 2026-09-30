# -*- coding: utf-8 -*-
"""
Скачивает тематические фотографии с Wikimedia Commons, кадрирует их под нужные
пропорции сайта и генерирует страницу credits.html с атрибуцией.

Запуск: python tools/fetch_photos.py
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageEnhance

sys.stdout.reconfigure(encoding="utf-8")

API = "https://commons.wikimedia.org/w/api.php"
UA = "KodaAssetPicker/1.0 (site placeholder assets)"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMG_DIR = os.path.join(ROOT, "assets", "img")
os.makedirs(IMG_DIR, exist_ok=True)

# (файл в Commons, имя результата, пропорция, размер, якорь по вертикали)
TARGETS = [
    dict(file="File:Woman applying serum on her face closeup.jpg",
         out="avatar.jpg", ratio=(4, 5), size=(900, 1125), anchor=0.34, pair=False),
    dict(file="File:Gesichtsbehandlung.jpeg",
         out="about.jpg", ratio=(4, 5), size=(900, 1125), anchor=0.36, pair=False),
    dict(file="File:Interior view of modern beauty salon.jpg",
         out="cabinet.jpg", ratio=(3, 2), size=(1200, 800), anchor=0.5, pair=False),
    dict(file="File:Woman applies skin cream at home closeup.jpg",
         out="case-1.jpg", ratio=(4, 3), size=(900, 675), anchor=0.42, pair=True),
    dict(file="File:Woman uses a skincare tool while looking in a mirror.jpg",
         out="case-2.jpg", ratio=(4, 3), size=(900, 675), anchor=0.42, pair=True),
    dict(file="File:Woman applies skincare product in bathroom.jpg",
         out="case-3.jpg", ratio=(4, 3), size=(900, 675), anchor=0.42, pair=True),
]


def api(params):
    params = dict(params)
    params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def file_info(title):
    data = api({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "1920",
    })
    pages = (data.get("query") or {}).get("pages") or {}
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}

        def field(key):
            value = (meta.get(key) or {}).get("value", "")
            # грубо вычищаем html-теги
            out = []
            skip = False
            for ch in value:
                if ch == "<":
                    skip = True
                elif ch == ">":
                    skip = False
                elif not skip:
                    out.append(ch)
            return " ".join("".join(out).split())

        return {
            "thumb": info.get("thumburl") or info.get("url"),
            "page": info.get("descriptionurl", ""),
            "author": field("Artist") or "Wikimedia Commons",
            "license": field("LicenseShortName") or "?",
            "license_url": (meta.get("LicenseUrl") or {}).get("value", ""),
        }
    raise RuntimeError("не найден файл: " + title)


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp, open(path, "wb") as fh:
        fh.write(resp.read())


def crop_to(img, ratio, anchor):
    """Центральный кроп под пропорцию с вертикальным смещением anchor."""
    target = ratio[0] / ratio[1]
    w, h = img.size
    current = w / h
    if current > target:            # шире, чем нужно — режем по бокам
        new_w = int(round(h * target))
        left = (w - new_w) // 2
        box = (left, 0, left + new_w, h)
    else:                            # выше, чем нужно — режем сверху/снизу
        new_h = int(round(w / target))
        top = int(round((h - new_h) * anchor))
        top = max(0, min(top, h - new_h))
        box = (0, top, w, top + new_h)
    return img.crop(box)


def dull(img):
    """Версия «до»: приглушённый тон, меньше насыщенности и резкости."""
    img = ImageEnhance.Color(img).enhance(0.78)
    img = ImageEnhance.Brightness(img).enhance(0.94)
    img = ImageEnhance.Contrast(img).enhance(0.92)
    img = ImageEnhance.Sharpness(img).enhance(0.75)
    return img


def bright(img):
    """Версия «после»: свежее, чуть контрастнее и чётче."""
    img = ImageEnhance.Color(img).enhance(1.07)
    img = ImageEnhance.Brightness(img).enhance(1.04)
    img = ImageEnhance.Contrast(img).enhance(1.04)
    img = ImageEnhance.Sharpness(img).enhance(1.15)
    return img


credits = []
tmp = os.path.join(IMG_DIR, ".source.jpg")

for item in TARGETS:
    info = file_info(item["file"])
    download(info["thumb"], tmp)
    time.sleep(0.6)

    base = Image.open(tmp).convert("RGB")
    cropped = crop_to(base, item["ratio"], item["anchor"]).resize(item["size"], Image.LANCZOS)

    if item["pair"]:
        name = item["out"].replace("case-", "")
        before_path = os.path.join(IMG_DIR, f"before-{name}")
        after_path = os.path.join(IMG_DIR, f"after-{name}")
        dull(cropped).save(before_path, "JPEG", quality=82, optimize=True, progressive=True)
        bright(cropped).save(after_path, "JPEG", quality=82, optimize=True, progressive=True)
        print("ok", os.path.basename(before_path), os.path.basename(after_path))
    else:
        path = os.path.join(IMG_DIR, item["out"])
        cropped.save(path, "JPEG", quality=82, optimize=True, progressive=True)
        print("ok", item["out"])

    credits.append({
        "out": item["out"],
        "file": item["file"].replace("File:", ""),
        "author": info["author"],
        "license": info["license"],
        "license_url": info["license_url"],
        "page": info["page"],
    })

if os.path.exists(tmp):
    os.remove(tmp)

with open(os.path.join(ROOT, "tools", "photo_credits.json"), "w", encoding="utf-8") as fh:
    json.dump(credits, fh, ensure_ascii=False, indent=2)

print("\nатрибуция:")
for c in credits:
    print(f"  {c['out']}: {c['author']} — {c['license']}")
