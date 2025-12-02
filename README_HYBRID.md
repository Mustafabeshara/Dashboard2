# Medical Distribution Management System

A comprehensive business management solution that works as both a **desktop application** and a **web application**, featuring AI-powered document processing, budget management, and enterprise-grade features.

## 🚀 Features

### Core Features
- 📊 **Dashboard & Analytics** - Real-time business insights
- 💰 **Budget Management** - Multi-level approval workflows
- 📄 **Document Processing** - AI-powered PDF extraction
- 🏪 **Inventory Management** - Stock tracking and alerts
- 👥 **Customer Management** - CRM functionality
- 💼 **Supplier Management** - Vendor relationship management
- 📈 **Financial Reports** - Comprehensive business analytics
- 🔐 **Role-based Access Control** - Multi-level user permissions

### AI Features
- 🧠 **Intelligent Document Processing** - Extract data from PDFs, invoices, tenders
- 🤖 **Multi-LLM Support** - OpenAI, Anthropic, and custom providers
- ✅ **Data Validation** - Automated quality assurance
- 📊 **Processing Analytics** - Performance monitoring and optimization

### Technical Features
- 🖥️ **Desktop App** - Native Electron application
- 🌐 **Web App** - Responsive web interface
- 💾 **Offline Support** - Local SQLite database
- 🔄 **Real-time Sync** - Cloud synchronization
- 📱 **Cross-platform** - Windows, macOS, Linux, Web

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - Full-stack API
- **Prisma** - Database ORM
- **SQLite** - Local database (desktop)
- **PostgreSQL** - Cloud database (web)
- **NextAuth.js** - Authentication

### Desktop
- **Electron** - Cross-platform desktop framework
- **Nextron** - Next.js + Electron integration
- **SQLite** - Offline database storage

### AI & Processing
- **OpenAI GPT-4** - Primary LLM
- **Anthropic Claude** - Alternative LLM
- **PDF.js** - Document processing
- **Tesseract OCR** - Image text extraction

## 📦 Installation

### Prerequisites
- Node.js 20.9.0 or higher
- npm or yarn
- Git

### Clone Repository
```bash
git clone <repository-url>
cd medical-distribution-dashboard
```

### Install Dependencies
```bash
npm install
```

### Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed with sample data
npm run db:seed
```

## 🚀 Running the Application

### Desktop Application (Recommended for Production)
```bash
# Run desktop app with Electron + Next.js
npm run dev

# Build desktop app for distribution
npm run build:desktop
```

### Web Application
```bash
# Run web app in development (port 3002)
npm run dev:web

# Build web app for production
npm run build:web

# Start production web server
npm run start:web
```

### Environment Detection
The application automatically detects whether it's running in:
- **Desktop Mode**: Electron environment with local SQLite database
- **Web Mode**: Browser environment with potential cloud database

Features adapt accordingly:
- Desktop: File system access, system tray, offline database
- Web: Cloud storage, web notifications, responsive design

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start desktop application (Electron + Next.js) |
| `npm run dev:web` | Start web application only |
| `npm run build` | Build desktop application |
| `npm run build:desktop` | Build desktop application |
| `npm run build:web` | Build web application (static export) |
| `npm run start` | Start Next.js production server |
| `npm run start:web` | Start web application production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push database schema |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with sample data |

## 🏗️ Architecture

### Desktop Mode (Nextron)
```
app/ (Electron main process)
├── background.js - Electron main process
└── preload.js - Secure API bridge

renderer/ (Next.js frontend)
├── next.config.js - Next.js configuration
├── src/
│   ├── app/ - Next.js app router
│   ├── components/ - React components
│   ├── lib/ - Utilities and services
│   └── types/ - TypeScript definitions
```

### Web Mode
```
src/ (Next.js application)
├── app/ - Next.js app router
├── components/ - React components
├── lib/ - Utilities and services
└── types/ - TypeScript definitions
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### Desktop Configuration (Nextron)

The desktop app uses Nextron framework which provides:
- **Main Process**: Electron main process (`app/` directory)
- **Renderer Process**: Next.js frontend (`renderer/` directory)
- **Local SQLite Database**: Offline-first data storage
- **File System Access**: Native file operations
- **System Integration**: Tray, notifications, window management

**Configuration**: `nextron.config.js` manages the build process

### Web Configuration

The web app uses standard Next.js deployment:
- PostgreSQL database (when deployed)
- Cloud storage for files
- Web-based notifications
- Responsive design for all devices

## 🔒 Security Features

- **Role-based Access Control** - Multi-level permissions
- **Input Validation** - Zod schema validation
- **SQL Injection Protection** - Prisma ORM
- **XSS Protection** - React's built-in sanitization
- **CSRF Protection** - NextAuth.js security
- **Secure IPC** - Electron context isolation

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

## 📦 Deployment

### Desktop App Distribution
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run build:all
```

### Web App Deployment
```bash
# Build for production
npm run build:web

# Deploy to Vercel, Netlify, or any static host
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@example.com
- 📖 Documentation: [docs](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🖥️ Desktop Shortcuts

**Ready-to-use desktop shortcuts are included:**

### macOS Desktop Icons
- **`Medical Distribution Dashboard.app`** - Native macOS application bundle
- **`Medical Distribution Dashboard`** - Alternative launcher script

### Windows (when built)
- Desktop shortcut will be created automatically
- Start menu entry available

**Just double-click the desktop icon to launch!** 🚀

See [`DESKTOP_SHORTCUT_README.md`](./DESKTOP_SHORTCUT_README.md) for detailed instructions.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI features
- [ ] Multi-tenant support
- [ ] API integrations
- [ ] Advanced reporting
- [ ] Workflow automation
