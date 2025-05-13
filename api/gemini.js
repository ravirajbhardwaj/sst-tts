export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const body = req.body;
  console.log(body);

  if (!apiKey) {
    return res.status(500).json({ error: "Missing API key" });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const geminiData = await geminiRes.json();

    res.status(200).json(geminiData); // ✅ Return full response
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to contact Gemini API" });
  }
}
