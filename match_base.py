#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сверка скачанных фото с твоей базой (Excel: артикул + нужный цвет).

Берёт articles.xlsx и папку photos/ (где лежат папки вида <артикул>_<цвет>),
и говорит по КАЖДОЙ строке базы, что есть, чего нет.

Статусы:
  Є ФОТО            — папка <артикул>_<цвет> найдена (точный матч по коду цвета)
  НЕМАЄ ЦЬОГО КОЛЬОРУ — артикул скачан, но именно этого цвета нет
  АРТИКУЛ НЕ ЗНАЙДЕНО — артикула нет среди скачанных (нет на сайте)
  КОЛІР ТЕКСТОМ      — цвет в базе словом (Білий/Синій): показываю доступные коды цветов

Примеры (Mac, из ~/Desktop/uspolo):
  # отчёт сверки:
  .venv/bin/python match_base.py --excel articles.xlsx --dir photos

  # + собрать ТОЛЬКО нужные папки (артикул+цвет из базы) в photos_needed/:
  .venv/bin/python match_base.py --excel articles.xlsx --dir photos --copy photos_needed

Зависимости: pip install openpyxl
"""

import argparse
import csv
import os
import re
import shutil
import sys


def load_pairs(xlsx):
    import openpyxl
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    ws = wb.active
    pairs = []
    rows = list(ws.iter_rows(values_only=True))
    start = 1 if rows and str(rows[0][0]).strip().lower() in ("артикул", "article", "sku") else 0
    for r in rows[start:]:
        if not r or r[0] in (None, ""):
            continue
        a = str(r[0]).strip()
        c = str(r[1]).strip() if len(r) > 1 and r[1] not in (None, "") else ""
        pairs.append((a, c))
    return pairs


def is_code(c):
    return bool(re.fullmatch(r"(VR|DN)\d+", c.upper()))


def count_jpgs(path):
    return sum(1 for n in os.listdir(path) if n.lower().endswith((".jpg", ".jpeg")))


def scan_folders(photos_dir):
    """name.lower() -> (path, photo_count); + индекс артикул -> [коды цветов]."""
    folders = {}
    by_article = {}
    for name in os.listdir(photos_dir):
        p = os.path.join(photos_dir, name)
        if not os.path.isdir(p):
            continue
        folders[name.lower()] = (p, count_jpgs(p))
        if "_" in name:
            art, col = name.split("_", 1)
            by_article.setdefault(art, []).append(col)
    return folders, by_article


def main():
    ap = argparse.ArgumentParser(description="Сверка скачанных фото с базой")
    ap.add_argument("--excel", required=True)
    ap.add_argument("--dir", default="photos", help="папка с фото")
    ap.add_argument("--out", default="match_report.csv", help="файл отчёта")
    ap.add_argument("--copy", metavar="DEST", help="скопировать нужные папки сюда (только точные матчи)")
    args = ap.parse_args()

    pairs = load_pairs(args.excel)
    folders, by_article = scan_folders(args.dir)

    stats = {"Є ФОТО": 0, "НЕМАЄ ЦЬОГО КОЛЬОРУ": 0, "АРТИКУЛ НЕ ЗНАЙДЕНО": 0, "КОЛІР ТЕКСТОМ": 0}
    out_rows = []
    copied = set()

    for article, color in pairs:
        if is_code(color):
            key = f"{article}_{color}".lower()
            if key in folders:
                path, n = folders[key]
                status, info = "Є ФОТО", f"{n} фото | {path}"
                if args.copy and key not in copied:
                    dest = os.path.join(args.copy, os.path.basename(path))
                    shutil.copytree(path, dest, dirs_exist_ok=True)
                    copied.add(key)
            elif article in by_article:
                status = "НЕМАЄ ЦЬОГО КОЛЬОРУ"
                info = "доступні: " + ", ".join(sorted(by_article[article]))
            else:
                status, info = "АРТИКУЛ НЕ ЗНАЙДЕНО", ""
        else:
            if article in by_article:
                status = "КОЛІР ТЕКСТОМ"
                info = "доступні кольори: " + ", ".join(sorted(by_article[article]))
            else:
                status, info = "АРТИКУЛ НЕ ЗНАЙДЕНО", ""
        stats[status] = stats.get(status, 0) + 1
        out_rows.append([article, color, status, info])

    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["артикул", "цвет_из_базы", "статус", "детали"])
        # сортировка: есть фото → сначала
        order = {"Є ФОТО": 0, "КОЛІР ТЕКСТОМ": 1, "НЕМАЄ ЦЬОГО КОЛЬОРУ": 2, "АРТИКУЛ НЕ ЗНАЙДЕНО": 3}
        out_rows.sort(key=lambda r: order.get(r[2], 9))
        w.writerows(out_rows)

    print("Строк в базе:", len(pairs))
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nОтчёт: {args.out}")
    if args.copy:
        print(f"Скопировано папок (точные матчи): {len(copied)} → {args.copy}/")


if __name__ == "__main__":
    main()
