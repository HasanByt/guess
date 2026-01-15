export default async () => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const key = "scores";

    // ZRANGE scores 0 9 WITHSCORES
    const res = await fetch(`${url}/zrange/${key}/0/9/WITHSCORES`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(
        JSON.stringify({ error: "Upstash error", details: txt }),
        { status: 500 }
      );
    }

    const data = await res.json();

    const result = [];
    for (let i = 0; i < data.result.length; i += 2) {
      const rawName = data.result[i];
      const tries = Number(data.result[i + 1]);

      // name::timestamp -> name
      const name = rawName.split("::")[0];

      result.push({ name, tries });
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err) }),
      { status: 500 }
    );
  }
};
