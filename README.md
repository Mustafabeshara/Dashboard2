# Medical Distribution Management System

A comprehensive web-based management system for medical device distribution companies, with a focus on budgeting, tender management, inventory tracking, and financial operations.

Built for **Beshara Group - Healthcare Solutions Division** in Kuwait.

## 📱 Desktop Application Available

This application is now available as a **desktop application** with full offline capabilities and enhanced AI features. See [README_DESKTOP.md](README_DESKTOP.md) for details on the desktop version.

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

### 🤖 AI-Powered Features (Desktop Only)
- **PDF Text Extraction**: Advanced PDF parsing with 99% accuracy
- **OCR Support**: Optical Character Recognition for scanned documents
- **Intelligent Extraction**: AI-powered data extraction using multiple LLMs
- **Data Validation**: Zod schema validation for extracted data quality
- **Document Processing Queue**: Batch processing with progress tracking

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

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (for web version)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mustafabeshara/Dashboard2.git
cd medical-distribution-system
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
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Desktop Application Setup

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

| Email | Password | Role |
|-------|----------|------|
| admin@beshara.com | admin123 | Administrator |
| ceo@beshara.com | admin123 | CEO |
| cfo@beshara.com | admin123 | CFO |
| finance.manager@beshara.com | admin123 | Finance Manager |
| sales.manager@beshara.com | admin123 | Manager |

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

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed sample data

# Desktop application
npm run electron:dev     # Run desktop app in development
npm run electron:build   # Build desktop app for distribution

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
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