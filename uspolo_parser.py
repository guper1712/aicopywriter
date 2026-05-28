#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер фотографий товаров с сайта https://tr.uspoloassn.com/ (платформа Akinon).

Что делает:
  1. Читает Excel-файл со столбцами "Артикул" и "Цвет".
  2. Для каждого УНИКАЛЬНОГО артикула ищет товар на сайте через поиск
     (/list/?search_text=<артикул>) и открывает страницу товара.
  3. Со страницы собирает ВСЕ цвета модели (свотчи data-value/data-link).
  4. Для каждого цвета открывает его страницу и забирает все фото товара
     (оригинальный размер, без суффикса _size...).
  5. Сохраняет: папка  <артикул>_<цвет>/ ,  файлы  <артикул>_<цвет>_<N>.jpg

Режим цветов: "все цвета" — поле "Цвет" из Excel используется только для отчёта,
скачиваются все цвета, найденные на сайте (как и просил пользователь).

ВАЖНО про окружение:
  В облачном окружении Claude сайт tr.uspoloassn.com заблокирован сетевой
  политикой (HTTP 403, host_not_allowed), поэтому реальное скачивание нужно
  запускать ЛОКАЛЬНО, на машине, где сайт открывается.

Самопроверка логики парсинга без сети:
  python3 uspolo_parser.py --selftest path/to/product_page.html

Обычный запуск (локально):
  python3 uspolo_parser.py --excel "ba642c4b.xlsx" --out "photos"

Зависимости:
  pip install requests openpyxl
