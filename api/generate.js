// Сбор ответов клиента для генерации продающего текста.
// Ключ берётся из переменной окружения OPENAI_API_KEY (никогда не храните ключ в коде!).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY не задан в переменных окружения" });
  }

  const { input } = req.body || {};
  if (!input) {
    return res.status(400).json({ error: "Не передан input" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Ты AI-ассистент, который помогает собрать ответы у клиента для генерации продающего текста.",
          },
          {
            role: "user",
            content: input,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Ошибка OpenAI" });
    }
    res.status(200).json({ result: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
