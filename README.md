# The Donut Stop

A lightweight React SPA with Arabic/English content and a separate `/menu` page. React Router renders pages through `MainLayout`'s `Outlet`, keeping the header and footer mounted during navigation. React context handles language; local React state handles categories and drink sizes.

## Develop and verify

Use Node.js 22.12+ (or 20.19+).

```sh
npm ci
npm run dev
npm run build
npm test
npm run preview
```

Tests inspect the production HTML, so run the build before tests.

## Structure

- `src/app/`: routes and shared layout, route metadata and scroll handling.
- `src/pages/`: Home, Menu, and NotFound.
- `src/components/`: each home section and shared component in its own folder with its styles; `menu/` contains the catalog, product cards, and menu data.
- `src/i18n/`: translations and language context (no translation dependency).
- `src/styles/`: shared design tokens, typography, and reusable card/button styles.
- `public/assets/`: original product images, posters, and logo. Public URLs remain `/assets/...`.
- `scripts/prerender.mjs`: build-time HTML rendering.
- `tests/`: catalog and generated-page regression checks.
- `output/`: existing source/export artifacts; excluded from the deployment output.

Add or edit products in `src/components/menu/menuData.js`, including both language descriptions and an image in `public/assets/`. Add home sections as components and compose them in `src/pages/Home/Home.jsx`. Add future pages beside Home and register them in `src/app/App.jsx`.

## Production hosting and SEO

Deploy only `dist/` after `npm run build`. No Node/React process is needed in production: any static web server/CDN can serve it, leaving the 512 MB RAM allowance available for other services. Run the build locally or in CI if the host's build environment is constrained; build memory is separate from serving memory.

The build prerenders `/` and `/menu/` with titles, descriptions, headings, navigation, and all donut cards before JavaScript loads. React hydrates those pages and handles same-tab navigation with the browser History API. Other menu categories are interactive and require JavaScript. Unknown routes show a 404 component with `noindex`; configure the host to return HTTP 404 for unknown URLs when supported.

Use the domain root as the deployment root. Serve `/menu` from `/menu/index.html` (or redirect it to `/menu/`). Configure unknown application routes to fall back to `/index.html` for SPA navigation. A `_redirects` file is included for hosts supporting that convention; other hosts need an equivalent setting. A simple Nginx configuration is:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Both `/menu` and `/menu/` work, and old `/#menu` links redirect client-side to `/menu`. All image paths are absolute so refreshing the menu never resolves images under `/menu/assets/`.

The production JavaScript is approximately 93 KB gzip and CSS 5 KB gzip. Images retain their existing quality and are lazy-loaded in the catalog. The existing image library accounts for approximately 172 MB on disk; disk usage is distinct from server RAM. Google Fonts retains the existing external font stylesheet with `display=swap`. No state, UI, or translation libraries were added beyond React and React Router; Vite is build-only.

References: [React Router layouts and Outlet](https://reactrouter.com/start/declarative/routing), [Vite static deployment](https://vite.dev/guide/static-deploy).

## Guest order tracking

Apply `supabase/migrations/202609180001_order_tracking.sql` after the existing migrations in the Supabase SQL editor before deploying this frontend. The guest-only RPC uses the random request UUID already generated at checkout and returns only order number, status, fulfillment, total, and branch names. It does not grant guests SELECT access to orders or expose customer details.

A tracking card appears across the customer pages after checkout, polls every 5 seconds while active, and refreshes on window focus and reconnection. Tracking tokens and display data are stored in this browser's local storage, so tracking survives reloads and navigation on the same browser. It does not send SMS or browser push notifications. Admin acceptance maps to `preparing`; `ready` tells the customer pickup/delivery is ready; `completed` confirms fulfillment; `cancelled` shows cancellation. Finished cards can be dismissed.

Run database regression checks with `PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/orders.mjs` when PGlite is available.
