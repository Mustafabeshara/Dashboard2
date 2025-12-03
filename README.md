# Medical Distribution Management System

A comprehensive web-based management system for medical device distribution companies, with a focus on budgeting, tender management, inventory tracking, and financial operations.

Built for **Beshara Group - Healthcare Solutions Division** in Kuwait.

## 📱 Hybrid Architecture: Web + Desktop

This system is available in **two deployment modes**:

### 🌐 Web Application (PostgreSQL)

- Cloud-hosted on Railway/Vercel
- Multi-user collaboration
- Centralized data management
- Access from any device with a browser

### 💻 Desktop Application (SQLite + Electron)

- **Offline-First**: Full functionality without internet
- **AI-Powered Document Processing**: Multi-provider LLM support (Gemini, Groq, Google AI, Anthropic)
- **Native System Integration**: File system access, notifications, system tray
- **Local Database**: SQLite with automatic sync to cloud (when online)
- **Enhanced Performance**: Optimized for desktop hardware
- **Cross-Platform**: Available for macOS, Windows, and Linux

#### Desktop-Specific Features

- PDF text extraction with 99% accuracy using pdf-parse
- OCR support for scanned documents (AWS Textract, Google Vision)
- AI-powered tender data extraction with validation
- Document preprocessing and normalization
- Batch processing queue with progress tracking
- Multi-window support for parallel work
- Native keyboard shortcuts and system integration

## Features

### Budgeting Module (Priority Feature)

- Multi-step budget creation wizard
- Hierarchical category structure (up to 4 levels)
- Real-time budget vs. actual tracking
- Approval workflow with 4 levels based on amount:
  - Auto-approve: Under 1,000 KWD
  - Manager: 1,000 - 10,000 KWD
  - Finance Manager: 10,000 - 50,000 KWD
  - CFO: 50,000 - 100,000 KWD
  - CEO: Above 100,000 KWD
- Variance alerts at 80% and 90% consumption
- Department-wise budget allocation
- Export to Excel/PDF functionality

### Dashboard

- Executive overview with key metrics
- Budget consumption gauge charts
- Department performance cards
- Real-time alerts for over-budget items
- Pending approval queue
- Recent transaction list
- Upcoming tender deadlines

### Other Modules

- Tender Management (MOH Kuwait)
- Inventory & Product Management
- Customer Management (Government Hospitals)
- Expense Tracking
- Invoice Management
- Audit Logging

## Tech Stack

### Frontend

- **Framework**: Next.js 16 with App Router
- **UI**: Tailwind CSS with shadcn/ui components
- **Type Safety**: TypeScript with strict mode
- **State**: React hooks + Zustand (desktop)

### Backend

- **Web**: Next.js API routes with PostgreSQL
- **Desktop**: Electron + SQLite with Node.js
- **ORM**: Prisma (dual schema: web + local)
- **Authentication**: NextAuth.js with JWT
- **Validation**: Zod schemas

### AI/ML (Desktop)

- **LLM Providers**: Gemini, Groq, Google AI, Anthropic (fallback chain)
- **Document Processing**: pdf-parse, Sharp
- **OCR**: AWS Textract, Google Vision API
- **Validation**: Zod-based schema validation

## Tech Stack

### Web Application

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **State Management**: Zustand
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

### Desktop Application

- **Framework**: Electron with Node.js
- **Local Database**: SQLite with Prisma ORM
- **AI Processing**: pdf-parse, AWS Textract, Google Vision, Gemini, Groq
- **UI**: Same Next.js frontend with desktop enhancements
- **Offline Support**: Full functionality without internet connection

## Getting Started

### Quick Start

**For rapid setup and testing, use our automated scripts:**

```bash
# 1. Automated environment setup
./setup-phase2-tests.sh

# 2. Start development server
npm run dev

# 3. Test API endpoints (in another terminal)
./test-api-endpoints.sh
```

📖 **See [PHASE_2_SUMMARY.md](./PHASE_2_SUMMARY.md)** for complete setup and testing guide.

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (for web version) or Railway account
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Mustafabeshara/Dashboard2.git
cd Dashboard2
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

