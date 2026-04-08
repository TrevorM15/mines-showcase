import { Handlers, PageProps } from "$fresh/server.ts";

interface User {
  name: string;
  email: string;
  createdAt: string;
}

interface Data {
  users: User[];
  error?: string;
  success?: boolean;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const error = url.searchParams.get("error") ?? undefined;
    const success = url.searchParams.get("success") === "1";

    const kv = await Deno.openKv();
    const users: User[] = [];
    for await (const entry of kv.list<User>({ prefix: ["users"] })) {
      users.push(entry.value);
    }

    return ctx.render({ users, error, success });
  },
};

function HeavisideLogo() {
  return (
    <header class="site-header">
      <img
        src="/heaviside_banner.svg"
        alt="Heaviside Technologies"
        class="logo-img"
      />
      <p class="tagline">FROM NOISE TO SIGNAL</p>
    </header>
  );
}

export default function Home({ data }: PageProps<Data>) {
  const { users, error, success } = data;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Heaviside Technologies — Raffle</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <HeavisideLogo />

        <main>
          <section class="card">
            <div class="card-header">
              <div class="card-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <circle cx="12" cy="12" r="1" fill="#00d4c8" />
                </svg>
              </div>
              <div>
                <h2>Enter the Raffle</h2>
                <p class="card-subtitle">
                  Enter your contact information below for a chance to win. One entry per email address.
                </p>
              </div>
            </div>

            {success && (
              <p class="alert alert-success">
                You're in! Your entry has been recorded. Good luck!
              </p>
            )}
            {error && (
              <p class="alert alert-error">{decodeURIComponent(error)}</p>
            )}

            <form method="POST" action="/api/submit">
              <div class="field">
                <label for="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div class="field">
                <label for="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="jane@example.com"
                  required
                />
              </div>
              <button type="submit">Submit Entry</button>
            </form>
          </section>

          {users.length > 0 && (
            <section class="card">
              <h3 class="entries-heading">
                <span class="entries-count">{users.length}</span>
                {users.length === 1 ? " Entry" : " Entries"}
              </h3>
              <ul class="user-list">
                {users.map((u) => (
                  <li key={u.email}>
                    <span class="user-name">{u.name}</span>
                    <span class="user-email">{u.email}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <footer>
          <p>© {new Date().getFullYear()} Heaviside Technologies</p>
        </footer>
      </body>
    </html>
  );
}
