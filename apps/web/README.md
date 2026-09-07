# Monoscope Web

React/TypeScript client for the local Monoscope API.

```bash
npm install
npm run types:api
npm run dev
```

The development server proxies `/api` to `http://127.0.0.1:8000`. Set
`VITE_API_BASE_URL` when the API is served from a different origin.

Checks:

```bash
npm run lint
npm run test
npm run build
```

The API schema is generated from `../../contracts/openapi.json`. Do not edit
`src/shared/api/schema.d.ts` manually.
