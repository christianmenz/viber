# Viber Lab

A simple game-making workshop for kids: describe an idea, play the generated game, and improve it through conversation. React, TypeScript, Vite, and an Express backend calling an existing Azure OpenAI deployment.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
cp .env.example .env
```

Set `AZURE_OPENAI_API_KEY` in `.env`. The default model configuration matches the existing `fibu3-gpt5.6-terra-prod` deployment in East US 2. Override `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and `AZURE_OPENAI_API_VERSION` if needed; model configuration and the key stay on the backend.

```sh
npm run build
npm run dev:server
```

Open http://localhost:4000. Login defaults to `fd25` / `fd25`; configure `APP_LOGIN_USER` and `APP_LOGIN_PASSWORD` to override them. Restart the backend after changing environment variables.

For frontend development, run `npm run dev:server` and `npm run dev` in separate terminals, then open the Vite URL. `/api` is proxied to port 4000.

## Workshop features

- Editable starter ideas and suggestions for the next game improvement.
- A single model call per request, with a game-focused system prompt in `server/gamePrompt.js`.
- Recent conversation plus current game code for follow-up requests.
- Automatic play preview, one-step undo, a locally bundled Monaco editor with 20px default text and size controls, and HTML download.
- Self-contained games with keyboard/touch controls, scoring, and restart guidance.
- A pixel-art mascot, locally hosted typography, a CRT-style monitor frame and an expanded play mode. The desktop workspace fits the viewport; chat history scrolls within its panel.
- “Simple Code” shows small, real source excerpts in Monaco, with explanations and original line numbers. Kids can edit entire functions or CSS blocks and run the result. AI selects and annotates useful gameplay sections; older games can expose short gameplay functions and CSS blocks automatically. The full source remains available as “Profi-Code”.
- Generated scripts run in a sandboxed iframe without same-origin privileges.

## Checks

```sh
npm test
npm run lint
npm run build
```

Tests cover follow-up context, extraction of game code, and backend-owned Azure settings. Live browser testing generated a Memory game, upgraded and repaired it through conversation, and played through to victory and replay. A second fresh request generated a space game and its start/keyboard flow was exercised.

## Render

Build command: `npm ci && npm run build`. Start command: `npm run dev:server`. Set `AZURE_OPENAI_API_KEY` in the service environment. Render supplies `PORT`. Existing browser model settings are ignored by the backend.

The original authentication is minimal: `/api/login` checks credentials, but `/api/generate` does not verify a server-side login session. The login screen is not sufficient access control for public deployment. Dependency security findings from the initial installation have not been remediated in this change.
