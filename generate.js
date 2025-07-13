export default async function handler(req, res) {
  const { input } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer sk-ВОТ_СЮДА_ВСТАВЬ_СВОЙ_КЛЮЧ",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты — AI-копирайтер. Используй структуру PERC. Выводи текст с emoji и markdown."
        },
        {
          role: "user",
          content: \`Ниша: \${input.niche}
Что делает: \${input.what_you_do}
Клиент: \${input.client_avatar}
Боль: \${input.pain}
Продукт: \${input.product}
Решение: \${input.value}
Результат: \${input.result}
Уникальность: \${input.unique}
Платформа: \${input.platform}
Формат: \${input.format}
Стиль: \${input.style}\`
        }
      ]
    })
  });

  const data = await response.json();
  res.status(200).json({ output: data.choices[0].message.content });
}