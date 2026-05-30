#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер каталога uspa.in.ua (украинский U.S. Polo Assn).

Каждая карточка товара содержит JSON-LD (schema.org/Product) — оттуда берём
всё: артикул, название, цвет, состав, цену, скидку, размеры+штрихкоды,
наличие, фото, описание.

Что делает:
  1. Собирает список товаров (из sitemap.xml сайта либо из файла со ссылками).
  2. По каждой карточке парсит JSON-LD.
  3. Пишет полный экспорт в catalog.csv (1 строка = 1 товар).
  4. По желанию скачивает все фото в папки images/<артикул>/.

ВАЖНО про окружение: в облаке Claude сайт недоступен (блок сети), поэтому
запускать нужно ЛОКАЛЬНО, где сайт открывается. Самотест парсинга — оффлайн:
  python3 uspa_parser.py --selftest path/to/product.html

Обычный запуск (локально):
  python3 uspa_parser.py --out export              # из sitemap, с экспортом CSV
  python3 uspa_parser.py --out export --images     # + скачать фото
  python3 uspa_parser.py --urls urls.txt --out export   # из своего списка ссылок

Зависимости: pip install requests
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

import requests

BASE = "https://uspa.in.ua"
SITEMAP = BASE + "/sitemap.xml"
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "uk,en;q=0.8",
}
TIMEOUT = 30
DELAY = 0.5
MAX_RETRIES = 4

RE_LDJSON = re.compile(
    r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S | re.I)
RE_OLDPRICE = re.compile(r'<del>\s*([\d\s]+)\s*грн', re.I)


def http_get(session, url, binary=False):
    last = None
    for a in range(MAX_RETRIES):
        try:
            r = session.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.content if binary else r.text
            if r.status_code == 404:
                return None
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last = str(e)
        time.sleep(2 ** a)
    print(f"  ! не вдалося {url}: {last}", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Парсинг карточки (чистая функция — тестируется оффлайн)
# ---------------------------------------------------------------------------
def find_product_ldjson(html):
    """Возвращает dict JSON-LD с @type Product, или None."""
    for m in RE_LDJSON.finditer(html):
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for d in items:
            if isinstance(d, dict) and d.get("@type") == "Product":
                return d
    return None


def parse_product(html):
    """Извлекает поля товара из карточки. Возвращает dict или None."""
    d = find_product_ldjson(html)
    if not d:
        return None

    offers = d.get("offers") or []
    if isinstance(offers, dict):
        offers = [offers]

    sizes, barcodes, prices, variants = [], [], [], []
    availability = ""
    for o in offers:
        if not isinstance(o, dict):
            continue
        size = str(o.get("size") or "")
        barcode = str(o.get("sku") or "")
        price = ""
        if o.get("price") is not None:
            try:
                price = float(o["price"])
                prices.append(price)
            except (TypeError, ValueError):
                price = ""
        av = o.get("availability", "")
        in_stock = "В наявності" if "InStock" in av else "Немає"
        if "InStock" in av:
            availability = "В наявності"
        if size:
            sizes.append(size)
        if barcode:
            barcodes.append(barcode)
        # вариант = один штрихкод (размер) — оригинальный код товара
        if barcode or size:
            variants.append({"barcode": barcode, "size": size,
                             "price": price, "availability": in_stock})
    if not availability and offers:
        availability = "Немає"

    old = RE_OLDPRICE.search(html)
    old_price = old.group(1).replace(" ", "").strip() if old else ""

    images = d.get("image") or []
    if isinstance(images, str):
        images = [images]

    brand = d.get("brand")
    brand_name = brand.get("name") if isinstance(brand, dict) else brand

    return {
        "article": d.get("sku", ""),
        "name": (d.get("name") or "").strip(),
        "brand": brand_name or "",
        "color": d.get("color", "") or "",
        "material": d.get("material", "") or "",
        "price": min(prices) if prices else "",
        "old_price": old_price,
        "currency": (offers[0].get("priceCurrency") if offers else "") or "UAH",
        "sizes": ",".join(dict.fromkeys(sizes)),
        "barcodes": ",".join(dict.fromkeys(barcodes)),
        "barcode_list": list(dict.fromkeys(barcodes)),
        "variants": variants,
        "availability": availability,
        "images_count": len(images),
        "images": images,
        "url": d.get("url", ""),
        "description": (d.get("description") or "").replace("\n", " ").strip(),
    }


# ---------------------------------------------------------------------------
# Перечисление товаров: sitemap (с поддержкой sitemap-index) или файл
# ---------------------------------------------------------------------------
def collect_urls_from_sitemap(session, sitemap_url, _depth=0):
    xml = http_get(session, sitemap_url)
    if not xml:
        return []
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml, re.I)
    # sitemap-index → рекурсивно
    if "<sitemapindex" in xml.lower() and _depth < 3:
        urls = []
        for sm in locs:
            urls += collect_urls_from_sitemap(session, sm, _depth + 1)
            time.sleep(DELAY)
        return urls
    return [u for u in locs if "/product/" in u]


