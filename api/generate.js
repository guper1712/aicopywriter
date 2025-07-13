export default async function handler(req, res) {
  const { input } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer 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", // вставь сюда свой ключ
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты AI-ассистент, который помогает собрать ответы у клиента для генерации продающего текста.",
        },
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  const data = await response.json();

  res.status(200).json({ result: data.choices[0].message.content });
}
