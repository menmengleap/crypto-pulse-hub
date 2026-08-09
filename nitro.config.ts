// Nitro runtime configuration for the production build (node-server preset).
//
// The Go backend runs as a separate Render service. The frontend proxies /api/*
// to it so that OAuth provider callbacks (which are registered against the
// frontend origin, e.g. https://cryptolytic-frontend.onrender.com/api/auth/...)
// reach the backend without requiring cross-origin redirects.
export default defineNitroConfig({
  routeRules: {
    "/api/**": {
      proxy: `${process.env.NITRO_API_PROXY ?? "https://cryptolytic-api.onrender.com"}/api/**`,
    },
  },
});
