# Dashboard2 Project Context

## Overview
Medical Distribution Dashboard - Dual-mode Next.js application for medical device distribution management with AI-powered features.

## Core Business
Beshara Group healthcare solutions division in Kuwait - manages government tenders (MOH), budget tracking, inventory, and financial operations.

## Architecture
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL (web) / SQLite (desktop) with Prisma
- **Authentication**: NextAuth.js with JWT
- **AI Providers**: Google Gemini (primary), Groq (fallback), Anthropic Claude
- **Desktop**: Electron for offline-first capabilities

## Key Modules
1. **Budgets**: Multi-level categories, real-time variance tracking, 4-tier approval workflow
2. **Tenders**: Document processing, AI extraction, competitive analysis
3. **Inventory**: Stock management, reorder points, demand forecasting
4. **Expenses**: Auto-categorization, anomaly detection
5. **Forecasts**: AI-powered budget predictions

## Current Phase: Phase 3
Focus on AI-powered features:
- Budget Forecasting with database storage
- Tender Analysis (SWOT, win probability, competitive scoring)
- Expense Auto-categorization & Anomaly Detection
- Inventory Optimization

## Code Conventions
- Path aliases: `@/*` maps to `src/*`
- API routes require authentication: `getServerSession(authOptions)`
- All mutations require audit logging: `audit.logCreate/Update/Delete()`
- Use `@prisma/client` for web, `@prisma/local-client` for desktop
- Zod validation for all API inputs
- Multi-replace for efficient edits

## Testing
- Jest for unit tests (70% coverage threshold)
- Manual testing for end-to-end workflows
- Test accounts available after `npm run db:seed`

## Documentation
See `.github/copilot-instructions.md` for detailed coding guidelines.
