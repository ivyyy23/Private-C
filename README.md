# Private-C

Chrome extension (Manifest V3) for privacy monitoring: onboarding, popup stats, threat overlays, a full React dashboard, and optional sync to a local **MongoDB**-backed API.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | v18+ recommended (for `npm` scripts). |
| **Google Chrome** (or Chromium) | For loading the unpacked extension. |
| **MongoDB** | Optional for extension-only use; **required** for the sync API. Local install or Docker (see below). |

## Repository layout

| Path | Role |
|------|------|
| `manifest.json` | MV3 manifest (popup, background, content scripts, options/dashboard page). |
| `background/background.js` | Service worker: state, tab updates, threat signals, server sync. |
| `popup/` | Toolbar popup UI. |
| `onboarding/` | Redirects to dashboard setup (`#/auth/login`). |
| `content/` | In-page threat banner (`threat-warning.js` / `.css`). |
| `dashboard/` | Vite + React dashboard (built to `dashboard/dist/` for the extension). |
| `server/` | Express + Mongoose API for persisting extension state. |

## Dependencies

### Extension runtime (no install)

The unpacked extension uses only the browser and built assets under `dashboard/dist/`. No Node process is required for end users.

### Dashboard (`dashboard/package.json`)

**Runtime**

- `react`, `react-dom`
- `react-router-dom`
- `lucide-react`
- `clsx`
- `recharts`

**Development**

- `vite`
- `@vitejs/plugin-react`
- `tailwindcss`, `@tailwindcss/vite`

Install:

```bash
cd dashboard
npm install
```

### API server (`server/package.json`)

**Runtime**

- `express`
- `mongoose`
- `cors`
- `dotenv`

Install:

```bash
cd server
npm install
```

### Python

This project does **not** ship Python application code. There is no `pip` environment to install for the extension or API. See `requirements.txt` for a short note and pointers to Node dependencies.

## Configuration

### API / MongoDB (`server/.env`)

Copy the example and edit:

```bash
cp server/.env.example server/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/private_c` | MongoDB connection string (local or Atlas). |
| `PORT` | `3847` | HTTP port for the API (bound to `127.0.0.1`). |

The extension background worker posts to `http://127.0.0.1:3847` by default. You can override the base URL from the dashboard **Settings** page (stored as `privateCApiBase` in `chrome.storage.local`).

## Running everything

### 1. MongoDB

**Docker (simple local dev):**

```bash
docker run -d --name private-c-mongo -p 27017:27017 mongo:7
```

Or use an existing MongoDB instance and set `MONGODB_URI` in `server/.env`.

### 2. API server

```bash
cd server
npm install   # first time
npm start
```

- Health: [http://127.0.0.1:3847/health](http://127.0.0.1:3847/health)
- `POST /api/state` — body: `{ "clientId": "<uuid>", "state": { ... } }`
- `GET /api/state?clientId=<uuid>`

### 3. Dashboard build (required for the extension UI)

The manifest’s options page points at `dashboard/dist/index.html`.

```bash
cd dashboard
npm install   # first time
npm run build
```

After UI changes, run `npm run build` again before testing the extension.

**Optional — Vite dev server** (browser only; not the same as the packed extension):

```bash
cd dashboard
npm run dev
```

Open the URL Vite prints (e.g. `http://127.0.0.1:5173`). Chrome extension APIs are only available when the app is opened as an extension page.

### 4. Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select this repository’s root folder (`Private-C`).
4. On first install, the **dashboard sign-in** tab opens (sign up → preferences → notifications → dashboard).

**Open the full dashboard**

- Extension toolbar → **Open full dashboard** in the popup, or  
- `chrome://extensions` → Private-C → **Extension options** (opens the dashboard tab).

Routing uses hash URLs (e.g. `.../index.html#/settings`) so paths work under `chrome-extension://`.

## Demo threat hosts

Mock threats are defined in `background/background.js` (`THREAT_HOSTS`):

- `malware-test.example`
- `track-heavy.example`
- `phishy-login.example`

## Related UI (standalone)

A separate app with matching routes and theme can live alongside this repo (e.g. **Private-C-dash / Privat_C_Dash**). This extension’s dashboard is aligned with that design; it does not need to be in the same folder to run.

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Options page is blank or broken | Run `npm run build` in `dashboard/` so `dashboard/dist/` exists and is current. |
| API sync errors in the background console | MongoDB running? `server` started? `GET /health` returns `"ok": true`. |
| CORS / network | API allows browser/extension origins via `cors`; default API is localhost only. |

## License

See `package.json` files in `dashboard/` and `server/` (ISC / private as marked).
