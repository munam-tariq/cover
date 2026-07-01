# SupportBase

AI chatbot that installs in one line and works in 15 minutes.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), shadcn/ui, Tailwind CSS
- **Backend**: Node.js (Express)
- **Database**: Supabase PostgreSQL with pgvector
- **Auth**: Supabase Auth (magic links)
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Widget**: Vanilla JS with Shadow DOM
- **Monorepo**: Turborepo + pnpm

## Project Structure

```
├── apps/
│   ├── web/           # Next.js dashboard
│   ├── api/           # Express API server
│   └── widget/        # Embeddable chat widget
├── packages/
│   ├── ui/            # Shared UI components (shadcn)
│   ├── db/            # Database client & types
│   ├── shared/        # Shared utilities & constants
│   ├── eslint-config/ # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
└── supabase/          # Supabase configuration & migrations
```

## Getting Started

### Prerequisites

- Node.js >= 22.13.0
- Corepack enabled
- pnpm 10.29.2 (declared in `package.json`)
- Supabase CLI (optional, only if running Supabase locally)

This repo is a pnpm workspace. Use pnpm, not npm or yarn.

If your local pnpm version does not match `10.29.2`, reset it with Corepack:

```bash
corepack enable
corepack prepare pnpm@10.29.2 --activate
pnpm --version
```

### Installation

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Copy environment variables for the apps you run
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Edit `apps/web/.env` and `apps/api/.env` with your Supabase and OpenAI credentials.
For `ENCRYPTION_KEY`, generate a local value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm --filter @chatbot/web dev     # Dashboard on :3000
pnpm --filter @chatbot/api dev     # API on :3001
pnpm --filter @chatbot/widget dev  # Widget bundle on :7001/dist/widget.js
```

Local URLs:

- Dashboard: http://localhost:3000
- API health check: http://localhost:3001/health
- Widget bundle: http://localhost:7001/dist/widget.js

### Build

```bash
# Build all apps
pnpm build

# Build individual apps
pnpm --filter @chatbot/web build
pnpm --filter @chatbot/api build
```

### Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check
```

## Apps

### Web Dashboard (`apps/web`)

Next.js 15 application for managing chatbots:
- Upload knowledge sources (PDFs, text files)
- Configure API endpoints
- Get embed code
- View analytics

### API Server (`apps/api`)

Express server providing:
- REST API for dashboard
- Chat endpoint with RAG
- File upload processing
- API tool execution
- MCP endpoint for AI platforms

### Widget (`apps/widget`)

Embeddable chat widget:
- Single script tag installation
- Shadow DOM for style isolation
- Customizable appearance
- Works on any website

## Packages

### @chatbot/ui

Shared UI components built with shadcn/ui:
- Button, Input, Card, Dialog, etc.
- Consistent styling across apps

### @chatbot/db

Supabase client and type definitions:
- Database types (auto-generated)
- Query helpers
- Type-safe database access

### @chatbot/shared

Shared utilities and constants:
- Configuration values
- Helper functions
- Type definitions

## Environment Variables

Use the app-specific env templates for required environment variables:

- `apps/web/.env.example` - browser-safe dashboard variables
- `apps/api/.env.example` - server-only API variables and secrets

Minimum local values:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `ENCRYPTION_KEY` - 64-character hex key for encrypting stored credentials

## Documentation

- [Feature Specs](./docs/product/features/_index.md)
- [Architecture Overview](./docs/product/architecture/system-overview.md)

## License

MIT
