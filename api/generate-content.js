// Подбор лучших моментов интервью + продающие тексты под каждый клип.
// На вход — сегменты с тайм-кодами и настройки. На выход — клипы с тайм-кодами и копирайтингом.
export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY не задан в переменных окружения" });
  }

  const {
    segments = [],
    niche = "",
    product = "",
    style = "энергичный, разговорный",
    platforms = ["shorts"],
    clipCount = 6,
    clipMin = 15,
    clipMax = 60,
  } = req.body || {};

  if (!segments.length) {
    return res.status(400).json({ error: "Не переданы segments" });
  }

  // Компактный транскрипт с тайм-кодами для модели
  const transcript = segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join("\n");

  const platformList = platforms.join(", ");

  const system = `Ты — продюсер коротких видео и AI-копирайтер.
Тебе дают расшифровку интервью с тайм-кодами в секундах.
Задача: выбрать самые сильные, цепляющие, законченные по смыслу фрагменты для нарезки в Reels/Shorts/TikTok.
Под каждый фрагмент напиши продающий копирайтинг.
Отвечай СТРОГО валидным JSON без markdown.`;

  const user = `Ниша: ${niche || "не указана"}
Продукт/услуга: ${product || "не указан"}
Стиль текстов: ${style}
Платформы: ${platformList}
Нужно клипов: ${clipCount}
Длительность каждого клипа: от ${clipMin} до ${clipMax} секунд.

Расшифровка:
${transcript}

Верни JSON такого вида:
{
  "clips": [
    {
      "start": число_секунд,
      "end": число_секунд,
      "reason": "почему этот момент сильный",
      "transcript": "что говорится в клипе",
      "hook": "цепляющая фраза для первых 3 секунд",
      "title": "заголовок поста",
      "description": "продающее описание с emoji",
      "hashtags": ["#тег1", "#тег2"]
    }
  ]
}
Тайм-коды бери строго из расшифровки. Не выдумывай фрагменты, которых нет.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Ошибка OpenAI" });
    }

    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      return res.status(502).json({ error: "Модель вернула невалидный JSON" });
    }

    res.status(200).json({ clips: parsed.clips || [] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
