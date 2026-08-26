# Frontend

Next.js App Router application using React, TypeScript, and Tailwind CSS.

```bash
npm run dev --workspace frontend
```

Browser requests use the same-origin `/api` path, which Next.js proxies to
`BACKEND_API_URL` (default: `http://localhost:4000/api`). This avoids CORS and
works when the storefront is opened through a LAN hostname or IP address.
`NEXT_PUBLIC_API_URL` can optionally bypass the proxy.

## Storefront routes

- `/` — homepage with live categories and latest products
- `/products` — searchable, filterable, sortable product catalog
- `/products/[slug]` — product details, variants, pricing, and availability
- `/categories/[slug]` — category-specific catalog
- `/login` and `/register` — authentication entry points
- `/cart` — authenticated, inventory-aware shopping cart
- `/checkout` — address capture and transactional order placement
- `/orders` and `/orders/[id]` — customer order history and detail
- `/wishlist` — authenticated saved-product collection
- `/support` and `/support/[id]` — customer ticket creation and conversations
- `/admin` — live sales, order, inventory, product, customer, and support analytics
- `/admin/products` — product listing and create/edit workflows
- `/admin/categories` — category visibility and creation
- `/admin/inventory` — variant, pricing, and stock management
- `/admin/orders` and `/admin/orders/[id]` — order fulfillment management
- `/admin/support` and `/admin/support/[id]` — admin/support-agent ticket inbox
- `/admin/ai` — product copy, review summary, support trend, and reply-draft tools

Catalog pages fetch the NestJS API directly. If the API is unavailable, pages remain renderable and show an explicit offline state.
Admin pages require a signed-in user with the `admin` role and use credentialed catalog requests.
Product details include wishlist controls, public review summaries, verified-purchase labels, and authenticated review submission.
The storefront shell also includes an authenticated shopping-assistant panel. It
maintains a backend conversation session and renders only product recommendations
validated against live catalog and inventory data.
The `/support` page includes a separate account-aware AI support conversation.
Customers can ask about their real orders and follow a generated escalation into
the standard ticket detail page.

## Localization

The storefront supports English (`en`) and Georgian (`ka`) without changing route
URLs. The language selector stores a one-year `locale` cookie, refreshes the current
App Router route, and updates the document's `lang` attribute. Server components use
`getTranslations()` from `lib/i18n/server.ts`; client components use
`useTranslations()` from the shared provider. Translation keys and both dictionaries
live in `lib/i18n/messages.ts`.

Shared navigation, account controls, footer, homepage, catalog listing/filter cards,
login, and registration are localized. Product/category names and descriptions are
database content and remain in their authored language; multilingual catalog content
will require localized database fields rather than UI dictionary entries.
