# Medical Distribution Dashboard - AI Coding Guide

## Project Overview

This is a **dual-mode Next.js application** for medical device distribution management with a priority focus on budgeting. It runs as both a web app (PostgreSQL) and an Electron desktop app (SQLite) with offline-first capabilities and AI-powered document processing.

**Core Business**: Beshara Group healthcare solutions division in Kuwait - manages government tenders (MOH), budget tracking, inventory, and financial operations.

## Architecture & Key Patterns

### Dual Database Strategy

- **Web mode**: PostgreSQL via `prisma/schema.prisma` → `@prisma/client`
- **Desktop mode**: SQLite via `prisma/schema.local.prisma` → `@prisma/local-client` (output: `node_modules/.prisma/local-client`)
- **Pattern**: Use `src/lib/prisma.ts` for web, `electron/database.js` for desktop IPC handlers
- **Always generate both**: `npm run db:generate:all` before building

### Electron Integration

- **Detection**: `window.electronAPI?.isElectron` (use `src/hooks/useElectron.ts`)
- **IPC Pattern**: Renderer uses `window.electronAPI.invoke(channel, args)`, main process handles via `ipcMain.handle(channel, handler)` in `electron/database.js`
- **Desktop-only features**: AI document processing, offline sync queue, local file system access

### Budget Approval Workflow

**4-tier approval system based on transaction amounts** (see `src/types/index.ts`):
- < 1,000 KWD: Auto-approve
- 1K-10K: Manager
- 10K-50K: Finance Manager  
- 50K-100K: CFO
- \> 100K: CEO

All budget transactions must pass through `BudgetApproval` records. Check `status` enum: `PENDING | APPROVED | REJECTED`.

### Authentication & Authorization

- **NextAuth.js** with JWT strategy (see `src/lib/auth.ts`)
- **API protection**: All `/api/*` routes must call `getServerSession(authOptions)` first
- **Roles**: `ADMIN | CEO | CFO | FINANCE_MANAGER | MANAGER | SALES | WAREHOUSE | FINANCE`
- **Pattern**: Extract `session.user.id` for audit trails in all mutations

### API Route Conventions

1. Start with `getServerSession(authOptions)` - return 401 if null
2. Parse query params or body with Zod validation
3. Build Prisma `where` clause (always filter `isDeleted: false`)
4. Execute query with error handling
5. Return `NextResponse.json()` with proper status codes
6. Log audit trail via `audit.logCreate/Update/Delete()` from `src/lib/audit.ts`

**Example**: See `src/app/api/budgets/route.ts` - demonstrates pagination, filtering, Zod validation, and session handling.

## Development Workflows

### Local Development

```bash
# Web app with PostgreSQL
npm run dev                    # http://localhost:3000

# Desktop app with SQLite
npm run electron:dev           # Runs Next.js + Electron concurrently
```

### Database Operations

```bash
# Web database (PostgreSQL)
npm run db:generate           # Generate Prisma client
npm run db:push               # Push schema without migrations
npm run db:migrate            # Create migration
npm run db:seed               # Seed with test data

# Desktop database (SQLite)
npm run db:local:generate     # Generate local client
npm run db:local:push         # Push local schema
npm run db:local:studio       # Open Prisma Studio for SQLite
npm run db:local:reset        # Reset local database

# Both databases
npm run db:generate:all       # ALWAYS use before electron:build
```

### Testing

```bash
npm test                      # Run Jest tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage (70% threshold)
```

**Test structure**: Place tests in `tests/` directory, use `tests/utils/test-helpers.ts` for shared mocks.

### Building Desktop App

```bash
npm run electron:build        # Current platform (uses electron-builder.json)
npm run electron:builder:mac  # macOS .dmg
npm run electron:builder:win  # Windows installer
npm run electron:builder:linux # Linux AppImage
```

**Important**: Always run `npm run db:generate:all` first - desktop builds need both Prisma clients.

## AI Document Processing (Desktop Only)

### Processing Pipeline

1. **File reading**: `src/lib/desktop-document-processor.ts` reads from local filesystem
2. **Text extraction**: `src/lib/document-processor.ts` uses `pdf-parse` for PDFs
3. **Preprocessing**: `src/lib/document-preprocessor.ts` cleans/normalizes text
4. **AI extraction**: `src/lib/ai/tender-extraction.ts` invokes LLMs (Gemini, Groq fallback)
5. **Validation**: Zod schemas in `src/lib/ai/tender-validation.ts` ensure data quality

### LLM Provider Pattern

See `src/lib/ai/llm-provider.ts`:
- **Primary**: Google Gemini (gemini-1.5-flash-002)
- **Fallback**: Groq (llama-3.3-70b-versatile)
- Use `invokeUnifiedLLM(provider, prompt, options)` - automatically handles retries and context windows

### Adding New AI Features

1. Create prompt templates in `src/lib/ai/config.ts`
2. Define Zod validation schema for output
3. Implement extraction function following `extractTenderFromText` pattern
4. Add IPC handler in `electron/main.js` for renderer access
5. Use `src/hooks/useElectron.ts` to invoke from React components

## Path Aliases & Imports

- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- **Prisma imports**: `import prisma from '@/lib/prisma'` (web), `require('./database')` (Electron)
- **Always use named exports** for utility functions to enable tree-shaking

## Common Pitfalls

1. **Desktop builds failing**: Missing `npm run db:generate:all` - both Prisma clients required
2. **Session errors in APIs**: Forgot `getServerSession(authOptions)` check at route start
3. **Dual database confusion**: Using wrong Prisma client (web vs desktop context)
4. **Approval workflow**: Not checking `requiresApprovalOver` threshold from BudgetCategory
5. **Electron IPC**: Calling `window.electronAPI` on server side (only use in client components)

## Testing Accounts

After `npm run db:seed`:
- admin@beshara.com / admin123 (ADMIN)
- ceo@beshara.com / admin123 (CEO)
- cfo@beshara.com / admin123 (CFO)

## Priority Module: Budgets

**Most critical features** - handle with care:
- Multi-level category hierarchy (4 levels deep)
- Real-time variance tracking (alerts at 80%/90% consumption)
- Complex approval workflow with role-based thresholds
- Transaction posting affects `spentAmount` and `availableAmount` calculations

**Key files**: `src/app/(dashboard)/budgets/`, `src/app/api/budgets/`, `src/components/budget/`
