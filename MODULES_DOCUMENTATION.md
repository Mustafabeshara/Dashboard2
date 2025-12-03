# Medical Distribution Dashboard - Modules Documentation

**Version:** 1.0.0
**Last Updated:** December 2024
**Platform:** Next.js 16 + Electron Desktop App

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Authentication & Security](#2-authentication--security)
3. [AI Integration Modules](#3-ai-integration-modules)
4. [API Routes](#4-api-routes)
5. [Core Library Modules](#5-core-library-modules)
6. [UI Components](#6-ui-components)
7. [Database & Prisma](#7-database--prisma)
8. [Desktop (Electron) Integration](#8-desktop-electron-integration)
9. [Configuration Files](#9-configuration-files)

---

## 1. Project Overview

### Purpose
A comprehensive medical distribution management system for Kuwait-based medical equipment distributors. The system handles procurement (tenders), budgeting, inventory, expenses, invoicing, and document management with AI-powered features.

### Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19.2, Next.js 16, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Railway), SQLite (Desktop) |
| Authentication | NextAuth.js with JWT |
| AI Providers | Gemini, Groq, OpenAI, Anthropic |
| Desktop | Electron 39.2.4 |
| File Storage | AWS S3, Local filesystem |
| OCR | AWS Textract |

---

## 2. Authentication & Security

### 2.1 Authentication (`src/lib/auth.ts`)

**Purpose:** Handles user authentication, session management, and role-based permissions.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `authOptions` | NextAuth.js configuration with credentials provider |
| `validatePassword()` | Validates password against security requirements (8+ chars, uppercase, lowercase, numbers) |
| `hashPassword()` | Hashes passwords using bcrypt with salt rounds of 10 |
| `verifyPassword()` | Compares plain text password with bcrypt hash |
| `hasPermission()` | Checks if a user role has a specific permission |
| `getRequiredApprovalLevel()` | Determines approval level needed based on amount |
| `canApprove()` | Checks if a role can approve a given level |

**Password Requirements:**
```typescript
{
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
}
```

**User Roles:**
- `ADMIN` - Full system access
- `CEO` - Executive oversight, all approvals
- `CFO` - Financial oversight
- `FINANCE_MANAGER` - Budget and expense management
- `MANAGER` - Department management
- `SALES` - Tender and customer management
- `WAREHOUSE` - Inventory management
- `FINANCE` - Invoice and expense processing

**Approval Levels by Amount:**
| Amount (KWD) | Level | Required Role |
|--------------|-------|---------------|
| < 1,000 | 0 | Auto-approve |
| 1,000 - 10,000 | 1 | MANAGER |
| 10,000 - 50,000 | 2 | FINANCE_MANAGER |
| 50,000 - 100,000 | 3 | CFO |
| > 100,000 | 4 | CEO |

---

### 2.2 Rate Limiting (`src/lib/rate-limit.ts`)

**Purpose:** Protects API endpoints from abuse and controls request frequency.

**Preset Configurations:**
| Preset | Window | Max Requests | Use Case |
|--------|--------|--------------|----------|
| `STRICT` | 15 min | 5 | Sensitive operations |
| `STANDARD` | 15 min | 100 | Most API endpoints |
| `RELAXED` | 15 min | 300 | Public endpoints |
| `AUTH` | 15 min | 5 | Login/register |
| `UPLOAD` | 1 hour | 20 | File uploads |
| `AI` | 1 hour | 30 | AI API calls |

**Key Functions:**
| Function | Description |
|----------|-------------|
| `rateLimiter.check()` | Checks if request is within rate limit |
| `rateLimiter.reset()` | Resets rate limit for identifier |
| `withRateLimit()` | Middleware wrapper for routes |
| `withUserRateLimit()` | Per-user rate limiting |
| `withIPRateLimit()` | Per-IP rate limiting |

---

### 2.3 CSRF Protection (`src/lib/security/csrf.ts`)

**Purpose:** Prevents Cross-Site Request Forgery attacks.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `generateCSRFToken()` | Creates secure CSRF token with 1-hour expiry |
| `validateCSRFToken()` | Validates token from request |
| `validateCSRFRequest()` | Validates Origin/Referer headers |
| `withCSRFProtection()` | Middleware wrapper for routes |

**Validation Methods:**
1. Origin header check against allowed origins
2. Referer header fallback
3. Custom `x-csrf-token` header
4. JSON content-type for API requests

---

### 2.4 File Validator (`src/lib/security/file-validator.ts`)

**Purpose:** Validates uploaded files for security and integrity.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `getFileHash()` | Generates SHA-256 hash of file content |
| `validateFileSize()` | Checks file against size limit (default 50MB) |
| `validateMimeType()` | Validates against allowed MIME types |
| `detectMimeType()` | Detects type from magic bytes (PDF, JPEG, PNG, GIF, WebP) |
| `sanitizeFilename()` | Removes path traversal and special characters |
| `generateSecureFilename()` | Creates random timestamped filename |
| `scanFileForViruses()` | ClamAV integration placeholder |
| `validateFile()` | Comprehensive validation with all checks |

---

## 3. AI Integration Modules

### 3.1 LLM Provider (`src/lib/ai/llm-provider.ts`)

**Purpose:** Unified interface for multiple AI providers.

**Supported Providers:**
- Gemini (Google)
- Groq
- OpenAI
- Anthropic
- Forge (OpenAI-compatible)

**Key Functions:**
| Function | Description |
|----------|-------------|
| `invokeUnifiedLLM()` | Sends request to configured AI provider |
| `getRecommendedProvider()` | Returns best available provider |
| `getAvailableProviders()` | Lists all configured providers |

**Usage:**
```typescript
const result = await invokeUnifiedLLM({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Analyze this tender...' }
  ],
  maxTokens: 2000
}, { provider: 'gemini' });
```

---

### 3.2 API Keys Manager (`src/lib/ai/api-keys.ts`)

**Purpose:** Secure storage and retrieval of API keys.

**Priority Order:**
1. Environment variables (Railway/production)
2. Database (encrypted with AES-256-GCM)
3. Returns null if not found

**Key Functions:**
| Function | Description |
|----------|-------------|
| `getApiKey()` | Retrieves API key by name |
| `getGroqApiKey()` | Gets Groq API key |
| `getGeminiApiKey()` | Gets Gemini API key |
| `getOpenAIApiKey()` | Gets OpenAI API key |
| `getForgeApiKey()` | Gets Forge API key |
| `getApiKeySource()` | Returns 'environment', 'database', or 'not_set' |
| `clearApiKeyCache()` | Clears cached keys (5-min TTL) |

**Placeholder Detection:**
Keys containing these patterns are rejected:
- `your-`, `-key`, `placeholder`, `changeme`, `replace-me`
- `example`, `xxx`, `test-`, `dummy`, `sample`, `temp-`

---

### 3.3 Usage Tracker (`src/lib/ai/usage-tracker.ts`)

**Purpose:** Tracks AI API usage for quotas and cost monitoring.

**Tracked Metrics:**
- Request count per provider
- Token usage (prompt + completion)
- Cost estimates
- Success/failure rates
- Response times

**Key Functions:**
| Function | Description |
|----------|-------------|
| `trackUsage()` | Records AI API call metrics |
| `getUsageStats()` | Retrieves usage statistics |
| `getUsageByProvider()` | Stats filtered by provider |
| `resetUsage()` | Resets usage counters |

---

### 3.4 Tender Extraction (`src/lib/ai/tender-extraction.ts`)

**Purpose:** AI-powered extraction of data from tender documents.

**Extracted Fields:**
- Tender number, title, description
- Issuing authority, submission deadline
- Estimated value, currency
- Technical/commercial requirements
- Product specifications
- Evaluation criteria

**Key Functions:**
| Function | Description |
|----------|-------------|
| `extractTenderData()` | Main extraction function |
| `validateExtraction()` | Validates extracted data |
| `enhanceExtraction()` | AI enhancement of partial data |

---

### 3.5 Budget Analyzer (`src/lib/ai/budget-analyzer.ts`)

**Purpose:** AI analysis of budgets for insights and recommendations.

**Analysis Features:**
- Spending pattern detection
- Anomaly identification
- Forecast generation
- Category optimization suggestions
- Cost-saving opportunities

---

### 3.6 AI Service Manager (`src/lib/ai/ai-service-manager.ts`)

**Purpose:** Orchestrates multiple AI services and handles failover.

**Features:**
- Provider health monitoring
- Automatic failover on errors
- Load balancing across providers
- Cost optimization routing

---

## 4. API Routes

### 4.1 Authentication Routes

#### `POST /api/auth/[...nextauth]`
NextAuth.js handler for all authentication operations.

**Supported Operations:**
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - Get CSRF token

---

### 4.2 Admin Routes

#### `GET/POST /api/admin/users`
User management endpoint.

**GET Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "MANAGER",
      "department": "Sales",
      "isActive": true,
      "lastLogin": "2024-12-01T10:00:00Z"
    }
  ]
}
```

**POST Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "Jane Doe",
  "password": "SecurePass123",
  "role": "SALES",
  "department": "Sales"
}
```

#### `GET/PUT/DELETE /api/admin/users/[id]`
Individual user operations.

#### `GET/POST /api/admin/api-keys`
API key management for AI providers.

**POST Body:**
```json
{
  "provider": "GEMINI_API_KEY",
  "value": "AIza..."
}
```

#### `GET /api/admin/metrics`
System metrics and analytics.

**Response:**
```json
{
  "users": { "total": 50, "active": 45 },
  "tenders": { "total": 200, "won": 80, "lost": 60, "pending": 60 },
  "budgets": { "total": 15, "totalAmount": 5000000 },
  "aiUsage": { "requests": 1500, "tokensUsed": 2500000 }
}
```

---

### 4.3 Budget Routes

#### `GET/POST /api/budgets`
List and create budgets.

**GET Query Parameters:**
- `fiscalYear` - Filter by year
- `status` - Filter by status (DRAFT, ACTIVE, APPROVED, CLOSED)
- `type` - Filter by type (ANNUAL, PROJECT, DEPARTMENT)

**POST Body:**
```json
{
  "name": "2024 Annual Budget",
  "fiscalYear": 2024,
  "type": "ANNUAL",
  "totalAmount": 1000000,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "categories": [
    { "name": "Equipment", "allocatedAmount": 500000 },
    { "name": "Operations", "allocatedAmount": 300000 }
  ]
}
```

#### `GET/PUT/DELETE /api/budgets/[id]`
Individual budget operations.

#### `GET/POST /api/budgets/[id]/categories`
Budget category management.

#### `GET/POST /api/budgets/[id]/transactions`
Budget transaction tracking.

**POST Body:**
```json
{
  "categoryId": "uuid",
  "amount": 5000,
  "description": "Equipment purchase",
  "type": "EXPENSE",
  "reference": "PO-2024-001"
}
```

---

### 4.4 Tender Routes

#### `GET/POST /api/tenders`
List and create tenders.

**GET Query Parameters:**
- `status` - DRAFT, SUBMITTED, UNDER_EVALUATION, WON, LOST
- `department` - Filter by department
- `dateFrom`, `dateTo` - Date range filter

**POST Body:**
```json
{
  "tenderNumber": "MOH-2024-001",
  "title": "Medical Equipment Supply",
  "description": "Supply of diagnostic equipment",
  "issuingAuthority": "Ministry of Health",
  "submissionDeadline": "2024-03-15",
  "estimatedValue": 500000,
  "currency": "KWD",
  "department": "Medical Devices"
}
```

#### `POST /api/tenders/[id]/analyze`
AI-powered tender analysis.

**Response:**
```json
{
  "swot": {
    "strengths": ["Established market presence", "..."],
    "weaknesses": ["Limited capacity", "..."],
    "opportunities": ["Growing market", "..."],
    "threats": ["Competition", "..."]
  },
  "winProbability": {
    "score": 72,
    "confidence": 85,
    "factors": [...]
  },
  "competitiveScore": {
    "overall": 78,
    "breakdown": {
      "priceCompetitiveness": 75,
      "technicalCapability": 85,
      "deliveryCapacity": 70,
      "pastPerformance": 80
    }
  },
  "recommendations": [...],
  "riskAssessment": {...}
}
```

#### `POST /api/tenders/[id]/extract`
Extract data from tender documents.

#### `GET/POST /api/tenders/[id]/items`
Tender line items management.

#### `PUT /api/tenders/[id]/status`
Update tender status.

---

### 4.5 Expense Routes

#### `GET/POST /api/expenses`
List and create expenses.

**POST Body:**
```json
{
  "description": "Office supplies",
  "amount": 150.50,
  "currency": "KWD",
  "category": "Operations",
  "vendorId": "uuid",
  "expenseDate": "2024-12-01",
  "receiptUrl": "https://..."
}
```

#### `POST /api/expenses/[id]/categorize`
AI-powered expense categorization.

**Response:**
```json
{
  "predictedCategory": "Office Supplies",
  "confidence": 92.5,
  "reasoning": "Based on description and vendor type",
  "alternativeCategories": [
    { "category": "Operations", "score": 75 }
  ],
  "isAnomaly": false,
  "anomalyScore": 12,
  "spendingPattern": "REGULAR"
}
```

---

### 4.6 Inventory Routes

#### `GET /api/inventory`
List inventory items with status.

**Query Parameters:**
- `status` - AVAILABLE, LOW_STOCK, OUT_OF_STOCK, EXPIRED
- `category` - Product category filter
- `warehouseId` - Warehouse filter

#### `POST /api/inventory/optimize`
AI-powered inventory optimization.

**Response:**
```json
{
  "demandForecast": {
    "nextMonth": 1500,
    "next3Months": 4200,
    "confidence": 78,
    "trend": "increasing"
  },
  "reorderRecommendations": [
    {
      "productId": "uuid",
      "productName": "Surgical Gloves",
      "currentStock": 100,
      "reorderPoint": 500,
      "suggestedOrderQty": 1000,
      "urgency": "high"
    }
  ],
  "stockOptimization": {
    "overstock": [...],
    "understock": [...],
    "expiringItems": [...]
  },
  "metrics": {
    "turnoverRate": 4.2,
    "stockoutRisk": 15,
    "inventoryHealth": 78
  }
}
```

---

### 4.7 Invoice Routes

#### `GET/POST /api/invoices`
Invoice management.

**POST Body:**
```json
{
  "customerId": "uuid",
  "items": [
    { "productId": "uuid", "quantity": 10, "unitPrice": 50 }
  ],
  "dueDate": "2024-12-31",
  "notes": "Net 30 payment terms"
}
```

---

### 4.8 Document Routes

#### `POST /api/documents/upload`
File upload handler.

**Form Data:**
- `file` - The file to upload
- `category` - Document category
- `relatedTo` - Related entity (tender, expense, etc.)
- `relatedId` - Related entity ID

#### `POST /api/documents/[id]/process`
AI document processing.

**Response:**
```json
{
  "extractedData": {...},
  "confidence": 85,
  "processingTime": 2500,
  "warnings": []
}
```

---

### 4.9 Forecast Routes

#### `POST /api/forecasts/generate`
Generate AI-powered financial forecasts.

**Body:**
```json
{
  "timeframe": "90",
  "categories": ["Equipment", "Operations"],
  "includeInsights": true
}
```

**Response:**
```json
{
  "metrics": {
    "revenue": { "current": 1000000, "predicted": 1150000, "trend": "up" },
    "expenses": { "current": 800000, "predicted": 850000, "trend": "up" },
    "margin": { "current": 200000, "predicted": 300000, "trend": "up" }
  },
  "monthlyData": [...],
  "budgetVariances": [...],
  "aiInsights": [
    {
      "type": "opportunity",
      "title": "Cost Reduction",
      "description": "...",
      "impact": "high"
    }
  ]
}
```

---

### 4.10 Utility Routes

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "aiProviders": {
    "gemini": "available",
    "groq": "available"
  }
}
```

#### `GET /api/diagnostics`
System diagnostics.

#### `GET /api/export`
Export data to PDF, Excel, or CSV.

**Query Parameters:**
- `type` - Export type (pdf, excel, csv)
- `entity` - Entity to export (budgets, expenses, tenders)
- `filters` - JSON encoded filters

---

## 5. Core Library Modules

### 5.1 Prisma Client (`src/lib/prisma.ts`)

**Purpose:** Database connection singleton.

```typescript
import prisma from '@/lib/prisma';

// Usage
const users = await prisma.user.findMany();
```

---

### 5.2 Logger (`src/lib/logger.ts`)

**Purpose:** Structured logging with Winston.

**Log Levels:**
- `error` - Errors and exceptions
- `warn` - Warnings
- `info` - General information
- `debug` - Debug information

**Usage:**
```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId: 'uuid' });
logger.error('Database error', error);
```

---

### 5.3 Cache (`src/lib/cache.ts`)

**Purpose:** Redis-based caching layer.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `cache.get()` | Retrieve cached value |
| `cache.set()` | Store value with TTL |
| `cache.delete()` | Remove cached value |
| `cache.flush()` | Clear all cache |

---

### 5.4 Email (`src/lib/email.ts`)

**Purpose:** Email sending functionality.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `sendEmail()` | Send single email |
| `sendBulkEmail()` | Send to multiple recipients |
| `sendTemplatedEmail()` | Send using template |

---

### 5.5 Storage (`src/lib/storage.ts`)

**Purpose:** File storage abstraction (S3/local).

**Key Functions:**
| Function | Description |
|----------|-------------|
| `uploadFile()` | Upload file to storage |
| `downloadFile()` | Download file from storage |
| `deleteFile()` | Remove file from storage |
| `getSignedUrl()` | Generate presigned URL |

---

### 5.6 Export (`src/lib/export.ts`)

**Purpose:** Data export to various formats.

**Supported Formats:**
- PDF (using PDFKit)
- Excel (using ExcelJS)
- CSV

---

### 5.7 OCR (`src/lib/ocr.ts`)

**Purpose:** Document text extraction using AWS Textract.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `extractText()` | Extract text from document |
| `extractTables()` | Extract tabular data |
| `extractForms()` | Extract form key-value pairs |

---

### 5.8 Validations (`src/lib/validations.ts`)

**Purpose:** Zod schemas for input validation.

**Available Schemas:**
- `userSchema` - User creation/update
- `budgetSchema` - Budget validation
- `tenderSchema` - Tender validation
- `expenseSchema` - Expense validation
- `invoiceSchema` - Invoice validation

---

### 5.9 Audit (`src/lib/audit.ts`)

**Purpose:** Audit logging for compliance.

**Tracked Actions:**
- User authentication events
- Data modifications (CRUD)
- Permission changes
- Export operations

---

### 5.10 RBAC (`src/lib/rbac.ts`)

**Purpose:** Role-based access control.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `checkPermission()` | Verify user has permission |
| `getRolePermissions()` | Get all permissions for role |
| `assignRole()` | Assign role to user |

---

## 6. UI Components

### 6.1 Layout Components

#### Header (`src/components/layout/header.tsx`)
Top navigation bar with user menu, notifications, and search.

#### Sidebar (`src/components/layout/sidebar.tsx`)
Main navigation sidebar with collapsible menu items.

---

### 6.2 UI Design System (`src/components/ui/`)

All components are built on Radix UI primitives with Tailwind styling.

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, ghost, destructive variants |
| `Card` | Container with header, content, footer slots |
| `Dialog` | Modal dialog with animations |
| `Input` | Text input with validation states |
| `Select` | Dropdown select with search |
| `Table` | Data table with sorting, pagination |
| `Tabs` | Tab navigation component |
| `Badge` | Status badges with color variants |
| `Alert` | Alert/notification messages |
| `Progress` | Progress bar with percentage |
| `Skeleton` | Loading placeholder |
| `Switch` | Toggle switch input |
| `Checkbox` | Checkbox with label |
| `Textarea` | Multi-line text input |
| `Avatar` | User avatar with fallback |
| `DropdownMenu` | Contextual dropdown menus |

---

### 6.3 Feature Components

#### AI Usage Widget (`src/components/ai/ai-usage-widget.tsx`)
Displays AI API usage statistics, quotas, and cost estimates.

#### Budget AI Insights (`src/components/budget/ai-insights.tsx`)
Shows AI-generated budget recommendations and anomalies.

#### Document Upload (`src/components/documents/document-upload.tsx`)
Drag-and-drop file upload with progress indicator.

#### Extraction Review (`src/components/documents/extraction-review.tsx`)
Review and edit AI-extracted data from documents.

#### Tender Card (`src/components/tenders/tender-card.tsx`)
Tender summary card with status, deadline, and value.

#### Bulk Tender Upload (`src/components/tenders/bulk-tender-upload.tsx`)
Bulk upload interface for multiple tender documents.

---

## 7. Database & Prisma

### 7.1 Main Schema (`prisma/schema.prisma`)

**Core Models:**

| Model | Description |
|-------|-------------|
| `User` | System users with authentication |
| `Budget` | Annual/project/department budgets |
| `BudgetCategory` | Budget line items |
| `BudgetTransaction` | Budget spending records |
| `Tender` | Procurement tenders |
| `TenderItem` | Tender line items |
| `TenderAnalysis` | AI analysis results |
| `Expense` | Expense records |
| `ExpenseCategorization` | AI categorization results |
| `Invoice` | Customer invoices |
| `InvoiceItem` | Invoice line items |
| `Customer` | Customer records |
| `Supplier` | Supplier/vendor records |
| `Product` | Product catalog |
| `Inventory` | Stock levels |
| `Document` | Uploaded documents |
| `AuditLog` | System audit trail |
| `AppSettings` | Application settings (API keys) |

---

### 7.2 Key Relationships

```
User
├── Budgets (created)
├── Tenders (assigned)
├── Expenses (submitted)
└── AuditLogs

Budget
├── Categories
│   └── Transactions
└── Forecasts

Tender
├── Items
├── Participants
├── Analysis
└── Documents

Expense
├── Categorization
├── Vendor (Supplier)
└── Documents
```

---

## 8. Desktop (Electron) Integration

### 8.1 Desktop Integration (`src/lib/desktop-integration.ts`)

**Purpose:** Bridge between web app and Electron features.

**Features:**
- Local file system access
- Native notifications
- System tray integration
- Offline mode support

---

### 8.2 Desktop Document Processor (`src/lib/desktop-document-processor.ts`)

**Purpose:** Document processing optimized for desktop.

**Features:**
- Local OCR processing
- File watching
- Batch processing
- Offline queue

---

### 8.3 Desktop AI Processor (`src/lib/desktop-ai-processor.ts`)

**Purpose:** AI features for desktop app.

**Features:**
- Cached AI responses
- Offline fallback
- Local model support (future)

---

### 8.4 Electron Hook (`src/hooks/useElectron.ts`)

**Purpose:** React hook for Electron features.

**Usage:**
```typescript
const { isElectron, sendToMain, onFromMain } = useElectron();

if (isElectron) {
  sendToMain('save-file', { path, content });
}
```

---

## 9. Configuration Files

### 9.1 Next.js Config (`next.config.ts`)

**Key Settings:**
- `output: 'standalone'` - Optimized for containerized deployment
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Package optimization for Lucide and Recharts

### 9.2 Environment Variables

**Required:**
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=<32+ character secret>
NEXTAUTH_URL=http://localhost:3000

# AI Providers (at least one required)
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# AWS (for OCR and storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...

# Optional
REDIS_URL=redis://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

### 9.3 TypeScript Config (`tsconfig.json`)

**Path Aliases:**
- `@/*` → `./src/*`

### 9.4 Jest Config (`jest.config.js`)

**Test Environment:** jsdom
**Coverage Threshold:** 70% (branches, functions, lines, statements)

---

## Appendix: API Rate Limits Summary

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/api/auth/*` | 5 | 15 min |
| `/api/*/analyze` | 30 | 1 hour |
| `/api/*/categorize` | 30 | 1 hour |
| `/api/*/optimize` | 30 | 1 hour |
| `/api/forecasts/*` | 30 | 1 hour |
| `/api/documents/upload` | 20 | 1 hour |
| All other endpoints | 100 | 15 min |

---

## Appendix: Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

*This documentation is auto-generated and should be updated when modules change.*
