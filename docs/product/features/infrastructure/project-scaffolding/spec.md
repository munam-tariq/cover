# Feature: Project Scaffolding

## Overview

**Feature ID**: `project-scaffolding`
**Category**: Infrastructure
**Priority**: P0 (Must complete first)
**Complexity**: XL
**Estimated Effort**: 3-5 days

### Summary
Set up the Turborepo monorepo structure containing all applications (web dashboard, API server, widget, MCP server) and shared packages (UI components, database client, shared utilities). This is the foundation upon which all other features are built.

### Dependencies
- None (This is the first feature to implement)

### Success Criteria
- [ ] Turborepo monorepo initialized with all apps and packages
- [ ] All package.json files properly configured with workspace references
- [ ] TypeScript configured with proper path aliases
- [ ] Development scripts work (`turbo dev`, `turbo build`, `turbo lint`)
- [ ] Each app runs independently in development mode
- [ ] Shared packages are importable from all apps
- [ ] ESLint and Prettier configured across monorepo

---

## User Stories

### Primary User Story
> As a developer, I want a well-organized monorepo structure so that I can develop all parts of the system efficiently with shared code and consistent tooling.

### Additional Stories
1. As a developer, I want to run `turbo dev` and have all apps start in development mode so that I can test the full system locally.
2. As a developer, I want shared UI components so that I can maintain consistency across the dashboard and avoid code duplication.
3. As a developer, I want shared database types so that I can have type safety across all apps that interact with the database.

---

## Functional Requirements

### Monorepo Structure

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| PS-001 | Initialize Turborepo with pnpm workspaces | Must Have | Use pnpm for faster installs |
| PS-002 | Create `apps/web` Next.js 14+ application | Must Have | Dashboard app |
| PS-003 | Create `apps/api` Node.js server application | Must Have | Core API server |
| PS-004 | Create `apps/widget` Preact/Vanilla JS application | Must Have | Embeddable widget |
| PS-005 | Create `apps/mcp-server` Node.js application | Must Have | MCP server |
| PS-006 | Create `packages/ui` shared component library | Must Have | shadcn/ui components |
| PS-007 | Create `packages/db` database client package | Must Have | Supabase client & types |
| PS-008 | Create `packages/shared` utilities package | Must Have | Constants, utils, types |
| PS-009 | Configure TypeScript with project references | Must Have | Cross-package type checking |
| PS-010 | Configure ESLint with shared rules | Should Have | Consistent code quality |
| PS-011 | Configure Prettier with shared config | Should Have | Consistent formatting |

---

## Technical Specification

### Directory Structure

