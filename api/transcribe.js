// Расшифровка аудио через OpenAI Whisper.
// Клиент извлекает аудио из видео в браузере (ffmpeg.wasm), кодирует в base64
// и присылает сюда. Возвращаем сегменты с тайм-кодами.
export const config = {
  api: {
    bodyParser: { sizeLimit: "25mb" },
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

  const { audioBase64, filename = "audio.webm", language } = req.body || {};
  if (!audioBase64) {
    return res.status(400).json({ error: "Не передан audioBase64" });
  }

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([buffer]), filename);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    if (language) form.append("language", language);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Ошибка Whisper" });
    }

    const segments = (data.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    res.status(200).json({ text: data.text, language: data.language, segments });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
