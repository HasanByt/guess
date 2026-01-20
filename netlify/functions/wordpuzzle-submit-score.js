export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { name, score } = await req.json();

    const cleanName = sanitizeName(name);
    const cleanScore = Number(score);

    if (!cleanName) {
      return new Response(JSON.stringify({ error: "Ungültiger Name (2-20 Zeichen)." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Number.isInteger(cleanScore) || cleanScore < 0 || cleanScore > 9999) {
      return new Response(JSON.stringify({ error: "Ungültiger Score (0-9999)." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return new Response(JSON.stringify({ error: "Missing Upstash env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const key = "wordPuzzleScore";
    const member = `${cleanName}::${cleanScore}`;

    const BIG = 10_000_000_000_000; // 1e13
    const ts = Date.now();
    const compositeScore = cleanScore * BIG + ts;

    const upstashUrl = `${url}/zadd/${encodeURIComponent(key)}/${compositeScore}/${encodeURIComponent(member)}`;

    const r = await fetch(upstashUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "Upstash error", details: t }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", details: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 20) return null;
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
  return clean;
}
