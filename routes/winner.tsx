import { Handlers, PageProps } from "$fresh/server.ts";

interface User {
  name: string;
  email: string;
  createdAt: string;
}

interface Data {
  winner?: User;
  totalEntries: number;
  drawn: boolean;
}

export const handler: Handlers<Data> = {
  async GET(_req, ctx) {
    const kv = await Deno.openKv();
    let totalEntries = 0;
    for await (const _ of kv.list({ prefix: ["users"] })) {
      totalEntries++;
    }
    return ctx.render({ totalEntries, drawn: false });
  },

  async POST(_req, ctx) {
    const kv = await Deno.openKv();
    const users: User[] = [];
    for await (const entry of kv.list<User>({ prefix: ["users"] })) {
      users.push(entry.value);
    }

    if (users.length === 0) {
      return ctx.render({ totalEntries: 0, drawn: true });
    }

    const winner = users[Math.floor(Math.random() * users.length)];
    return ctx.render({ winner, totalEntries: users.length, drawn: true });
  },
};

export default function WinnerPage({ data }: PageProps<Data>) {
  const { winner, totalEntries, drawn } = data;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Raffle Draw — Heaviside Technologies</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <img
            src="/heaviside_banner.svg"
            alt="Heaviside Technologies"
            class="logo-img"
          />
          <p class="tagline">FROM NOISE TO SIGNAL</p>
        </header>

        <main>
          <section class="card">
            <div class="draw-header">
              <h2>Raffle Draw</h2>
              <span class="entry-badge">{totalEntries} {totalEntries === 1 ? "entry" : "entries"}</span>
            </div>

            {!drawn && (
              <div class="draw-idle">
                <div class="trophy-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d4c8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/>
                    <path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
                    <path d="M12 17v4"/>
                    <path d="M8 21h8"/>
                    <path d="M6 3h12v8a6 6 0 0 1-12 0V3z"/>
                  </svg>
                </div>
                {totalEntries === 0
                  ? <p class="draw-hint">No entries yet. Share the raffle link to collect entries.</p>
                  : <p class="draw-hint">Ready to draw. Press the button to randomly select a winner from {totalEntries} {totalEntries === 1 ? "entry" : "entries"}.</p>
                }
                <form method="POST">
                  <button type="submit" class="draw-btn" disabled={totalEntries === 0}>
                    Draw Winner
                  </button>
                </form>
              </div>
            )}

            {drawn && !winner && (
              <div class="draw-empty">
                <p>No entries to draw from.</p>
                <a href="/winner" class="reset-link">Try again</a>
              </div>
            )}

            {drawn && winner && (
              <div class="winner-reveal">
                <div class="winner-star">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#00d4c8" stroke="#00d4c8" stroke-width="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <p class="winner-label">Winner</p>
                <p class="winner-name">{winner.name}</p>
                <p class="winner-email">{winner.email}</p>
                <form method="POST">
                  <button type="submit" class="redraw-btn">Draw Again</button>
                </form>
              </div>
            )}
          </section>
        </main>

        <footer>
          <p>© {new Date().getFullYear()} Heaviside Technologies</p>
        </footer>
      </body>
    </html>
  );
}
