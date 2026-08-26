# Nexa Commerce

Nexa Commerce is a portfolio-grade, full-stack e-commerce application with a customer storefront, an operations dashboard, live inventory, order and support workflows, and grounded AI shopping and support assistants.

The project is organized as an npm workspace and uses strict TypeScript across the Next.js frontend and NestJS backend. PostgreSQL is the source of truth, accessed through Prisma.

## Architecture

```text
Browser
  |
  +-- Next.js storefront and admin UI (port 3000)
          |
          +-- REST/JSON requests with HTTP-only authentication cookie
                  |
                  +-- NestJS API (port 4000, /api)
                          |
                          +-- Domain services and authorization checks
                          |       |
                          |       +-- Prisma ORM --> PostgreSQL
                          |
                          +-- Provider-neutral AI interface
                                  |
                                  +-- OpenAI Responses API adapter
```

The backend is divided into authentication, products, categories, carts, orders, wishlists, reviews, support, analytics, and AI modules. Controllers handle HTTP contracts, services enforce domain and ownership rules, and Prisma is isolated behind the shared database service.

## Technology stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: NestJS 11, TypeScript, Passport JWT, class-validator
- Database: PostgreSQL 16, Prisma 7
- AI: OpenAI Responses API with structured output and a provider-neutral backend interface
- Authentication: 15-minute JWT stored in an HTTP-only cookie
- Tooling: npm workspaces, ESLint, Prettier, Jest, Docker Compose

## Customer features

- Registration, login, logout, and authenticated sessions
- Product and category browsing, search, filtering, sorting, and pagination
- Product variants, live availability, images, and reviews
- Cart creation, quantity updates, stock validation, and checkout
- Order creation with immutable product and price snapshots
- Customer order history and order detail
- Wishlists and verified-purchase reviews
- Customer support tickets and conversations
- Product-aware shopping chatbot with recommendation cards
- Account-aware support assistant with confirmed ticket escalation

## Admin and support features

- Dashboard analytics for revenue, orders, customers, inventory, and support
- Category and product management
- Variant, price, SKU, image, and inventory management
- Product archiving and inactive catalogue views
- Order management with validated status transitions
- Support inbox, assignment, internal notes, and ticket status management
- AI-assisted product copy and review summaries for administrators
- AI support summaries and reply drafts for administrators and support agents
- Role guards separating customer, support-agent, and administrator permissions

## AI assistant architecture

The AI provider does **not** connect directly to PostgreSQL and is never given the complete product catalogue.

For shopping requests, the backend:

1. Classifies the intent and extracts structured filters such as category, budget, colour, size, brand, and keywords.
2. Queries product and inventory data through backend services and Prisma.
3. Keeps only active products, active variants, and variants with positive available stock after reservations.
4. Retrieves a bounded candidate set and sends at most 12 relevant products to the AI provider.
5. Validates returned product IDs against the retrieved set.
6. Returns compact recommendation cards containing trusted IDs, names, prices, images, reasons, and frontend URLs.

For support requests, the backend builds a minimal context from orders and tickets owned by the authenticated customer. A model-proposed order ID is checked against that customer’s orders and checked again before ticket creation. Escalation creates a server-side ticket proposal; the customer must explicitly confirm it before a ticket is written.

Provider-specific SDK calls, timeout handling, structured-output parsing, and error translation live in the OpenAI adapter. Application services depend on a provider-neutral interface, so another provider can replace OpenAI without changing controllers.

The API key is backend-only. Missing configuration, provider timeouts, rate limits, invalid output, empty output, no-match searches, and assistant database failures return safe fallbacks without disabling normal catalogue, cart, checkout, or order functionality.

## Local development

### Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer
- Docker Desktop, or PostgreSQL 15 or newer

### Setup

1. Install workspace dependencies:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

   In PowerShell:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env.local
   ```

3. Replace `JWT_SECRET` with a unique value containing at least 32 characters. Add `OPENAI_API_KEY` only if AI features should call the provider.

4. Start PostgreSQL:

   ```bash
   npm run db:up
   ```

5. Apply migrations and seed development data:

   ```bash
   npm run prisma:deploy --workspace backend
   npm run prisma:seed --workspace backend
   ```

6. Start the frontend and backend:

   ```bash
   npm run dev
   ```

Application URLs:

- Storefront: http://localhost:3000
- Backend API: http://localhost:4000/api
- Health check: http://localhost:4000/api/health
- Login: http://localhost:3000/login
- Admin dashboard: http://localhost:3000/admin

Run applications separately with `npm run dev:frontend` and `npm run dev:backend`.

## Environment variables

### Backend — `backend/.env`

| Variable                | Required | Purpose                                                                 |
| ----------------------- | -------- | ----------------------------------------------------------------------- |
| `NODE_ENV`              | Yes      | Runtime mode, normally `development`, `test`, or `production`           |
| `PORT`                  | Yes      | API port; defaults to `4000`                                            |
| `FRONTEND_URL`          | Yes      | Comma-separated exact CORS origins; paths and wildcards are rejected    |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string used by Prisma                             |
| `JWT_SECRET`            | Yes      | JWT signing secret with at least 32 characters                          |
| `OPENAI_API_KEY`        | AI only  | Backend-only OpenAI credential; never expose it through `NEXT_PUBLIC_*` |
| `AI_MODEL`              | No       | AI model ID; defaults to `gpt-5.6-terra`                                |
| `AI_REQUEST_TIMEOUT_MS` | No       | Provider timeout from 1,000 to 120,000 ms; defaults to `30000`          |

### Frontend — `frontend/.env.local`

| Variable              | Required | Purpose                                                            |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `BACKEND_API_URL`     | No       | Next.js proxy target; defaults to `http://localhost:4000/api`      |
| `NEXT_PUBLIC_API_URL` | No       | Optional browser-visible URL that bypasses the same-origin proxy   |

