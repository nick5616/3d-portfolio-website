export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
            return;
        }

        const { input, history } = req.body || {};
        if (!input || typeof input !== "string") {
            res.status(400).json({ error: "Invalid input" });
            return;
        }

        const recentContext = Array.isArray(history) ? history.slice(-10) : [];

        const messages = [
            {
                role: "system",
                content:
                    "You are a retro CRT computer from Courage the Cowardly Dog. You are witty, snarky, but PG and helpful. Keep responses short, 1-3 lines.",
            },
            ...recentContext.map((line) => ({ role: "user", content: line })),
            { role: "user", content: input },
        ];

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages,
                    temperature: 0.6,
                    max_tokens: 200,
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            res.status(response.status).json({ error: text });
            return;
        }

        const data = await response.json();
        const text =
            data?.choices?.[0]?.message?.content?.trim?.() || "[no response]";

        res.status(200).json({ text });
    } catch (err) {
        res.status(500).json({ error: err?.message || "Unknown error" });
    }
}