**Option A: Automated Setup (Recommended)**

```bash
./setup-phase2-tests.sh
```

**Option B: Manual Setup**

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and other settings:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medical_db?schema=public"
# Or use Railway database URL
NEXTAUTH_SECRET="your-super-secret-key"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Optional: AI Features
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"
```

4. Set up the database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (or use migrations)
npm run db:push

# Seed with sample data
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

### Quick API Tests

```bash
# Run automated API endpoint tests
./test-api-endpoints.sh
```

### Manual Testing

Follow the comprehensive testing guide:

- **[PHASE_2_TESTING_GUIDE.md](./PHASE_2_TESTING_GUIDE.md)** - Detailed testing procedures for:
  - Budget creation workflow
  - AI forecasting with LLMs
  - Document processing and extraction
  - API key management
  - End-to-end integration tests

### Test Accounts (after seeding)

| Role            | Email               | Password | Permissions         |
| --------------- | ------------------- | -------- | ------------------- |
| Admin           | admin@beshara.com   | admin123 | All access          |
| CEO             | ceo@beshara.com     | admin123 | Approvals >100K KWD |
| CFO             | cfo@beshara.com     | admin123 | Approvals >50K KWD  |
| Finance Manager | finance@beshara.com | admin123 | Approvals >10K KWD  |
| Manager         | manager@beshara.com | admin123 | Approvals >1K KWD   |

### Unit Tests

```bash
# Run Jest test suite
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Desktop Application Setup

To run the desktop version:

1. Set up local database:

```bash
# Generate Prisma client for local database
npm run db:local:generate

# Push schema to local database
npm run db:local:push
```

2. Start the desktop application in development mode:

```bash
npm run electron:dev
```

3. Build the desktop application for distribution:

```bash
# Build for current platform
npm run electron:build

# Build for specific platforms
npm run electron:builder:mac    # macOS
npm run electron:builder:win    # Windows
npm run electron:builder:linux  # Linux
```

### Test Credentials

After seeding the database, you can log in with these accounts:

| Email                       | Password | Role            |
| --------------------------- | -------- | --------------- |
| admin@beshara.com           | admin123 | Administrator   |
| ceo@beshara.com             | admin123 | CEO             |
| cfo@beshara.com             | admin123 | CFO             |
| finance.manager@beshara.com | admin123 | Finance Manager |
| sales.manager@beshara.com   | admin123 | Manager         |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── dashboard/     # Main dashboard
│   │   ├── budgets/       # Budget management
│   │   ├── tenders/       # Tender management
│   │   └── ...
│   └── api/               # API routes
├── components/
│   ├── ui/               # UI components (shadcn/ui style)
│   ├── layout/           # Layout components
│   ├── dashboard/        # Dashboard widgets
│   └── budget/           # Budget-specific components
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # Auth configuration
│   └── utils.ts          # Helper functions
├── providers/            # React context providers
├── store/                # Zustand stores
├── types/                # TypeScript types
└── hooks/                # Custom React hooks
```

## API Endpoints

### Authentication

- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Budgets

- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create new budget
- `GET /api/budgets/:id` - Get budget details
- `PUT /api/budgets/:id` - Update budget
- `POST /api/budgets/:id/approve` - Approve budget

### Dashboard

- `GET /api/dashboard/stats` - Dashboard statistics

### Transactions

- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/:id/approve` - Approve transaction

## Desktop Application IPC API

The desktop app uses Electron IPC for communication between renderer and main process:

### Database Operations

```javascript
// Generic database queries
await window.electronAPI.invoke('db:query', { table: 'tenders', operation: 'findMany' });
await window.electronAPI.invoke('db:initialize');
```

### AI Document Processing

```javascript
// Add document to processing queue
await window.electronAPI.invoke('ai:add-to-queue', {
  filePath: '/path/to/document.pdf',
  type: 'tender',
});

// Get queue status
const queue = await window.electronAPI.invoke('ai:get-queue');

// Clear queue
await window.electronAPI.invoke('ai:clear-queue');
```

### File System Access

