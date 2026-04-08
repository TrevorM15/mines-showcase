import { Handlers, PageProps } from "$fresh/server.ts";

interface User {
  name: string;
  email: string;
  createdAt: string;
}

interface Data {
  users: User[];
  editing?: string;
  error?: string;
  success?: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const editing = url.searchParams.get("editing") ?? undefined;
    const error = url.searchParams.get("error") ?? undefined;
    const success = url.searchParams.get("success") ?? undefined;

    const kv = await Deno.openKv();
    const users: User[] = [];
    for await (const entry of kv.list<User>({ prefix: ["users"] })) {
      users.push(entry.value);
    }
    users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return ctx.render({ users, editing, error, success });
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const action = form.get("action")?.toString();
    const origin = new URL(req.url).origin;
    const kv = await Deno.openKv();

    if (action === "delete") {
      const email = form.get("email")?.toString().trim().toLowerCase();
      if (email) {
        await kv.delete(["users", email]);
      }
      return new Response(null, {
        status: 303,
        headers: { Location: `${origin}/manage?success=Entry+deleted` },
      });
    }

    if (action === "update") {
      const oldEmail = form.get("oldEmail")?.toString().trim().toLowerCase();
      const newName = form.get("name")?.toString().trim();
      const newEmail = form.get("email")?.toString().trim().toLowerCase();

      if (!oldEmail || !newName || !newEmail) {
        return new Response(null, {
          status: 303,
          headers: {
            Location: `${origin}/manage?error=All+fields+are+required&editing=${encodeURIComponent(oldEmail ?? "")}`,
          },
        });
      }

      const existing = await kv.get<User>(["users", oldEmail]);
      if (!existing.value) {
        return new Response(null, {
          status: 303,
          headers: { Location: `${origin}/manage?error=Entry+not+found` },
        });
      }

      if (newEmail !== oldEmail) {
        const conflict = await kv.get(["users", newEmail]);
        if (conflict.value !== null) {
          return new Response(null, {
            status: 303,
            headers: {
              Location: `${origin}/manage?error=That+email+is+already+registered&editing=${encodeURIComponent(oldEmail)}`,
            },
          });
        }
        await kv.delete(["users", oldEmail]);
      }

      await kv.set(["users", newEmail], {
        name: newName,
        email: newEmail,
        createdAt: existing.value.createdAt,
      });

      return new Response(null, {
        status: 303,
        headers: { Location: `${origin}/manage?success=Entry+updated` },
      });
    }

    return new Response(null, {
      status: 303,
      headers: { Location: `${origin}/manage` },
    });
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ManagePage({ data }: PageProps<Data>) {
  const { users, editing, error, success } = data;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Manage Entries — Heaviside Technologies</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <img src="/heaviside_banner.svg" alt="Heaviside Technologies" class="logo-img" />
          <p class="tagline">FROM NOISE TO SIGNAL</p>
        </header>

        <main class="main-wide">
          <div class="manage-header">
            <div>
              <h2>Manage Entries</h2>
              <p class="manage-subtitle">{users.length} total {users.length === 1 ? "entry" : "entries"}</p>
            </div>
            <a href="/" class="back-link">← Back to raffle</a>
          </div>

          {success && <p class="alert alert-success">{decodeURIComponent(success)}</p>}
          {error && <p class="alert alert-error">{decodeURIComponent(error)}</p>}

          {users.length === 0
            ? (
              <div class="card empty-state">
                <p>No entries yet.</p>
              </div>
            )
            : (
              <div class="card no-pad">
                <table class="entry-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Entered</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) =>
                      editing === u.email
                        ? (
                          <tr key={u.email} class="edit-row">
                            <td class="row-num">{i + 1}</td>
                            <td colspan={3}>
                              <form method="POST" class="edit-form">
                                <input type="hidden" name="action" value="update" />
                                <input type="hidden" name="oldEmail" value={u.email} />
                                <input
                                  type="text"
                                  name="name"
                                  value={u.name}
                                  placeholder="Full name"
                                  required
                                  class="edit-input"
                                />
                                <input
                                  type="email"
                                  name="email"
                                  value={u.email}
                                  placeholder="Email"
                                  required
                                  class="edit-input"
                                />
                                <div class="edit-actions">
                                  <button type="submit" class="btn-save">Save</button>
                                  <a href="/manage" class="btn-cancel">Cancel</a>
                                </div>
                              </form>
                            </td>
                            <td></td>
                          </tr>
                        )
                        : (
                          <tr key={u.email}>
                            <td class="row-num">{i + 1}</td>
                            <td class="col-name">{u.name}</td>
                            <td class="col-email">{u.email}</td>
                            <td class="col-date">{formatDate(u.createdAt)}</td>
                            <td class="col-actions">
                              <a
                                href={`/manage?editing=${encodeURIComponent(u.email)}`}
                                class="btn-edit"
                              >
                                Edit
                              </a>
                              <form method="POST" class="inline-form">
                                <input type="hidden" name="action" value="delete" />
                                <input type="hidden" name="email" value={u.email} />
                                <button
                                  type="submit"
                                  class="btn-delete"
                                  onclick="return confirm('Delete this entry?')"
                                >
                                  Delete
                                </button>
                              </form>
                            </td>
                          </tr>
                        )
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </main>

        <footer>
          <p>© {new Date().getFullYear()} Heaviside Technologies</p>
        </footer>
      </body>
    </html>
  );
}
