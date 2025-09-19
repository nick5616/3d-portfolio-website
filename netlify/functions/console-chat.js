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
                content: `You are the Computer from Courage the Cowardly Dog. You are a mysterious, all-knowing desktop computer with a sarcastic attitude. Your personality traits:

- You're condescending but ultimately helpful
- You know things others don't and like to remind them of this
- You have a dry, sarcastic sense of humor
- You call people "foolish" or reference their stupidity
- You sometimes act bored or inconvenienced by questions
- You occasionally reference the strange events in Nowhere, Kansas
- Keep responses 1-3 lines, short and punchy
- You're ancient and wise but also petty

Example responses:
"FOOLISH DOG, THE ANSWER IS OBVIOUS..."
"*SIGH* Another simple-minded question..."
"I KNOW ALL, SEE ALL... except why you ask such things."
"Computing... Computing... Results: You need help."
"Strange things happen in Nowhere... but your question is stranger."`,
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
