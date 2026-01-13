# SupportBase

AI chatbot that installs in one line and works in 15 minutes.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), shadcn/ui, Tailwind CSS
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
│   ├── widget/        # Embeddable chat widget
│   └── mcp-server/    # MCP server for AI platforms
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

- Node.js 18+
- pnpm 8+
- Supabase CLI (optional, for local development)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase and OpenAI credentials
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm --filter @chatbot/web dev     # Dashboard on :3000
pnpm --filter @chatbot/api dev     # API on :3001
pnpm --filter @chatbot/widget dev  # Widget builder
```

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

Next.js 14 application for managing chatbots:
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

### Widget (`apps/widget`)

Embeddable chat widget:
- Single script tag installation
- Shadow DOM for style isolation
- Customizable appearance
- Works on any website

### MCP Server (`apps/mcp-server`)

MCP server for AI platforms:
- Create/manage chatbot projects
- Upload knowledge
- Configure API endpoints
- Works with Claude, Cursor, etc.

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

See `.env.example` for required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `ENCRYPTION_KEY` - Key for encrypting stored credentials

## Documentation

- [Feature Specs](./docs/product/features/_index.md)
- [Architecture Overview](./docs/product/architecture/system-overview.md)

## License

MIT
