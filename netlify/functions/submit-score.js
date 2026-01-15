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

    const key = "ngg:scores";

    // ✅ Member ist jetzt stabil: "Hasan::4"
    // Dadurch kann Redis Duplikate verhindern.
    const member = `${cleanName}::${cleanTries}`;

    // ✅ NX: nur hinzufügen wenn member noch nicht existiert
    // ZADD key NX score member
    const upstashUrl = `${url}/zadd/${encodeURIComponent(key)}/NX/${cleanTries}/${encodeURIComponent(
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

    const data = await r.json();
    // Upstash gibt typischerweise result: 1 (added) oder 0 (not added)
    const added = Number(data?.result) === 1;

    return new Response(JSON.stringify({ ok: true, added }), {
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
