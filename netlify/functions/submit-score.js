export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { name, tries } = await req.json();

    const cleanName = sanitizeName(name);
    const cleanTries = Number(tries);

    if (!cleanName) {
      return new Response(JSON.stringify({ error: "Ungültiger Name (2-20 Zeichen)." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Number.isInteger(cleanTries) || cleanTries < 1 || cleanTries > 999) {
      return new Response(JSON.stringify({ error: "Ungültige Versuche (1-999)." }), {
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

    const key = "scores"; // <- oder "ngg:scores", aber in beiden Files gleich!
    const member = `${cleanName}::${cleanTries}`;

    // ---- Composite Score ----
    // Größerer Score = weiter oben (wir nutzen ZREVRANGE)
    // (1000 - tries) priorisiert weniger Versuche
    // timestamp sorgt bei Gleichstand für "neuester gewinnt"
    const BIG = 10_000_000_000_000; // 1e13 (größer als Date.now())
    const ts = Date.now();
    const compositeScore = (1000 - cleanTries) * BIG + ts;

    const upstashUrl = `${url}/zadd/${encodeURIComponent(key)}/${compositeScore}/${encodeURIComponent(
      member
    )}`;

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

    // Redis: wenn Member schon existiert, wird er NICHT doppelt gespeichert,
    // sondern sein Score wird aktualisiert.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
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
