# Backend

NestJS TypeScript API with global configuration, CORS, request validation, Prisma ORM, PostgreSQL, and a health endpoint.

```bash
npm run start:dev --workspace backend
```

Copy `.env.example` to `.env` before local development. The API requires PostgreSQL to be available at the configured URL.

## Database

Create a PostgreSQL database named `ai_commerce`, then configure `DATABASE_URL` in `.env`.

```bash
npm run prisma:generate --workspace backend
npm run prisma:deploy --workspace backend
npm run prisma:seed --workspace backend
```

For schema changes during local development:

```bash
npm run prisma:migrate --workspace backend -- --name describe_your_change
```

The idempotent seed creates customer, admin, and support-agent roles; three development users; two categories; two products with variants and inventory; and a sample coupon. Seeded users share the development-only password `Commerce123!`.

## Authentication

The API accepts its 15-minute JWT from the HTTP-only `access_token` cookie or an `Authorization: Bearer <token>` header.

| Method | Route | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/logout` | Public; clears the browser cookie |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/auth/admin-check` | Admin only |

Set a unique `JWT_SECRET` containing at least 32 random characters in `.env`. Bearer-token clients must discard their token on logout; browser clients have their authentication cookie cleared by the API.

## Catalog API

Public reads:

- `GET /api/categories`
- `GET /api/categories/:idOrSlug`
- `GET /api/products`
- `GET /api/products/:idOrSlug`

Product listing supports `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, and `limit` query parameters. Sort values are `newest`, `name_asc`, `name_desc`, `price_asc`, and `price_desc`.

Admin-protected writes:

- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/products/:productId/variants`
- `PATCH /api/products/:productId/variants/:variantId`
- `DELETE /api/products/:productId/variants/:variantId`

Admins can include inactive catalog records through `GET /api/categories/admin/all`, `GET /api/products/admin/all`, and their corresponding `admin/:idOrSlug` detail routes. Product and variant deletion is soft deletion so historical order records remain intact.

## Cart API

All cart routes require authentication. Carts are attached to users and quantities are validated against current inventory minus reserved units.

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`

Adding the same variant again merges its quantity into the existing line. Removing or changing a cart line is scoped to the authenticated owner.

## Orders API

- `POST /api/orders` — convert the authenticated user’s cart into an order
- `GET /api/orders/me` — customer order history
- `GET /api/orders/:id` — owner or admin order detail
- `GET /api/orders` — admin order listing
- `PATCH /api/orders/:id/status` — admin status transition

Order creation uses a serializable database transaction to revalidate and deduct inventory, snapshot product/address data, create order items, and clear the cart atomically. Cancelling an order restores its variant inventory. Payment collection is intentionally not part of this milestone.

## Wishlist and reviews

Wishlist routes require authentication:

- `GET /api/wishlist`
- `POST /api/wishlist/items`
- `DELETE /api/wishlist/items/:productId`

Product reviews are publicly readable and require authentication to submit:

- `GET /api/products/:productId/reviews`
- `POST /api/products/:productId/reviews`

Wishlist additions are idempotent. Customers may publish one review per product, and a review is marked as a verified purchase only when the customer has a delivered order containing that product.

## Support tickets

Customer routes:

- `POST /api/tickets`
- `GET /api/tickets/me`
- `GET /api/tickets/:id`
- `POST /api/tickets/:id/messages`

Admin and support-agent routes:

- `GET /api/tickets`
- `PATCH /api/tickets/:id/assign-self`
- `PATCH /api/tickets/:id/status`

Ticket detail and message access is owner-scoped for customers. Staff can claim tickets, add customer-visible replies or internal notes, link conversations to orders, and move tickets through validated support states. Internal notes are never returned to customers.

## AI shopping assistant

`POST /api/ai/shop-assistant` requires authentication and accepts a message plus
an optional `sessionId`. Configure `OPENAI_API_KEY` in `.env`; `AI_MODEL`
defaults to `gpt-5.6-terra` and can be overridden.

The assistant is grounded in the store database:

1. The model converts the conversation into structured catalog filters.
2. Prisma searches active products, variants, prices, attributes, and available inventory.
3. The model composes an answer using only those database results.
4. Recommended IDs are validated against the query results before they reach the client.
5. Messages and recommendation events are persisted for conversation continuity and analytics.

No mock response is substituted when OpenAI is unavailable. The endpoint returns
`503 Service Unavailable` so callers cannot mistake ungrounded content for a real
store recommendation.

## AI support assistant

`POST /api/ai/support-assistant` requires authentication and accepts a message
plus an optional `sessionId`. It uses the same `OPENAI_API_KEY` and optional
`AI_MODEL` settings as the shopping assistant.

The assistant receives a bounded view of the signed-in customer's recent orders,
payment states, items, and recent tickets together with explicit store help facts.
It cannot retrieve another customer's conversation or link a generated answer to
an order ID that was not returned by the database. When an issue needs human action
or investigation, it creates a normal support ticket that immediately appears in
the existing customer and staff ticket workflows. Chat messages and escalation
metadata are saved in `chat_sessions` and `chat_messages`.

## Admin AI tools

All outputs are structured drafts generated through the Responses API. The API
does not automatically publish product copy or send support replies.

- `POST /api/ai/generate-product-copy` — admin; creates copy from factual notes
- `POST /api/ai/summarize-reviews` — admin; summarizes up to 100 real published reviews
- `POST /api/ai/summarize-support-issues` — admin/support agent; analyzes up to 100 recent tickets
- `POST /api/ai/draft-support-reply` — admin/support agent; drafts from a real ticket and linked order

Review and recurring-issue summaries are persisted in `ai_summaries` with their
model, source counts, and structured findings. Customer identity fields are not
included in recurring-issue analysis. Product copy and support replies remain
ephemeral drafts until a staff member reviews and explicitly uses them.

## Analytics

`GET /api/analytics/dashboard` is admin-only and returns database-backed dashboard
metrics: 30-day revenue and order count, prior-period revenue comparison, all-time
orders, customer and active-product counts, order/support status distributions,
top products, and low-stock warnings.

Revenue includes orders that have not been cancelled or refunded. Low stock uses
available units (`quantity - reservedQuantity`) against each variant's configured
threshold. The warning total covers all matching variants while the response lists
the ten most urgent rows. Top products rank non-cancelled/non-refunded order items
by units sold.
