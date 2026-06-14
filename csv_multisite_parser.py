#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Универсальный парсер фото по CSV-файлу со ссылками на РАЗНЫЕ сайты.

CSV должен иметь колонки: Артикул, Цвет, URL (плюс может быть №, Название).
Для каждой строки парсер открывает её URL, определяет сайт и забирает фото:
  - tr.uspoloassn.com  → галерея Akinon (оригинальный размер);
  - uspa.in.ua         → фото из JSON-LD;
  - другие сайты       → общий способ (JSON-LD Product + og:image) — best-effort.

Раскладка:
  <out>/<артикул>_<цвет>/<артикул>_<цвет>_<N>.<ext>

Запуск (Mac):
  python3 csv_multisite_parser.py --csv USPA_links_for_parsing.csv --out ~/Desktop/USPA_photos

Оффлайн-самотест экстракторов на сохранённой странице:
  python3 csv_multisite_parser.py --selftest tr|uspa|generic path/to/page.html

Зависимости: pip install requests
"""

import argparse
import csv
import os
import re
import sys
import time
import json
from urllib.parse import urlparse, urljoin

import requests

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "tr,uk,en;q=0.8",
}
TIMEOUT = 30
DELAY = 0.6
IMG_DELAY = 0.15
MAX_RETRIES = 4
SEP = "_"

RE_OG_IMAGE = re.compile(r'property="og:image"[^>]*content="([^"]+)"', re.I)
RE_TW_IMAGE = re.compile(r'name="twitter:image"[^>]*content="([^"]+)"', re.I)
RE_LDJSON = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S | re.I)
RE_AKINON_IMG = re.compile(r'https?://[a-z0-9.\-]*akinoncloudcdn\.com/products/[^\s"\'<>)]+\.jpg', re.I)
RE_BASE_ID = re.compile(r'/products/\d{4}/\d{2}/\d{2}/(\d+)/', re.I)
RE_SIZE_SUF = re.compile(r'_size\d+x\d+[^/]*?(\.jpg)$', re.I)


def http_get(session, url, binary=False):
    last = None
    for a in range(MAX_RETRIES):
        try:
            r = session.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.content if binary else r.text
            if r.status_code in (404, 410):
                return None
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last = str(e)
        time.sleep(2 ** a)
    print(f"    ! не вдалося {url}: {last}", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Экстракторы фото по сайтам
# ---------------------------------------------------------------------------
def ld_products(html):
    out = []
    for m in RE_LDJSON.finditer(html):
        try:
            d = json.loads(m.group(1).strip())
        except Exception:
            continue
        for item in (d if isinstance(d, list) else [d]):
            if isinstance(item, dict) and item.get("@type") == "Product":
                out.append(item)
    return out


def extract_tr_uspoloassn(html, base_url=""):
    """Akinon: оригинальные фото галереи по base_id из og:image."""
    m = RE_OG_IMAGE.search(html)
    main_base = None
    if m:
        bm = RE_BASE_ID.search(m.group(1))
        main_base = bm.group(1) if bm else None
    res, seen = [], set()
    for raw in RE_AKINON_IMG.findall(html):
        orig = RE_SIZE_SUF.sub(r'\1', raw)
        bm = RE_BASE_ID.search(orig)
        this_base = bm.group(1) if bm else None
        if main_base and this_base != main_base:
            continue
        if orig not in seen:
            seen.add(orig)
            res.append(orig)
    return res


def extract_uspa(html, base_url=""):
    for p in ld_products(html):
        imgs = p.get("image") or []
        if isinstance(imgs, str):
            imgs = [imgs]
        if imgs:
            return list(dict.fromkeys(imgs))
    return []


def extract_generic(html, base_url=""):
    """Общий способ: JSON-LD Product images + og:image + twitter:image."""
    urls = []
    for p in ld_products(html):
        imgs = p.get("image") or []
        if isinstance(imgs, str):
            imgs = [imgs]
        urls += imgs
    urls += RE_OG_IMAGE.findall(html)
    urls += RE_TW_IMAGE.findall(html)
    out, seen = [], set()
    for u in urls:
        u = urljoin(base_url, u.strip())
        if u and u not in seen and u.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
            seen.add(u)
            out.append(u)
    return out


def pick_extractor(url):
    host = urlparse(url).netloc.lower()
    if "uspoloassn.com" in host:
        return extract_tr_uspoloassn, "tr.uspoloassn"
    if "uspa.in.ua" in host:
        return extract_uspa, "uspa.in.ua"
    return extract_generic, host or "generic"


# ---------------------------------------------------------------------------
# Скачивание
# ---------------------------------------------------------------------------
def safe(s):
    return re.sub(r'[\\/:*?"<>|]+', "-", str(s)).strip() or "x"


def ext_of(url):
    e = os.path.splitext(urlparse(url).path)[1].lower()
    return e if e in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"


def download_row(session, out_dir, article, color, urls, dry=False):
    folder = os.path.join(out_dir, safe(f"{article}{SEP}{color}"))
    # продолжаем нумерацию, если папка уже есть (одна модель из нескольких ссылок)
    start = 0
    if os.path.isdir(folder):
        start = len([n for n in os.listdir(folder) if n.lower().endswith(
            (".jpg", ".jpeg", ".png", ".webp"))])
    n = 0
    for i, u in enumerate(urls, 1):
        idx = start + i
        fname = safe(f"{article}{SEP}{color}{SEP}{idx}") + ext_of(u)
        fpath = os.path.join(folder, fname)
        if dry:
            print(f"      [dry] {fpath} <- {u}")
            n += 1
            continue
        data = http_get(session, u, binary=True)
        if data:
            os.makedirs(folder, exist_ok=True)
            with open(fpath, "wb") as f:
                f.write(data)
            n += 1
        time.sleep(IMG_DELAY)
    return n, folder


# ---------------------------------------------------------------------------
# Основной проход по CSV
# ---------------------------------------------------------------------------
def read_csv(path):
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    def col(d, *names):
        for n in names:
            for k in d:
                if k and k.strip().lower() == n.lower():
                    return d[k]
        return ""
    out = []
    for d in rows:
        out.append({
            "article": str(col(d, "Артикул", "article", "sku")).strip(),
            "color": str(col(d, "Цвет", "Колір", "color")).strip(),
            "name": str(col(d, "Название", "Назва", "name")).strip(),
            "url": str(col(d, "URL", "Ссылка", "link")).strip(),
        })
    return out


def run(csv_path, out_dir, dry=False, limit=None):
    rows = read_csv(csv_path)
    if limit:
        rows = rows[:limit]
    os.makedirs(out_dir, exist_ok=True)
    session = requests.Session()

    report = os.path.join(out_dir, "_report.csv")
    total = 0
    with open(report, "w", newline="", encoding="utf-8-sig") as rf:
        w = csv.writer(rf)
        w.writerow(["артикул", "цвет", "сайт", "фото", "папка", "url"])
        for i, r in enumerate(rows, 1):
            art, color, url = r["article"], r["color"], r["url"]
            if not url:
                continue
            extractor, site = pick_extractor(url)
            print(f"[{i}/{len(rows)}] {art}_{color} | {site}")
            html = http_get(session, url)
            if not html:
                print("    сторінка не відкрилась")
                w.writerow([art, color, site, 0, "", url])
                continue
            imgs = extractor(html, url)
            if not imgs:
                print("    фото не знайдено (можливо, сайт вантажить через JS/захист)")
                w.writerow([art, color, site, 0, "", url])
                continue
            got, folder = download_row(session, out_dir, art, color, imgs, dry)
            total += got
            print(f"    {got} фото -> {folder}")
            w.writerow([art, color, site, got, folder, url])
            time.sleep(DELAY)

    print(f"\nГотово. Завантажено фото: {total}. Звіт: {report}")


def selftest(kind, path):
    html = open(path, encoding="utf-8", errors="ignore").read()
    fn = {"tr": extract_tr_uspoloassn, "uspa": extract_uspa,
          "generic": extract_generic}[kind]
    imgs = fn(html, "")
    print(f"{kind}: знайдено {len(imgs)} фото")
    for u in imgs:
        print("  ", u)


def main():
    ap = argparse.ArgumentParser(description="Парсер фото по CSV з різних сайтів")
    ap.add_argument("--csv", help="CSV з колонками Артикул, Цвет, URL")
    ap.add_argument("--out", default="USPA_photos", help="папка результату")
    ap.add_argument("--limit", type=int, help="тільки перші N рядків")
    ap.add_argument("--dry-run", action="store_true", help="не качати, лише показати")
    ap.add_argument("--selftest", nargs=2, metavar=("KIND", "HTML"),
                    help="перевірка екстрактора: tr|uspa|generic <файл.html>")
    args = ap.parse_args()
    if args.selftest:
        selftest(args.selftest[0], args.selftest[1])
        return
    if not args.csv:
        ap.error("вкажіть --csv <файл.csv> або --selftest")
    run(args.csv, args.out, dry=args.dry_run, limit=args.limit)


if __name__ == "__main__":
    main()