def safe(s):
    return re.sub(r'[\\/:*?"<>|]+', "-", str(s)).strip() or "item"


def download_images(session, out_dir, article, images, dry=False):
    folder = os.path.join(out_dir, "images", safe(article))
    n = 0
    for i, url in enumerate(images, 1):
        ext = os.path.splitext(urlparse(url).path)[1] or ".webp"
        fpath = os.path.join(folder, f"{safe(article)}_{i}{ext}")
        if dry:
            print(f"      [dry] {fpath} <- {url}")
            n += 1
            continue
        if os.path.exists(fpath) and os.path.getsize(fpath) > 0:
            n += 1
            continue
        data = http_get(session, url, binary=True)
        if data:
            os.makedirs(folder, exist_ok=True)
            with open(fpath, "wb") as f:
                f.write(data)
            n += 1
        time.sleep(0.15)
    return n


def load_barcodes(path):
    """Список целевых штрихкодов (по одному в строке или через запятую)."""
    out = []
    with open(path, encoding="utf-8-sig") as f:
        for ln in f:
            for tok in re.split(r"[,;\s]+", ln.strip()):
                tok = tok.strip()
                if tok.isdigit():
                    out.append(tok)
    return set(out)


def run(out_dir, urls_file=None, sitemap=SITEMAP, want_images=False, limit=None,
        dry=False, barcodes_file=None, folders_by="barcode"):
    os.makedirs(out_dir, exist_ok=True)
    session = requests.Session()

    target_barcodes = load_barcodes(barcodes_file) if barcodes_file else None
    if target_barcodes is not None:
        print(f"Фільтр за штрихкодами: {len(target_barcodes)} шт.")

    if urls_file:
        with open(urls_file, encoding="utf-8") as f:
            urls = [ln.strip() for ln in f if ln.strip() and "/product/" in ln]
    else:
        print("Збираю список товарів із sitemap...")
        urls = collect_urls_from_sitemap(session, sitemap)
    urls = list(dict.fromkeys(urls))
    if limit:
        urls = urls[:limit]
    print(f"Товарів до обробки: {len(urls)}")

    cols = ["article", "name", "brand", "color", "material", "price", "old_price",
            "currency", "sizes", "barcodes", "availability", "images_count", "url",
            "description"]
    bc_cols = ["barcode", "size", "price", "availability", "article_site", "name",
               "color", "material", "url", "image_folder", "image_main"]

    catalog_path = os.path.join(out_dir, "catalog.csv")
    bybc_path = os.path.join(out_dir, "by_barcode.csv")
    ok = matched_bc = 0
    not_found_bc = set(target_barcodes) if target_barcodes else set()

    with open(catalog_path, "w", newline="", encoding="utf-8-sig") as cf, \
         open(bybc_path, "w", newline="", encoding="utf-8-sig") as bf:
        w = csv.DictWriter(cf, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        wb = csv.DictWriter(bf, fieldnames=bc_cols, extrasaction="ignore")
        wb.writeheader()

        for i, url in enumerate(urls, 1):
            html = http_get(session, url)
            if not html:
                continue
            p = parse_product(html)
            if not p:
                print(f"[{i}/{len(urls)}] не знайдено JSON-LD: {url}")
                continue

            # Фильтр: берём товар, только если хоть один его штрихкод в списке.
            if target_barcodes is not None:
                if not (set(p["barcode_list"]) & target_barcodes):
                    time.sleep(DELAY)
                    continue
                not_found_bc -= set(p["barcode_list"])

            # Имя папки для фото: по штрихкоду (твой ключ) или по артикулу сайта.
            key = (p["barcode_list"][0] if p["barcode_list"] else p["article"]) \
                if folders_by == "barcode" else p["article"]
            img_folder = os.path.join("images", safe(key))

            w.writerow(p)
            ok += 1

            # строки «по штрихкоду» — 1 на каждый размер/штрихкод
            for v in p["variants"]:
                if target_barcodes is not None and v["barcode"] not in target_barcodes:
                    continue
                wb.writerow({
                    "barcode": v["barcode"], "size": v["size"], "price": v["price"],
                    "availability": v["availability"], "article_site": p["article"],
                    "name": p["name"], "color": p["color"], "material": p["material"],
                    "url": p["url"], "image_folder": img_folder,
                    "image_main": p["images"][0] if p["images"] else "",
                })
                matched_bc += 1

            imgnote = ""
            if want_images:
                got = download_images(session, out_dir, key, p["images"], dry)
                imgnote = f", фото: {got}"
            print(f"[{i}/{len(urls)}] {p['barcodes'] or p['article']} | "
                  f"{p['name'][:34]} | {p['price']} {p['currency']} | {p['sizes']}{imgnote}")
            time.sleep(DELAY)

    print(f"\nГотово.")
    print(f"  Каталог (по товарах):   {catalog_path}  ({ok} товарів)")
    print(f"  Експорт по штрихкодах:  {bybc_path}  ({matched_bc} штрихкодів)")
    if want_images:
        print(f"  Фото: {os.path.join(out_dir, 'images')}/<{folders_by}>/")
    if target_barcodes is not None and not_found_bc:
        miss_path = os.path.join(out_dir, "barcodes_not_found.txt")
        with open(miss_path, "w", encoding="utf-8") as mf:
            mf.write("\n".join(sorted(not_found_bc)))
        print(f"  Не знайдено штрихкодів: {len(not_found_bc)} (див. {miss_path})")


def selftest(path):
    html = open(path, encoding="utf-8", errors="ignore").read()
    p = parse_product(html)
    if not p:
        print("JSON-LD Product не знайдено")
        return
    for k in ("article", "name", "color", "material", "price", "old_price",
              "currency", "sizes", "barcodes", "availability", "images_count", "url"):
        print(f"  {k}: {p[k]}")
    print("  images:")
    for u in p["images"]:
        print("   ", u)


def main():
    ap = argparse.ArgumentParser(description="Парсер каталогу uspa.in.ua")
    ap.add_argument("--out", default="export", help="папка результату")
    ap.add_argument("--urls", help="файл зі списком посилань на товари (по одному в рядку)")
    ap.add_argument("--sitemap", default=SITEMAP, help="URL sitemap.xml")
    ap.add_argument("--images", action="store_true", help="скачати фото товарів")
    ap.add_argument("--barcodes", help="файл зі списком твоїх ОРИГІНАЛЬНИХ штрихкодів — "
                                       "брати лише товари, що їм відповідають")
    ap.add_argument("--folders-by", choices=["barcode", "article"], default="barcode",
                    help="як називати папки фото (за замовч. barcode)")
    ap.add_argument("--limit", type=int, help="тільки перші N товарів (для тесту)")
    ap.add_argument("--dry-run", action="store_true", help="не качати фото, лише показати")
    ap.add_argument("--selftest", metavar="HTML", help="оффлайн-перевірка парсингу на карточці")
    args = ap.parse_args()

    if args.selftest:
        selftest(args.selftest)
        return
    run(args.out, urls_file=args.urls, sitemap=args.sitemap,
        want_images=args.images, limit=args.limit, dry=args.dry_run,
        barcodes_file=args.barcodes, folders_by=args.folders_by)


if __name__ == "__main__":
    main()
