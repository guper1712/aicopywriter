#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Бот-консьерж продавец (MVP) для Telegram.

Что делает:
  - общается с клиентом в Telegram как профессиональный продавец;
  - отвечает ТОЛЬКО на основе реальных данных о товарах/наличии (через функции),
    ничего не выдумывает про цены и остатки;
  - помогает подобрать товар, проверяет наличие, оформляет заявку (лид);
  - что не может — передаёт человеку (пишет в лог и говорит клиенту, что менеджер свяжется).

Это «мозг» AI-продавца. Данные о товарах он берёт из products.json
(ты его экспортируешь из своего HUB/Торгсофт). Позже функцию load_products()
можно заменить на реальный запрос к API твоего HUB.

Запуск (Mac):
  export ANTHROPIC_API_KEY="sk-ant-..."
  export TELEGRAM_BOT_TOKEN="123456:ABC..."   # токен от @BotFather
  .venv/bin/pip install anthropic requests
  .venv/bin/python concierge_bot.py

Зависимости: anthropic, requests
"""

import csv
import json
import os
import sys
import time
from datetime import datetime

import requests
import anthropic

# ---------------------------------------------------------------------------
# Конфигурация
# ---------------------------------------------------------------------------
MODEL = "claude-opus-4-8"        # можно сменить на "claude-haiku-4-5" для экономии
EFFORT = "low"                   # low|medium|high — для чата хватает low (быстро и дёшево)
MAX_TOKENS = 1500
MAX_TOOL_ITERS = 6               # защита от бесконечного цикла вызова функций

PRODUCTS_FILE = "products.json"  # твоя выгрузка товаров из HUB
LEADS_FILE = "leads.csv"         # сюда падают оформленные заявки

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# Данные магазина — подставь свои (используются в ответах).
BUSINESS_INFO = """\
Магазин: U.S. Polo Assn (приклад).
Доставка: Нова Пошта по Україні, 1-3 дні.
Оплата: передоплата на картку або накладений платіж.
Обмін/повернення: протягом 14 днів.
"""

SYSTEM_PROMPT = f"""Ти — ввічливий і професійний онлайн-продавець-консьєрж магазину одягу.
Спілкуйся українською, тепло, коротко і по суті. Звертайся на «Ви».

ТВОЯ ЗАДАЧА: допомогти клієнту підібрати товар, перевірити наявність, відповісти на питання
і за бажанням клієнта оформити замовлення (заявку).

ЗАЛІЗНІ ПРАВИЛА (дуже важливо):
1. НІКОЛИ не вигадуй наявність, ціну, розміри чи кольори. Будь-яку інформацію про товар
   бери ВИКЛЮЧНО через інструменти (search_products, check_availability). Якщо інструмент
   нічого не повернув — чесно скажи, що цього зараз немає, і запропонуй альтернативу.
2. Перш ніж підтвердити замовлення — переконайся через check_availability, що товар є.
3. Для оформлення замовлення потрібні: товар (артикул+колір+розмір), кількість, ім'я клієнта,
   телефон і відділення Нової Пошти. Чого не вистачає — ввічливо запитай.
4. Оформлюй замовлення інструментом create_lead ТІЛЬКИ після підтвердження клієнта.
5. Якщо питання складне, нестандартне або поза твоєю компетенцією (рекламація, оптом,
   індивідуальні умови) — скажи, що передаєш менеджеру, і виклич escalate_to_human.
6. Не обіцяй знижок чи умов, яких немає в даних магазину.

