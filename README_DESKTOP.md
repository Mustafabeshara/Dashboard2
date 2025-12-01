# Medical Distribution Dashboard - Desktop Application

## Overview

This is the desktop version of the Medical Distribution Dashboard, built with Electron to provide a powerful standalone application with full offline capabilities. The desktop app includes all the AI features of the web version plus enhanced desktop-specific functionality.

## Features

### 🧠 AI-Powered Document Processing
- **PDF Text Extraction**: Advanced PDF parsing with pdf-parse library
- **OCR Support**: Optical Character Recognition for scanned documents (AWS Textract & Google Vision)
- **Intelligent Extraction**: AI-powered data extraction using Gemini, Groq, and other LLMs
- **Data Validation**: Zod schema validation for extracted data quality assurance
- **Preprocessing**: Document cleaning and normalization for better AI results

### 💻 Desktop-Specific Capabilities
- **Offline-First Architecture**: Full functionality without internet connection
- **Native File System Access**: Direct access to local documents and files
- **System Integration**: Native notifications, system tray, and keyboard shortcuts
- **Local Database**: SQLite database with automatic backup and sync capabilities
- **Multi-Window Support**: Work with multiple documents simultaneously

### 📊 Comprehensive Dashboard
- **Real-time Processing Monitor**: Track AI extraction progress
- **Document Management**: Import, organize, and process documents
- **Extraction Review**: Human-in-the-loop workflow for quality assurance
- **Performance Analytics**: Monitor processing speed and accuracy
- **Custom Reports**: Generate insights from processed data

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for complex state handling
- **Type Safety**: TypeScript with strict typing

### Backend
- **Runtime**: Electron with Node.js
- **Database**: SQLite with Prisma ORM
- **File Processing**: pdf-parse, Sharp for image processing
- **AI Integration**: Unified LLM provider interface

### Desktop Integration
- **Native APIs**: File system, system tray, notifications
- **Offline Support**: Full functionality without internet
- **Performance**: Optimized for desktop hardware
- **Security**: Sandboxed execution environment

## Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.x (for native module compilation)
- Xcode Command Line Tools (macOS)
- Windows Build Tools (Windows)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/medical-dashboard.git
cd medical-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Database
LOCAL_DATABASE_URL="file:./local.db"

# AI Providers
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# OCR Providers (optional)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
GOOGLE_VISION_API_KEY="your-google-vision-api-key"

# Email (optional)
EMAIL_SERVER="smtp.your-email-provider.com"
EMAIL_PORT=587
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-email-password"
```

### 4. Set Up Local Database
```bash
# Generate Prisma client for local database
npm run db:local:generate

# Push schema to local database
npm run db:local:push
```

## Development

### Run in Development Mode
```bash
# Run the desktop app in development mode
npm run electron:dev
```

This command will:
1. Start the Next.js development server
2. Launch the Electron app
3. Enable hot reloading for both frontend and backend

### Run Web Version Only
```bash
# Run only the web version
npm run dev
```

### Test Local Database
```bash
# Test local database functionality
node test-local-db.js
```

## Building for Production

### Build the Complete Desktop Application
```bash
# Build for current platform
npm run electron:build
```

### Build for Specific Platforms
```bash
# Build for macOS (Intel and Apple Silicon)
npm run electron:builder:mac

# Build for Windows
npm run electron:builder -- --win

# Build for Linux
npm run electron:builder -- --linux
```

### Build Output
The built applications will be located in the `dist-electron` directory:
- **macOS**: `.dmg` installer
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` or `.deb` package

## Project Structure

```
medical-distribution-system/
├── electron/                  # Electron main process files
│   ├── main.js               # Main process entry point
│   ├── preload.js            # Renderer process preload script
│   └── database.js           # Local database management
├── src/                      # Next.js application
│   ├── app/                  # App Router pages
│   │   ├── desktop/          # Desktop-specific pages
│   │   └── (dashboard)/      # Shared dashboard pages
│   ├── components/           # React components
│   │   ├── desktop/          # Desktop-specific components
│   │   └── ui/              # Shared UI components
│   └── lib/                  # Utility libraries
│       ├── desktop-*.ts      # Desktop-specific utilities
│       └── ai/              # AI processing modules
├── prisma/                   # Database schema
│   └── schema.local.prisma   # Local SQLite schema
├── build/                    # Build resources
│   ├── icon.icns             # macOS app icon
│   └── icon.ico              # Windows app icon
├── dist-electron/            # Build output directory
└── scripts/                  # Utility scripts
```

