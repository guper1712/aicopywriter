#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сжатие уже скачанных фото (JPEG) без видимой потери качества.

Что делает:
  - рекурсивно проходит папку с фото;
  - пересохраняет каждый .jpg с качеством ~85, оптимизацией и progressive;
  - по желанию ограничивает максимальную сторону (для маркетплейсов);
  - убирает лишние метаданные (EXIF);
  - заменяет файл ТОЛЬКО если новый меньше (иначе оставляет оригинал);
  - в конце показывает, сколько весило и сколько стало.

Примеры (на Mac, из папки ~/Desktop/uspolo):
  # на месте, качество 85 (визуально без потерь):
  .venv/bin/python compress_photos.py --dir photos

  # сильнее сжать (меньше вес):
  .venv/bin/python compress_photos.py --dir photos --quality 80

  # + ограничить размер до 1600px по большей стороне (для маркетплейсов):
  .venv/bin/python compress_photos.py --dir photos --max 1600

  # не трогать оригиналы, складывать в отдельную папку:
  .venv/bin/python compress_photos.py --dir photos --out photos_small

Зависимости:  pip install pillow
"""

import argparse
import os
import sys

from PIL import Image, ImageOps


def human(nbytes):
    for unit in ("Б", "КБ", "МБ", "ГБ"):
        if nbytes < 1024 or unit == "ГБ":
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024


def iter_jpegs(root):
    for dirpath, _, files in os.walk(root):
        for name in files:
            if name.lower().endswith((".jpg", ".jpeg")):
                yield os.path.join(dirpath, name)


def compress_one(src, dst, quality, max_side):
    """Возвращает (старый_размер, новый_размер) или None при ошибке."""
    old_size = os.path.getsize(src)
    try:
        img = Image.open(src)
        # Учитываем поворот по EXIF и убираем метаданные.
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        if max_side:
            w, h = img.size
            if max(w, h) > max_side:
                if w >= h:
                    img = img.resize((max_side, round(h * max_side / w)), Image.LANCZOS)
                else:
                    img = img.resize((round(w * max_side / h), max_side), Image.LANCZOS)

        tmp = dst + ".tmp"
        os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
        img.save(tmp, "JPEG", quality=quality, optimize=True, progressive=True)
        new_size = os.path.getsize(tmp)

        # Если это пересохранение НА МЕСТЕ — меняем только когда стало меньше.
        if os.path.abspath(src) == os.path.abspath(dst):
            if new_size < old_size:
                os.replace(tmp, dst)
                return old_size, new_size
            else:
                os.remove(tmp)
                return old_size, old_size
        else:
            os.replace(tmp, dst)
            return old_size, new_size
    except Exception as e:
        print(f"  ! пропуск {src}: {e}", file=sys.stderr)
        if os.path.exists(dst + ".tmp"):
            os.remove(dst + ".tmp")
        return None


def main():
    ap = argparse.ArgumentParser(description="Сжатие скачанных JPEG без видимой потери качества")
    ap.add_argument("--dir", required=True, help="папка с фото (например photos)")
    ap.add_argument("--out", help="папка для результата (если не указана — сжимает НА МЕСТЕ)")
    ap.add_argument("--quality", type=int, default=85, help="качество JPEG 1..100 (по умолч. 85)")
    ap.add_argument("--max", type=int, default=0, help="ограничить большую сторону, px (0 = не менять)")
    args = ap.parse_args()

    if not os.path.isdir(args.dir):
        ap.error(f"папка не найдена: {args.dir}")

    files = list(iter_jpegs(args.dir))
    print(f"Найдено фото: {len(files)}")
    if args.out:
        print(f"Результат в: {args.out} (оригиналы не трогаем)")
    else:
        print("Режим: сжатие НА МЕСТЕ (заменяю только если стало меньше)")
    print(f"Качество: {args.quality}" + (f", макс. сторона: {args.max}px" if args.max else ""))
    print()

    total_old = total_new = done = 0
    for i, src in enumerate(files, 1):
        if args.out:
            rel = os.path.relpath(src, args.dir)
            dst = os.path.join(args.out, rel)
        else:
            dst = src
        res = compress_one(src, dst, args.quality, args.max)
        if res:
            total_old += res[0]
            total_new += res[1]
            done += 1
        if i % 100 == 0:
            print(f"  обработано {i}/{len(files)}...")

    saved = total_old - total_new
    pct = (saved / total_old * 100) if total_old else 0
    print()
    print(f"Готово. Обработано: {done} фото")
    print(f"Было:  {human(total_old)}")
    print(f"Стало: {human(total_new)}")
    print(f"Экономия: {human(saved)}  ({pct:.0f}%)")


if __name__ == "__main__":
    main()
