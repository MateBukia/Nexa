# AI Commerce Platform

A production-oriented full-stack commerce platform built with Next.js, NestJS, TypeScript, Tailwind CSS, PostgreSQL, and Prisma. The repository currently contains the application bootstrap and database foundation.

## Structure

```text
ai-commerce-platform/
  frontend/   Next.js customer and admin application
  backend/    NestJS API
```

## Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer
- PostgreSQL 15 or newer

## Quick start

1. Install all workspace dependencies:

   ```bash
   npm install
   ```

2. Create local environment files and add an OpenAI API key to
   `backend/.env` to enable the shopping assistant:

   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

   On PowerShell, use `Copy-Item` instead of `cp` if needed.

   `AI_MODEL` is optional and defaults to `gpt-5.6-terra`. Without
   `OPENAI_API_KEY`, the rest of the store remains available and AI requests
   return an explicit service-unavailable response.

3. Start PostgreSQL (or use your own instance):

   ```bash
   npm run db:up
   ```

4. Prepare the database:

   ```bash
   npm run prisma:deploy --workspace backend
   npm run prisma:seed --workspace backend
   ```

5. Start both applications:

   ```bash
   npm run dev
   ```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Backend health endpoint: http://localhost:4000/api/health
- Login page: http://localhost:3000/login
- Registration page: http://localhost:3000/register

You can also run one application at a time with `npm run dev:frontend` or `npm run dev:backend`.

## Quality checks

```bash
npm run lint
npm run build
npm test
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for application-specific notes.
