// Nitro runtime configuration for the production build (node-server preset).
//
// The Go backend (cryptolytic-api) is already deployed on Render as a separate
// service. The browser only ever talks to THIS origin — /api/** is proxied to
// the backend so the console (login, API keys, usage, calculate) works without
// needing CORS changes on the deployed backend, exactly like the main
// cryptolytic-frontend app does.
//
// The proxy target can be overridden at build time with NITRO_API_PROXY.
export default defineNitroConfig({
  preset: "node-server",
  routeRules: {
    "/api/**": {
      proxy: `${process.env.NITRO_API_PROXY ?? "https://cryptolytic-api.onrender.com"}/api/**`,
    },
  },
});