## Electron Architecture

### Main Process (`electron/main.js`)
- Creates and manages browser windows
- Handles system tray integration
- Manages local database
- Implements IPC communication
- Controls application lifecycle

### Preload Script (`electron/preload.js`)
- Exposes secure APIs to renderer process
- Implements context isolation
- Handles IPC messaging
- Provides platform information

### Renderer Process
- Next.js web application
- Communicates with main process via IPC
- Renders UI components
- Handles user interactions

## API Integration

### IPC Channels
The desktop app uses IPC (Inter-Process Communication) to communicate between the main and renderer processes:

#### Database Operations
- `db:*` - Database CRUD operations
- `db:query` - Generic database queries
- `db:initialize` - Database initialization

#### AI Processing
- `ai:add-to-queue` - Add document to processing queue
- `ai:get-queue` - Get processing queue status
- `ai:clear-queue` - Clear processing queue

#### File System
- `fs:select-files` - Open file selection dialog
- `fs:read-file` - Read file content

#### Application Control
- `get-app-info` - Get application information
- `get-sync-status` - Get sync status
- `is-online` - Check internet connectivity

### Usage Example
```javascript
// In renderer process (frontend)
const appInfo = await window.electronAPI.invoke('get-app-info');
const queueStatus = await window.electronAPI.invoke('ai:get-queue');

// Listen for events
window.electronAPI.on('ai-queue-update', (data) => {
  console.log('Queue updated:', data);
});
```

## Database

### Local SQLite Database
The desktop app uses a local SQLite database for offline storage:

#### Schema
- Companies, Products, Tenders, Customers
- Users, Sessions
- Inventory, Invoices, Expenses
- Offline Queue for sync operations
- Sync Metadata for cloud synchronization

#### Prisma Integration
```bash
# Generate client for local database
npm run db:local:generate

# Push schema to database
npm run db:local:push

# Open database studio
npm run db:local:studio
```

## AI Processing Pipeline

### Document Ingestion
1. User selects documents via file dialog
2. Documents added to processing queue
3. Queue manager processes documents sequentially

### Text Extraction
1. PDF documents processed with pdf-parse
2. Image documents processed with OCR
3. Raw text extracted and cleaned

### Preprocessing
1. Text cleaning and normalization
2. Header/footer removal
3. Date and number standardization

### AI Extraction
1. Structured prompts sent to LLM
2. Confidence scoring for each field
3. Data validation with Zod schemas

### Review & Approval
1. Low-confidence extractions routed for review
2. Interactive correction UI
3. Final approval and storage

## Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "electron:dev": "concurrently -k \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:builder": "electron-builder",
    "electron:builder:mac": "electron-builder --mac",
    "db:local:generate": "prisma generate --schema=prisma/schema.local.prisma",
    "db:local:push": "prisma db push --schema=prisma/schema.local.prisma",
    "db:local:studio": "prisma studio --schema=prisma/schema.local.prisma"
  }
}
```

### Electron Builder Config (`electron-builder.json`)
- App ID and product name
- Build output directories
- Platform-specific targets
- Icons and entitlements

## Security

### Sandbox Environment
- Renderer processes run in sandboxed environment
- Context isolation enabled
- Secure IPC communication

### Data Protection
- Local data encrypted at rest
- Secure credential storage
- Access control based on user roles

### Updates
- Automatic update checking
- Secure update verification
- Rollback capability

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules/.cache
npm install
```

#### 2. Database Connection Issues
```bash
# Reset local database
npm run db:local:reset
```

#### 3. Native Module Compilation Errors
```bash
# Rebuild native modules
npm rebuild
```

#### 4. Development Server Not Responding
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
npm run electron:dev
```

### Debugging
- Enable developer tools in development mode
- Check Electron logs in console
- Use Prisma Studio to inspect database
- Monitor IPC communication

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new functionality
- Document public APIs

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Deployment

### Release Process
1. Update version in `package.json`
2. Create release branch
3. Build for all platforms
4. Test installers
5. Create GitHub release
6. Publish to distribution channels

### Distribution Channels
- GitHub Releases
- Internal software repository
- Enterprise deployment tools

## Support

### Documentation
- This README file
- API documentation in `docs/`
- Code comments and JSDoc

### Community
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Internal wiki for team knowledge

### Contact
For support, contact the development team at support@beshara.com

## License

Proprietary - Beshara Group