"""

import argparse
import csv
import os
import re
import sys
import time
from urllib.parse import urljoin, quote

import requests

# ---------------------------------------------------------------------------
# Конфигурация
# ---------------------------------------------------------------------------
BASE_URL = "https://tr.uspoloassn.com"
SEARCH_URL = BASE_URL + "/list/?search_text={q}"
SEP = "_"  # разделитель в именах папок/файлов: <артикул>_<цвет>_<номер>

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "tr,en;q=0.8",
}

REQUEST_TIMEOUT = 30
DELAY_BETWEEN_REQUESTS = 1.0   # пауза между запросами, сек (вежливость к сайту)
MAX_RETRIES = 4

# ---------------------------------------------------------------------------
# Регулярные выражения, выведенные из реальной страницы товара
# ---------------------------------------------------------------------------

# Свотчи цветов на странице товара:
#   data-value="VR011"  data-link="/erkek-bej-ayakkabi-50313707-vr011/"
RE_COLOR_SWATCH = re.compile(
    r'data-value="([^"]+)"\s*\n?\s*data-link="([^"]+)"', re.I
)

# Ссылки на страницы товара вида .../slug-<код>-<vr|dn|...>NNN/
RE_PRODUCT_LINK = re.compile(
    r'href="(/[a-z0-9\-]+-\d+-[a-z]{2}\d+/?)"', re.I
)

# og:image -> определяем базовый id товара (папку), чтобы взять фото именно
# этого цвета, а не свотчей соседних цветов.
RE_OG_IMAGE = re.compile(
    r'og:image"\s+content="([^"]+)"', re.I
)

# Любая ссылка на фото товара в CDN Akinon.
RE_PRODUCT_IMG = re.compile(
    r'https?://[a-z0-9.\-]*akinoncloudcdn\.com/products/[^\s"\'<>)]+\.jpg', re.I
)

# Базовый id товара внутри пути /products/Y/M/D/<baseid>/...
RE_BASE_ID = re.compile(
    r'/products/\d{4}/\d{2}/\d{2}/(\d+)/', re.I
)

# Суффикс размера, например _size270x390_quality100_cropCenter -> убираем,
# чтобы получить оригинал.
RE_SIZE_SUFFIX = re.compile(r'_size\d+x\d+[^/]*?(\.jpg)$', re.I)


# ---------------------------------------------------------------------------
# HTTP с повторами
# ---------------------------------------------------------------------------
def http_get(session, url, *, binary=False):
    """GET с экспоненциальными повторами. Возвращает text или bytes, либо None."""
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            r = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            if r.status_code == 200:
                return r.content if binary else r.text
            if r.status_code == 404:
                return None
            last_err = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last_err = str(e)
        time.sleep(2 ** attempt)
    print(f"    ! не удалось получить {url}: {last_err}", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Парсинг страницы (чистые функции — тестируются оффлайн)
# ---------------------------------------------------------------------------
def strip_size(url):
    """Превращает ..._size270x390_quality100.jpg -> ....jpg (оригинал)."""
    return RE_SIZE_SUFFIX.sub(r'\1', url)


def base_id_of(url):
    m = RE_BASE_ID.search(url)
    return m.group(1) if m else None


def extract_colors(html):
    """Список (color_code, absolute_url) всех цветов модели со страницы товара."""
    out = []
    seen = set()
    for code, link in RE_COLOR_SWATCH.findall(html):
        code = code.strip()
        url = urljoin(BASE_URL, link.strip())
        key = (code, url)
        if key not in seen:
            seen.add(key)
            out.append((code, url))
    return out


def extract_gallery(html):
    """
    Список URL фото ОРИГИНАЛЬНОГО размера для текущего цвета.
    Берём только картинки с тем же base_id, что и в og:image, чтобы не
    зацепить превью соседних цветов. Порядок сохраняется, дубли убираются.
    """
    m = RE_OG_IMAGE.search(html)
    main_base = base_id_of(m.group(1)) if m else None

    result, seen = [], set()
    for raw in RE_PRODUCT_IMG.findall(html):
        orig = strip_size(raw)
        if main_base and base_id_of(orig) != main_base:
            continue
        if orig not in seen:
            seen.add(orig)
            result.append(orig)
    return result


def extract_product_links(html):
    """Ссылки на страницы товаров (со страницы результатов поиска)."""
    out, seen = [], set()
    for link in RE_PRODUCT_LINK.findall(html):
        url = urljoin(BASE_URL, link)
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------
def read_excel(path):
    """Возвращает список (артикул, цвет) строками. Пустые/None пропускает."""
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    data = []
    # Пропускаем заголовок, если он есть.
    start = 1 if rows and str(rows[0][0]).strip().lower() in ("артикул", "article", "sku") else 0
    for r in rows[start:]:
        if not r or r[0] in (None, ""):
            continue
        article = str(r[0]).strip()
        color = str(r[1]).strip() if len(r) > 1 and r[1] not in (None, "") else ""
        data.append((article, color))
    return data


# ---------------------------------------------------------------------------
# Утилиты файловой системы
# ---------------------------------------------------------------------------
def safe_name(s):
    """Убирает символы, недопустимые в именах файлов/папок."""
    return re.sub(r'[\\/:*?"<>|]+', "-", s).strip()


def download_color(session, out_dir, article, color_code, page_url, dry_run=False):
    """Скачивает все фото одного цвета. Возвращает кол-во скачанных файлов."""
    html = http_get(session, page_url)
    if not html:
        print(f"    цвет {color_code}: страница не открылась")
        return 0

    images = extract_gallery(html)
    if not images:
        print(f"    цвет {color_code}: фото не найдены")
        return 0

    folder = os.path.join(out_dir, safe_name(f"{article}{SEP}{color_code}"))
    if not dry_run:
        os.makedirs(folder, exist_ok=True)

    count = 0
    for i, img_url in enumerate(images, 1):
        fname = safe_name(f"{article}{SEP}{color_code}{SEP}{i}.jpg")
        fpath = os.path.join(folder, fname)
        if not dry_run and os.path.exists(fpath) and os.path.getsize(fpath) > 0:
            count += 1
            continue
        if dry_run:
            print(f"      [dry-run] {fpath}  <-  {img_url}")
            count += 1
            continue
        data = http_get(session, img_url, binary=True)
        if data:
            with open(fpath, "wb") as f:
                f.write(data)
            count += 1
        time.sleep(DELAY_BETWEEN_REQUESTS)
    print(f"    цвет {color_code}: {count} фото -> {folder}")
    return count


MAX_CANDIDATES = 12  # сколько товаров из выдачи проверять на точное совпадение


def article_matches(page, article):
    """
    True, если на странице товара есть код с этим артикулом в строгом формате:
        <...>.000.<артикул>.VRxxx   (напр. G081GL011.000.1792406.VR041)
    Просто наличие числа на странице НЕ считается совпадением — иначе короткие
    мусорные номера (12345) ложно срабатывают на путях/скриптах.
    """
    pat = r'\.' + re.escape(str(article).strip()) + r'\.[A-Z]{2}\d+'
    return re.search(pat, page) is not None


def find_product_page(session, article):
    """
    Ищет товар по артикулу и возвращает (url, html) страницы товара, на которой
    РЕАЛЬНО присутствует этот артикул (точное совпадение по коду вида
    G081GL011.000.<артикул>.VRxxx). Если точного совпадения нет — (None, None).

    Так отсеиваются «похожие» товары, которые поиск отдаёт для несуществующих
    или мусорных артикулов (например 12345).
    """
    article = str(article).strip()
    search = SEARCH_URL.format(q=quote(article))
    html = http_get(session, search)
    if not html:
        return None, None

    # Кандидаты на проверку. Если поиск сразу открыл карточку товара
    # (есть свотчи цветов) — это первый кандидат.
    candidates = []
    if RE_COLOR_SWATCH.search(html):
        m = re.search(r'rel="canonical"\s+href="([^"]+)"', html)
        candidates.append(m.group(1) if m else search)
    candidates += extract_product_links(html)

    seen = set()
    for url in candidates:
        if not url or url in seen:
            continue
        seen.add(url)
        if url == search:
            page = html
        else:
            page = http_get(session, url)
            time.sleep(DELAY_BETWEEN_REQUESTS)
        # Точное совпадение: артикул присутствует на странице как сегмент кода.
        if page and article_matches(page, article):
            return url, page
        if len(seen) >= MAX_CANDIDATES:
            break
    return None, None


# ---------------------------------------------------------------------------
# Основной проход
# ---------------------------------------------------------------------------
def run(excel_path, out_dir, dry_run=False, limit=None, only=None):
    if only:
        # Тестовый режим: обрабатываем только указанные артикулы (без Excel).
        articles = [a.strip() for a in only.split(",") if a.strip()]
        rows = [(a, "") for a in articles]
    else:
        rows = read_excel(excel_path)
        # Уникальные артикулы, сохраняя порядок появления.
        articles = list(dict.fromkeys(a for a, _ in rows))
    if limit:
        articles = articles[:limit]

    print(f"Артикулов к обработке: {len(articles)}  (всего строк в файле: {len(rows)})")
    os.makedirs(out_dir, exist_ok=True)

    session = requests.Session()
    report_path = os.path.join(out_dir, "_report.csv")
    not_found = []

    with open(report_path, "w", newline="", encoding="utf-8-sig") as rep:
        w = csv.writer(rep)
        w.writerow(["артикул", "статус", "страница_товара", "цветов", "фото_всего"])

        for n, article in enumerate(articles, 1):
            print(f"[{n}/{len(articles)}] артикул {article}")
            page, html = find_product_page(session, article)
            if not page:
                print("    товар не найден (нет точного совпадения по артикулу)")
                w.writerow([article, "НЕ НАЙДЕН", "", 0, 0])
                not_found.append(article)
                continue

            colors = extract_colors(html) if html else []
            if not colors:
                # Нет свотчей — обрабатываем как одноцветный товар.
                colors = [("One", page)]

            total = 0
            for color_code, color_url in colors:
                total += download_color(session, out_dir, article, color_code,
                                         color_url, dry_run=dry_run)
                time.sleep(DELAY_BETWEEN_REQUESTS)

            w.writerow([article, "OK", page, len(colors), total])
            time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nГотово. Отчёт: {report_path}")
    if not_found:
        print(f"Не найдено артикулов: {len(not_found)} (см. отчёт)")


# ---------------------------------------------------------------------------
# Оффлайн-самотест парсинга на сохранённой HTML-странице
# ---------------------------------------------------------------------------
def selftest(html_path):
    html = open(html_path, encoding="utf-8", errors="ignore").read()
    print("== Цвета модели (свотчи) ==")
    for code, url in extract_colors(html):
        print(f"  {code:8} -> {url}")
    print("\n== Галерея текущего цвета (оригиналы) ==")
    imgs = extract_gallery(html)
    for i, u in enumerate(imgs, 1):
        print(f"  {i}. {u}")
    print(f"\nИтого фото в галерее: {len(imgs)}")
    m = RE_OG_IMAGE.search(html)
    if m:
        print("og:image base_id:", base_id_of(m.group(1)))


def main():
    ap = argparse.ArgumentParser(description="Парсер фото товаров tr.uspoloassn.com")
    ap.add_argument("--excel", help="путь к .xlsx со столбцами Артикул/Цвет")
    ap.add_argument("--out", default="photos", help="папка для сохранения (по умолчанию ./photos)")
    ap.add_argument("--dry-run", action="store_true", help="не качать, только показать что бы скачалось")
    ap.add_argument("--limit", type=int, help="обработать только первые N артикулов (для теста)")
    ap.add_argument("--only", help="проверить только эти артикулы через запятую (без Excel), напр. 1792406,12345")
    ap.add_argument("--selftest", metavar="HTML", help="оффлайн-проверка парсинга на сохранённой странице")
    args = ap.parse_args()

    if args.selftest:
        selftest(args.selftest)
        return
    if not args.excel and not args.only:
        ap.error("укажите --excel <файл.xlsx>, либо --only <артикулы>, либо --selftest <страница.html>")
    run(args.excel, args.out, dry_run=args.dry_run, limit=args.limit, only=args.only)


if __name__ == "__main__":
    main()
