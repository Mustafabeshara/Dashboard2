# Medical Distribution Management System

A comprehensive web-based management system for medical device distribution companies, with a focus on budgeting, tender management, inventory tracking, and financial operations.

Built for **Beshara Group - Healthcare Solutions Division** in Kuwait.

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
- **State**: React hooks + Zustand
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

### Backend

- **API**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Validation**: Zod schemas

### Desktop Application

- **Framework**: Electron with Node.js
- **Local Database**: SQLite with Prisma ORM
- **AI Processing**: pdf-parse, AWS Textract, Google Vision, Gemini, Groq
- **UI**: Same Next.js frontend with desktop enhancements
- **Offline Support**: Full functionality without internet connection

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (for web version)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/mustafabeshara/dashboard2.git
cd dashboard2
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and other settings:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medical_db?schema=public"
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
```

## Testing

### Unit Tests

```bash
# Run Jest test suite
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## License

Proprietary - Beshara Group

## Support

For questions or support, contact: support@beshara.com
