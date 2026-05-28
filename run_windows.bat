@echo off
chcp 65001 >nul
REM ====================================================================
REM  Запускалка парсера фото U.S. Polo Assn для Windows.
REM  Просто положи рядом: uspolo_parser.py и свой Excel-файл,
REM  переименуй Excel в  articles.xlsx , и дважды кликни по этому файлу.
REM ====================================================================

echo.
echo === Парсер фото tr.uspoloassn.com ===
echo.

REM Проверяем, установлен ли Python
python --version >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Python не найден.
  echo Установи Python с https://www.python.org/downloads/
  echo ВАЖНО: при установке поставь галочку "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

echo Устанавливаю нужные библиотеки (один раз)...
python -m pip install --quiet --upgrade requests openpyxl

if not exist "articles.xlsx" (
  echo.
  echo [ОШИБКА] Рядом нет файла articles.xlsx
  echo Переименуй свой Excel в articles.xlsx и положи его в эту же папку.
  echo.
  pause
  exit /b 1
)

echo.
echo Запускаю скачивание. Фото появятся в папке photos\
echo (это может занять время — зависит от числа товаров).
echo.
python uspolo_parser.py --excel "articles.xlsx" --out "photos"

echo.
echo === Готово! Смотри папку photos\ и отчёт photos\_report.csv ===
echo.
pause