```
/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── auth/
│   │   │   │       └── callback/
│   │   │   │           └── route.ts
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx           # Overview
│   │   │   │   ├── knowledge/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── api-endpoints/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── embed/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── header.tsx
│   │   │   └── features/
│   │   │       ├── knowledge/
│   │   │       ├── endpoints/
│   │   │       └── embed/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── middleware.ts
│   │   │   └── utils.ts
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                    # Node.js API server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── knowledge.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── embed.ts
│   │   │   ├── services/
│   │   │   │   ├── embedding.ts
│   │   │   │   ├── chunking.ts
│   │   │   │   ├── chat-engine.ts
│   │   │   │   ├── tool-executor.ts
│   │   │   │   └── encryption.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── cors.ts
│   │   │   └── lib/
│   │   │       ├── supabase.ts
│   │   │       └── openai.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── widget/                 # Embeddable chat widget
│   │   ├── src/
│   │   │   ├── widget.ts
│   │   │   ├── components/
│   │   │   │   ├── bubble.ts
│   │   │   │   ├── chat-window.ts
│   │   │   │   ├── message.ts
│   │   │   │   └── input.ts
│   │   │   ├── styles/
│   │   │   │   └── widget.css
│   │   │   └── utils/
│   │   │       ├── api.ts
│   │   │       └── storage.ts
│   │   ├── build.ts            # esbuild config
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mcp-server/             # MCP server for AI platforms
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   │   ├── create-project.ts
│       │   │   ├── upload-knowledge.ts
│       │   │   ├── add-api-endpoint.ts
│       │   │   ├── get-embed-code.ts
│       │   │   └── list-projects.ts
│       │   └── auth.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   └── dropdown-menu.tsx
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── db/                     # Database client & types
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts        # Generated from Supabase
│   │   │   ├── queries/
│   │   │   │   ├── projects.ts
│   │   │   │   ├── knowledge.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   └── chat.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared/                 # Shared utilities
│   │   ├── src/
│   │   │   ├── constants.ts
│   │   │   ├── utils.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── eslint-config/          # Shared ESLint config
│   │   ├── index.js
│   │   └── package.json
│   │
│   └── typescript-config/      # Shared TS config
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## Configuration Files

### Root `package.json`

```json
{
  "name": "chatbot-platform",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "clean": "turbo clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.2.0",
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env*"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### `apps/web/package.json`

```json
{
  "name": "@chatbot/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@chatbot/db": "workspace:*",
    "@chatbot/shared": "workspace:*",
    "@chatbot/ui": "workspace:*",
    "@supabase/ssr": "^0.1.0",
    "@supabase/supabase-js": "^2.39.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.312.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

### `apps/api/package.json`

```json
{
  "name": "@chatbot/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@chatbot/db": "workspace:*",
    "@chatbot/shared": "workspace:*",
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "openai": "^4.25.0",
    "pdf-parse": "^1.1.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "eslint": "^8.56.0",
    "tsup": "^8.0.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### `apps/widget/package.json`

```json
{
  "name": "@chatbot/widget",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch build.ts --dev",
    "build": "tsx build.ts",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@chatbot/shared": "workspace:*"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "@types/node": "^20.11.0",
    "esbuild": "^0.20.0",
    "eslint": "^8.56.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### `apps/mcp-server/package.json`

```json
{
  "name": "@chatbot/mcp-server",
  "version": "0.0.1",
  "private": true,
  "bin": {
    "chatbot-mcp": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@chatbot/db": "workspace:*",
    "@chatbot/shared": "workspace:*",
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "@types/node": "^20.11.0",
    "eslint": "^8.56.0",
    "tsup": "^8.0.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### `packages/db/package.json`

```json
{
  "name": "@chatbot/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "type-check": "tsc --noEmit",
    "generate-types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "eslint": "^8.56.0",
    "supabase": "^1.136.0",
    "typescript": "^5.3.3"
  }
}
```

### `packages/shared/package.json`

```json
{
  "name": "@chatbot/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3"
  }
}
```

### `packages/ui/package.json`

```json
{
  "name": "@chatbot/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.312.0",
    "react": "^18.2.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@chatbot/eslint-config": "workspace:*",
    "@chatbot/typescript-config": "workspace:*",
    "@types/react": "^18.2.0",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

### TypeScript Config (`packages/typescript-config/base.json`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Base",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### TypeScript Config (`packages/typescript-config/nextjs.json`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "allowJs": true,
    "noEmit": true,
    "incremental": true
  }
}
```

### TypeScript Config (`packages/typescript-config/node.json`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

---

## Environment Variables

### `.env.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_PROJECT_ID=xxx

# OpenAI
OPENAI_API_KEY=sk-...

# API Server
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Widget
CDN_URL=http://localhost:3002

# Security
ENCRYPTION_KEY=your-32-char-encryption-key-here

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_MINUTE=10
RATE_LIMIT_MESSAGES_PER_HOUR=50

# Environment
NODE_ENV=development
```

---

## Implementation Notes

### Recommended Approach

1. **Start with**: Initialize Turborepo and workspace configuration
   ```bash
   npx create-turbo@latest
   cd chatbot-platform
   pnpm install
   ```

2. **Then**: Create the apps directory structure
   - Initialize Next.js app: `cd apps && npx create-next-app@latest web --typescript --tailwind --eslint`
   - Create API, widget, and MCP server directories manually

3. **Then**: Set up shared packages
   - Create package directories with basic TypeScript config
   - Export shared types and utilities

4. **Then**: Configure workspace references
   - Update all package.json files with `workspace:*` dependencies
   - Verify imports work across packages

5. **Finally**: Verify everything works
   ```bash
   pnpm install
   pnpm dev  # Should start all apps
   pnpm build  # Should build all apps
   pnpm lint  # Should lint all code
   ```

### File Structure for Widget Build

```typescript
// apps/widget/build.ts
import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ['src/widget.ts'],
    bundle: true,
    minify: !isDev,
    format: 'iife',
    target: ['es2018'],
    outfile: 'dist/widget.js',
    sourcemap: isDev,
  });

  if (isDev) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build complete!');
  }
}

build();
```

### Gotchas & Warnings

- Use `workspace:*` for all internal package references
- Ensure all packages have `"private": true` to prevent accidental publishing
- Next.js requires specific module resolution settings
- The widget must not import React (keeps bundle small)
- MCP server needs `bin` field for npm publishing

---

## Testing Requirements

### Setup Verification Tests
- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts all apps
- [ ] `pnpm build` completes successfully
- [ ] `pnpm lint` runs across all packages
- [ ] Imports between packages work (e.g., `import { Button } from '@chatbot/ui'`)
- [ ] TypeScript type checking works across packages
- [ ] Hot reload works in development mode

---

## Acceptance Criteria

### Definition of Done
- [ ] All directories and files created as specified
- [ ] All package.json files correctly configured
- [ ] TypeScript compiles without errors
- [ ] ESLint and Prettier configured
- [ ] `turbo dev` starts all apps successfully
- [ ] `turbo build` completes successfully
- [ ] Shared packages importable from all apps
- [ ] Environment variables documented
- [ ] README updated with setup instructions

### Demo Checklist
- [ ] Show `pnpm install` completing
- [ ] Show `turbo dev` starting all apps
- [ ] Show importing shared component in web app
- [ ] Show TypeScript catching type errors across packages

---

## Open Questions

None - This spec is complete and ready for implementation.

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
