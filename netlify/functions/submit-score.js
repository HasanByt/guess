export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { name, tries } = await req.json();

    if (
      !name ||
      typeof name !== "string" ||
      name.length < 2 ||
      name.length > 20 ||
      !Number.isInteger(tries)
    ) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
      });
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const key = "scores";
    const member = `${name}::${Date.now()}`;

    // ZADD scores <tries> <member>
    const res = await fetch(
      `${url}/zadd/${key}/${tries}/${encodeURIComponent(member)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      return new Response(
        JSON.stringify({ error: "Upstash error", details: txt }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err) }),
      { status: 500 }
    );
  }
};
