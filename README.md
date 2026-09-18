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

For the updated inventory editor, apply `supabase/migrations/202609180003_inventory_first_entry.sql` before publishing the frontend. The first donut stock entry for each branch/product needs no reason; every subsequent stock or availability change requires a reason, including additional deliveries and restocking after depletion. Existing quantities and historical stock entries initialize this flag. This is a persistent rule, not a daily reset. Drink availability changes retain their required reason. The migration enforces the rule in the database and preserves permissions, audit records, concurrency checks, and safe retries.

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

## Managed branch offers

Apply `supabase/migrations/202609190001_managed_offers.sql` after the existing migrations, then deploy the rebuilt frontend. New campaigns (6+2, 7+3, 8+4, 6+6) start disabled in every existing branch; existing daily, Tuesday and morning offers retain their enabled behavior. New branches start with all offers disabled.

Managers toggle only the four new campaigns in their assigned branches. Owners toggle all seven offers in any branch using the branch selector. Order staff have read-only access. Changes are recorded in `offer_events`; clients cannot write offer settings directly.

Enabled campaigns appear on the homepage with their participating branches. Pricing uses branch settings in the database: all new campaigns include every donut price, the cheapest units are free, full bundles repeat, and only the largest discount applies. Daily 5+1 retains its ₪6/₪7 free-item rule; 7+5 retains its Tuesday schedule in Asia/Hebron. Morning coffee remains display-only. Existing orders retain their original discounts when an offer is disabled.

Offer updates invalidate open storefronts and carts through Supabase Realtime, with a five-second polling fallback and refresh on focus. Checkout locks offer settings during pricing and rejects an outdated expected total. The migration adds `branch_offers` to `supabase_realtime` when that publication exists. No active offers are hardcoded into prerendered HTML, preventing disabled posters from flashing on load.

New poster files are under `public/assets/offers/`; the built-in image generation prompt for the 6+6 design is documented in that directory's `README.md`.