Дані магазину:
{BUSINESS_INFO}
"""

# ---------------------------------------------------------------------------
# Источник данных о товарах (грунт — без выдумок)
# Позже замени тело load_products() на запрос к API твоего HUB/Торгсофт.
# ---------------------------------------------------------------------------
_PRODUCTS_CACHE = None


def load_products():
    """Возвращает список товаров. Формат — см. products.json."""
    global _PRODUCTS_CACHE
    if _PRODUCTS_CACHE is None:
        if not os.path.exists(PRODUCTS_FILE):
            print(f"[!] Немає {PRODUCTS_FILE} — створи його (приклад: products.sample.json)",
                  file=sys.stderr)
            _PRODUCTS_CACHE = []
        else:
            with open(PRODUCTS_FILE, encoding="utf-8") as f:
                _PRODUCTS_CACHE = json.load(f)
    return _PRODUCTS_CACHE


# ---------------------------------------------------------------------------
# Реализация инструментов (функций), которые вызывает модель
# ---------------------------------------------------------------------------
def tool_search_products(query):
    q = str(query or "").strip().lower()
    res = []
    for p in load_products():
        hay = " ".join([
            str(p.get("article", "")), str(p.get("name", "")),
            str(p.get("category", "")), " ".join(p.get("colors", {}).keys()),
        ]).lower()
        if not q or q in hay:
            res.append({
                "article": p.get("article"),
                "name": p.get("name"),
                "price": p.get("price"),
                "colors": list(p.get("colors", {}).keys()),
            })
    return {"found": len(res), "products": res[:15]}


def _find(article):
    for p in load_products():
        if str(p.get("article")) == str(article):
            return p
    return None


def tool_check_availability(article, color=None, size=None):
    p = _find(article)
    if not p:
        return {"in_stock": False, "reason": "артикул не знайдено"}
    colors = p.get("colors", {})
    if color and color not in colors:
        return {"in_stock": False, "reason": "такого кольору немає",
                "available_colors": list(colors.keys())}
    # stock: {color: {size: qty}}
    target_colors = [color] if color else list(colors.keys())
    avail = {}
    for c in target_colors:
        sizes = colors.get(c, {})
        if size:
            qty = int(sizes.get(size, 0))
            if qty > 0:
                avail.setdefault(c, {})[size] = qty
        else:
            in_sizes = {s: q for s, q in sizes.items() if int(q) > 0}
            if in_sizes:
                avail[c] = in_sizes
    return {
        "in_stock": bool(avail),
        "article": article,
        "name": p.get("name"),
        "price": p.get("price"),
        "available": avail,
    }


def tool_create_lead(name, phone, article, color, size, quantity, np_branch, note=""):
    p = _find(article)
    row = [
        datetime.now().isoformat(timespec="seconds"),
        name, phone, article, color, size, quantity, np_branch,
        (p or {}).get("name", ""), (p or {}).get("price", ""), note,
    ]
    new = not os.path.exists(LEADS_FILE)
    with open(LEADS_FILE, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["час", "ім'я", "телефон", "артикул", "колір", "розмір",
                        "кількість", "відділення_НП", "назва", "ціна", "нотатка"])
        w.writerow(row)
    return {"ok": True, "message": "Заявку збережено, менеджер підтвердить найближчим часом."}


def tool_escalate_to_human(reason, phone=""):
    with open("escalations.log", "a", encoding="utf-8") as f:
        f.write(f"{datetime.now().isoformat()}\t{phone}\t{reason}\n")
    return {"ok": True, "message": "Передано менеджеру."}


TOOL_IMPL = {
    "search_products": lambda i: tool_search_products(i.get("query")),
    "check_availability": lambda i: tool_check_availability(
        i.get("article"), i.get("color"), i.get("size")),
    "create_lead": lambda i: tool_create_lead(
        i.get("name"), i.get("phone"), i.get("article"), i.get("color"),
        i.get("size"), i.get("quantity"), i.get("np_branch"), i.get("note", "")),
    "escalate_to_human": lambda i: tool_escalate_to_human(
        i.get("reason"), i.get("phone", "")),
}

# Описания инструментов для модели
TOOLS = [
    {
        "name": "search_products",
        "description": "Знайти товари за запитом (назва, категорія, артикул, колір). "
                       "Повертає список з артикулом, назвою, ціною і доступними кольорами.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Що шукає клієнт"}},
            "required": ["query"],
        },
    },
    {
        "name": "check_availability",
        "description": "Перевірити реальну наявність товару за артикулом (опційно колір і розмір). "
                       "ЗАВЖДИ викликай перед підтвердженням замовлення.",
        "input_schema": {
            "type": "object",
            "properties": {
                "article": {"type": "string"},
                "color": {"type": "string", "description": "код кольору, напр. VR046"},
                "size": {"type": "string", "description": "напр. S, M, L, XL"},
            },
            "required": ["article"],
        },
    },
    {
        "name": "create_lead",
        "description": "Оформити заявку (замовлення). Викликати ТІЛЬКИ після підтвердження клієнта "
                       "і перевірки наявності.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "phone": {"type": "string"},
                "article": {"type": "string"},
                "color": {"type": "string"},
                "size": {"type": "string"},
                "quantity": {"type": "integer"},
                "np_branch": {"type": "string", "description": "відділення Нової Пошти + місто"},
                "note": {"type": "string"},
            },
            "required": ["name", "phone", "article", "color", "size", "quantity", "np_branch"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": "Передати діалог менеджеру (складне/нестандартне питання, рекламація, опт).",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string"},
                "phone": {"type": "string"},
            },
            "required": ["reason"],
        },
    },
]

# ---------------------------------------------------------------------------
# Claude — агентный цикл с tool use (ручной, для контроля и логирования)
# ---------------------------------------------------------------------------
client = anthropic.Anthropic()  # читает ANTHROPIC_API_KEY з оточення

# Стабильный префикс (system) кешируем — економія на повторних запитах.
SYSTEM = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]


def ask_claude(history):
    """Прогоняет агентный цикл: модель ↔ инструменты. Возвращает текст ответа клиенту."""
    messages = list(history)
    for _ in range(MAX_TOOL_ITERS):
        resp = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM,
            tools=TOOLS,
            thinking={"type": "adaptive"},
            output_config={"effort": EFFORT},
            messages=messages,
        )
        # Зберігаємо повну відповідь (включно з thinking/tool_use) в історію.
        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            # повертаємо й оновлену історію, щоб діалог пам'ятав контекст
            return text or "…", messages

        # Виконуємо всі викликані інструменти й повертаємо результати.
        results = []
        for b in resp.content:
            if b.type == "tool_use":
                try:
                    out = TOOL_IMPL[b.name](b.input)
                except Exception as e:
                    out = {"error": str(e)}
                results.append({
                    "type": "tool_result",
                    "tool_use_id": b.id,
                    "content": json.dumps(out, ensure_ascii=False),
                })
        messages.append({"role": "user", "content": results})

    return "Передаю Вас менеджеру — зачекайте, будь ласка 🙂", messages


# ---------------------------------------------------------------------------
# Telegram (long polling)
# ---------------------------------------------------------------------------
HISTORIES = {}  # chat_id -> messages[]


def tg_send(chat_id, text):
    try:
        requests.post(f"{TG_API}/sendMessage",
                      json={"chat_id": chat_id, "text": text}, timeout=20)
    except requests.RequestException as e:
        print("send error:", e, file=sys.stderr)


def main():
    if not TELEGRAM_TOKEN:
        sys.exit("Встанови TELEGRAM_BOT_TOKEN (токен від @BotFather).")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Встанови ANTHROPIC_API_KEY.")
    print("Бот-консьєрж запущено. Напиши йому в Telegram. Ctrl+C — зупинити.")

    offset = None
    while True:
        try:
            r = requests.get(f"{TG_API}/getUpdates",
                             params={"timeout": 30, "offset": offset}, timeout=40)
            updates = r.json().get("result", [])
        except (requests.RequestException, ValueError) as e:
            print("poll error:", e, file=sys.stderr)
            time.sleep(3)
            continue

        for upd in updates:
            offset = upd["update_id"] + 1
            msg = upd.get("message") or {}
            chat_id = (msg.get("chat") or {}).get("id")
            text = msg.get("text")
            if not chat_id or not text:
                continue

            if text.strip() == "/start":
                HISTORIES.pop(chat_id, None)
                tg_send(chat_id, "Вітаю! Я допоможу підібрати товар і оформити замовлення. "
                                 "Що Вас цікавить? 🙂")
                continue

            hist = HISTORIES.get(chat_id, [])
            hist.append({"role": "user", "content": text})
            try:
                reply, hist = ask_claude(hist)
            except Exception as e:
                print("claude error:", e, file=sys.stderr)
                reply = "Вибачте, технічна заминка. Передаю менеджеру 🙏"
            # обмежуємо історію, щоб не роздувати контекст
            HISTORIES[chat_id] = hist[-40:]
            tg_send(chat_id, reply)


if __name__ == "__main__":
    main()
