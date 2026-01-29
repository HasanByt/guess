export default async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
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

    const key = "flappyScore";

    const r = await fetch(
      `${url}/zrevrange/${encodeURIComponent(key)}/0/9/WITHSCORES`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "Upstash error", details: t }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const arr = data?.result || [];

    const rows = [];
    for (let i = 0; i < arr.length; i += 2) {
      const member = String(arr[i] ?? "");
      const parts = member.split("::");
      const name = (parts[0] || "?").trim();
      const score = Number(parts[1]);

      if (!name || !Number.isFinite(score)) continue;
      rows.push({ name, score });
    }

    return new Response(JSON.stringify(rows), {
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