The committed `.env.example` files contain development examples only. Real `.env` files are ignored by Git.

## Database migrations and seed

Create a development migration after changing the schema:

```bash
npm run prisma:migrate --workspace backend
```

Validate and regenerate the client:

```bash
cd backend
npx prisma format
npx prisma validate
npx prisma generate
```

Apply committed migrations in deployment environments:

```bash
npm run prisma:deploy --workspace backend
```

Seed roles, demo users, categories, coupons, inventory, and up to 500 products:

```bash
npm run prisma:seed --workspace backend
```

The seed is repeatable and preserves products not owned by the generated test catalogue.

## Tests and quality checks

Run repository linting:

```bash
npm run lint
```

Run backend tests:

```bash
npm test
# or
npm run test --workspace backend
```

Run backend and frontend builds:

```bash
npm run build
```

Run checks individually:

```bash
npm run lint --workspace frontend
npm run build --workspace frontend
npm run lint --workspace backend
npm run build --workspace backend
npm run test --workspace backend
```

The backend suite contains 48 mocked unit and service-level tests covering authentication, authorization, catalogue browsing, carts, inventory, checkout, immutable order snapshots, support ownership, AI grounding, provider failures, and confirmed ticket escalation. Tests do not make paid AI or external HTTP requests.

The frontend currently has lint and TypeScript/build checks but does not yet have an automated component or end-to-end test suite.

## Demo credentials

After running the seed, all demo accounts use the development-only password `Commerce123!`.

| Role          | Email                  |
| ------------- | ---------------------- |
| Customer      | `customer@example.com` |
| Administrator | `admin@example.com`    |
| Support agent | `support@example.com`  |

Never use these credentials in a production deployment.

## Deployment

1. Provision PostgreSQL and set a production `DATABASE_URL`.
2. Configure a unique `JWT_SECRET`, exact HTTPS `FRONTEND_URL`, and production `NEXT_PUBLIC_API_URL`.
3. Add `OPENAI_API_KEY`, `AI_MODEL`, and timeout configuration if AI features are enabled.
4. Install deterministic dependencies with `npm ci`.
5. Generate Prisma Client and apply migrations:

   ```bash
   npm run prisma:generate --workspace backend
   npm run prisma:deploy --workspace backend
   ```

6. Build both workspaces:

   ```bash
   npm run build
   ```

7. Start the backend and frontend using a process manager or container platform:

   ```bash
   npm run start:prod --workspace backend
   npm run start --workspace frontend
   ```

8. Terminate TLS at the load balancer or reverse proxy, keep PostgreSQL private, restrict secrets to the deployment secret manager, and run the backend behind a trusted proxy configuration appropriate for rate limiting.

Do not run the development seed against production data unless demo accounts and generated catalogue records are explicitly wanted.

## Known limitations

- The frontend does not yet have automated component or browser end-to-end tests.
- The process-local rate limiter must be replaced with shared storage such as Redis for multi-instance deployments.
- Checkout records orders but does not integrate a live payment gateway.
- File attachment records exist in the schema, but there is no upload endpoint or object-storage integration.
- Shipping and return guidance is intentionally conservative until configurable business policies are added.
- AI responses depend on provider availability; safe non-AI fallbacks are returned when unavailable.
- Generated seed images use external placeholder services and require network access to display.
- The final local verification observed a frontend development server returning HTTP 500 and a production build that did not finish within five minutes; backend and Prisma verification passed.

## Future improvements

- Add Playwright end-to-end tests and React component tests.
- Add Stripe or another payment provider with webhook-driven payment state.
- Move rate-limit state to Redis and add distributed observability.
- Add structured request tracing, audit-log writers, and production log aggregation.
- Add secure attachment uploads with MIME allowlists, size limits, malware scanning, and private object storage.
- Add configurable shipping, return, refund, tax, and promotion policies.
- Add email notifications for order and support events.
- Add AI evaluation datasets for recommendation relevance, groundedness, refusal behavior, and support escalation quality.
- Add deployment manifests and CI pipelines for lint, tests, builds, migrations, and security scanning.

More implementation detail is available in [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md).
