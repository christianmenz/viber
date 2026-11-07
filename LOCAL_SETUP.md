# Local setup

Dependencies are installed. Node.js 22 is available.

1. Set `AZURE_OPENAI_API_KEY` in `.env` to your Azure OpenAI key.
2. Confirm the endpoint and deployment in `.env` match your Azure resource. Azure settings are controlled by the backend; saved browser settings cannot override them.
3. Run `npm run build`, then `npm run dev:server`.
4. Open http://localhost:4000. Default login: `fd25` / `fd25`.

Restart the server after changing `.env`. The key stays on the backend. `.env` is ignored by Git; do not commit credentials.

For frontend development, run `npm run dev:server` and `npm run dev` in separate terminals, then open the Vite URL.

Without an Azure key, the page loads but login and AI generation return a configuration error.

Selected existing Foundry deployment: `fibu3-gpt5.6-terra-prod` (`gpt-5.6-terra`, version `2026-07-09`), East US 2. The Chat Completions API version follows the deployment’s Foundry sample. No Azure resources were created.

## Game workshop

- Simple conversation with game idea cards and follow-up suggestions.
- A server-owned game prompt emphasizes complete games, score, restart, touch controls and self-contained assets.
- Recent conversation and the current edited game are supplied on every follow-up. Old code versions are omitted from history.
- Completed games open in the play tab automatically. One generated change can be undone.
- Preview scripts run in an isolated iframe without same-origin access. The code tab uses locally bundled Monaco without a CDN dependency (20px default, adjustable from 14px to 32px).
- `npm test`, `npm run lint`, and `npm run build` validate the implementation.

The original login design is unchanged: login checks credentials, but `/api/generate` has no server-side login/session check. Do not treat the login screen as access control for a publicly exposed service.
