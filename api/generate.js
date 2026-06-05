export default async function handler(req, res) {
  const { input } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
