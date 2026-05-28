#!/bin/bash
# ====================================================================
#  Запускалка парсера фото U.S. Polo Assn для macOS.
#  Положи рядом: uspolo_parser.py и свой Excel (переименуй в articles.xlsx),
#  затем дважды кликни по этому файлу (или запусти из Терминала).
# ====================================================================
cd "$(dirname "$0")" || exit 1

echo
echo "=== Парсер фото tr.uspoloassn.com (macOS) ==="
echo

# 1. Проверяем Python 3
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ОШИБКА] Python 3 не установлен."
  echo "Открой Терминал и выполни:  xcode-select --install"
  echo "(или установи Python с https://www.python.org/downloads/), затем запусти снова."
  echo
  read -n 1 -s -r -p "Нажми любую клавишу для выхода..."
  exit 1
fi

# 2. Проверяем наличие Excel
if [ ! -f "articles.xlsx" ]; then
  echo "[ОШИБКА] Рядом нет файла articles.xlsx"
  echo "Переименуй свой Excel в articles.xlsx и положи его в эту же папку."
  echo
  read -n 1 -s -r -p "Нажми любую клавишу для выхода..."
  exit 1
fi

# 3. Создаём изолированное окружение и ставим библиотеки (один раз)
if [ ! -d ".venv" ]; then
  echo "Создаю окружение и устанавливаю библиотеки (один раз)..."
  python3 -m venv .venv
fi
./.venv/bin/python -m pip install --quiet --upgrade pip requests openpyxl

# 4. Запуск
echo
echo "Запускаю скачивание. Фото появятся в папке photos/"
echo
./.venv/bin/python uspolo_parser.py --excel "articles.xlsx" --out "photos"

echo
echo "=== Готово! Смотри папку photos/ и отчёт photos/_report.csv ==="
echo
read -n 1 -s -r -p "Нажми любую клавишу для выхода..."
