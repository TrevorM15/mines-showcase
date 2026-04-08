import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async POST(req) {
    const form = await req.formData();
    const name = form.get("name")?.toString().trim();
    const organization = form.get("organization")?.toString().trim() || undefined;
    const email = form.get("email")?.toString().trim().toLowerCase();

    const origin = new URL(req.url).origin;

    if (!name || !email) {
      return new Response(null, {
        status: 303,
        headers: { Location: `${origin}/?error=Name+and+email+are+required` },
      });
    }

    const kv = await Deno.openKv();
    const key = ["users", email];
    const existing = await kv.get(key);

    if (existing.value !== null) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `${origin}/?error=This+email+is+already+registered`,
        },
      });
    }

    await kv.set(key, {
      name,
      organization,
      email,
      createdAt: new Date().toISOString(),
    });

    return new Response(null, {
      status: 303,
      headers: { Location: `${origin}/?success=1` },
    });
  },
};
