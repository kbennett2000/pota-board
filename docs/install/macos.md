# Install pota-board on macOS

This gets the dashboard running on your own Mac in about 10 minutes. You don't need
to know how to code — just follow the steps in order.

> **What you're doing:** pota-board runs inside **Docker**, a free program that
> packages the app so it "just works" without you installing anything else. You
> install Docker once, download pota-board, and start it with a single command.

---

## Step 1 — Install Docker Desktop

1. Go to **https://www.docker.com/products/docker-desktop/** and download
   **Docker Desktop for Mac**. Pick **Apple Silicon** if you have an M1/M2/M3/M4
   Mac, or **Intel chip** for older Macs. (Apple menu →  **About This Mac** tells
   you which.)
2. Open the downloaded `.dmg` and drag **Docker** into **Applications**.
3. Open **Docker** from Applications and accept the defaults. Leave it running —
   wait until the whale icon in the menu bar (top of screen) is steady / says
   **"Docker Desktop is running"**.

That's the only thing you have to install.

## Step 2 — Download pota-board

1. Go to the project page: **https://github.com/kbennett2000/pota-board**
2. Click the green **`< > Code`** button → **Download ZIP**.
3. Double-click the downloaded `pota-board-main.zip` in **Downloads** to unzip it.
   Move the resulting `pota-board-main` folder somewhere you'll remember, like your
   **Documents** folder.

## Step 3 — Start it

1. Open the **Terminal** app (press **⌘ + Space**, type *Terminal*, press Enter).
2. Type `cd ` (with a space), then **drag the pota-board folder** from Finder into
   the Terminal window and press **Enter**. This points Terminal at the folder.
3. Type this and press **Enter**:

   ```bash
   docker compose up -d
   ```

4. The first time, Docker downloads and builds the app (a minute or two). When it
   finishes you'll see it report that the `pota-board` container started.

## Step 4 — Open the dashboard

Open your web browser and go to:

> ### http://localhost:8075

You should see the spot board:

![The pota-board dashboard](../screenshots/01-board-dark.png)

## Step 5 — Set your callsign

Click the **⚙ gear** (top-right) and type your callsign in **Your callsign**. It's
saved in your browser — it is *not* sent anywhere or stored in the app. Now the
**Hunted** filter knows which parks you've already worked.

🎉 **That's it — you're running pota-board.** Next, read the
[How to use the dashboard](../usage.md) guide.

---

## Everyday commands

In Terminal, pointed at the pota-board folder (Step 3):

| To… | Run |
|---|---|
| Stop the dashboard | `docker compose down` |
| Start it again | `docker compose up -d` |
| Update to a newer version | download the new ZIP, then `docker compose up -d --build` |

## Troubleshooting

- **"docker: command not found" / nothing happens** — Docker Desktop isn't running.
  Open it from Applications and wait until the menu-bar whale says it's running,
  then try Step 3 again.
- **The page won't load / "port is already allocated"** — something else on your Mac
  is using port 8075. Open `docker-compose.yml` in the pota-board folder with
  **TextEdit**, change the line `- "8075:8075"` to `- "9075:8075"`, save, run
  `docker compose up -d` again, and open **http://localhost:9075** instead.
- **It loads but shows no spots** — that usually means no internet, or the POTA feed
  is briefly down. The board retries automatically.

Prefer not to use Docker? See **[Run without Docker](without-docker.md)**.