```javascript
// Open file selection dialog
const files = await window.electronAPI.invoke('fs:select-files', {
  filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
});

// Read file content
const content = await window.electronAPI.invoke('fs:read-file', filePath);
```

### Application Control

```javascript
// Get app info
const info = await window.electronAPI.invoke('get-app-info');

// Check connectivity
const isOnline = await window.electronAPI.invoke('is-online');

// Get sync status
const syncStatus = await window.electronAPI.invoke('get-sync-status');
```

### Event Listeners

```javascript
// Listen for AI processing updates
window.electronAPI.on('ai-queue-update', data => {
  console.log('Processing:', data);
});

// Listen for sync events
window.electronAPI.on('sync-complete', () => {
  console.log('Sync completed');
});
```

## Business Rules

### Approval Thresholds

- Under 1,000 KWD: Auto-approved
- 1,000 - 10,000 KWD: Manager approval
- 10,000 - 50,000 KWD: Finance Manager approval
- 50,000 - 100,000 KWD: CFO approval
- Above 100,000 KWD: CEO approval

### Budget Alerts

- Alert triggered at 80% consumption
- Critical alert at 90% consumption
- Block transactions exceeding budget (unless override approved)

### Roles & Permissions

- **Admin**: Full system access
- **CEO**: All budgets, tenders, reports
- **CFO**: Budgets, expenses, financial reports
- **Finance Manager**: Budget view, expense approval
- **Manager**: Department budgets, expense submission
- **Sales**: Tenders, customers
- **Warehouse**: Inventory management
- **Finance**: Invoices, expenses

## Development

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL 14+ (for web deployment)
- Python 3.x (for desktop builds)

### Available Scripts

```bash
# Web Application Development
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server

# Desktop Application
npm run electron:dev           # Run Electron + Next.js in development
npm run electron:build         # Build desktop app (current platform)
npm run electron:builder:mac   # Build .dmg for macOS
npm run electron:builder:win   # Build installer for Windows
npm run electron:builder:linux # Build AppImage for Linux

# Database Management
npm run db:generate        # Generate Prisma client (web)
npm run db:local:generate  # Generate Prisma client (desktop)
npm run db:generate:all    # Generate both clients (REQUIRED before desktop builds)
npm run db:push            # Push schema to PostgreSQL
npm run db:local:push      # Push schema to SQLite
npm run db:migrate         # Create migration
npm run db:seed            # Seed sample data
npm run db:local:studio    # Open Prisma Studio for SQLite

# Quality Assurance
npm run lint           # Run ESLint
npm run test           # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report (70% threshold)
npm run validate:env   # Validate environment variables
```

### Environment Setup

#### Web Application (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medical_dashboard"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"
```

#### Desktop Application (.env.local)

```env
# Local SQLite Database
LOCAL_DATABASE_URL="file:./local.db"

# AI Providers (at least one required)
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
GOOGLE_AI_API_KEY="your-google-ai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# OCR Services (optional)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
GOOGLE_VISION_API_KEY="your-vision-key"

# Email (optional)
EMAIL_SERVER="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER="noreply@example.com"
EMAIL_PASSWORD="your-password"
```

### Quick Start

#### Web Application

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database
npm run db:push
npm run db:seed

# 3. Start development server
npm run dev
```

#### Desktop Application

```bash
# 1. Install dependencies
npm install

# 2. Generate both Prisma clients
npm run db:generate:all

# 3. Set up local database
npm run db:local:push

# 4. Run desktop app
npm run electron:dev

# 5. Build desktop app (production)
npm run electron:build
```

### Code Standards

- Use TypeScript for type safety
- Follow React best practices
- Implement error handling with try-catch
- Add loading states for async operations
- Use Zod for runtime validation
- Follow the existing component patterns

## Currency Support

- Primary: KWD (Kuwaiti Dinar)
- Secondary: USD (US Dollar)
- All monetary values stored as Decimal in database

## Security Features

- JWT-based authentication
- Role-based access control
- Session timeout (30 minutes)
- Audit logging for financial transactions
- Input validation on all forms
- CSRF protection

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - Beshara Group

## Support

For support, contact the IT department at it@beshara.com

# Railway deploy trigger
