exports.handler = async (event) => {
    try {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
                body: JSON.stringify({ error: "Method not allowed" }),
            };
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
                body: JSON.stringify({
                    error: "Missing OPENAI_API_KEY on server",
                }),
            };
        }

        const body = event.body ? JSON.parse(event.body) : {};
        const input = body?.input ?? "";
        const history = Array.isArray(body?.history) ? body.history : [];

        if (!input || typeof input !== "string") {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
                body: JSON.stringify({ error: "Invalid input" }),
            };
        }

        const recentContext = history.slice(-10);

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
            return {
                statusCode: response.status,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
                body: JSON.stringify({ error: text }),
            };
        }

        const data = await response.json();
        const text =
            data?.choices?.[0]?.message?.content?.trim?.() || "[no response]";

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
            body: JSON.stringify({ text }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
            body: JSON.stringify({ error: err?.message || "Unknown error" }),
        };
    }
};
