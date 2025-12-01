# Desktop Application Implementation Guide

## Overview

This guide provides a comprehensive overview of how to implement, build, and deploy the desktop version of the Medical Distribution Dashboard using Electron. The desktop application combines the power of a web-based interface with native desktop capabilities.

## Architecture

### Electron Architecture Components

1. **Main Process** (`electron/main.js`)
   - Controls the application lifecycle
   - Manages browser windows
   - Handles system tray integration
   - Implements native APIs
   - Manages local database

2. **Renderer Process** (Next.js web application)
   - User interface built with React
   - Communicates with main process via IPC
   - Renders dashboard components
   - Handles user interactions

3. **Preload Script** (`electron/preload.js`)
   - Exposes secure APIs to renderer
   - Implements context isolation
   - Handles IPC messaging

### Data Flow

```
User Interface (Renderer) 
    ↓ (IPC)
Main Process (Electron)
    ↓ (Prisma ORM)
Local SQLite Database
    ↓ (Optional)
Cloud Sync Services
```

## Implementation Steps

### 1. Project Structure Setup

The desktop application extends the existing web application with additional Electron-specific files:

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
├── dist-electron/            # Build output directory
└── scripts/                  # Utility scripts
```

### 2. Main Process Implementation

The main process (`electron/main.js`) handles:

#### Application Lifecycle
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

#### Window Management
```javascript
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');
}
```

#### IPC Communication
```javascript
ipcMain.handle('db:query', async (event, query) => {
  // Handle database queries from renderer
  return await executeDatabaseQuery(query);
});

ipcMain.handle('ai:process-document', async (event, documentPath) => {
  // Handle AI document processing
  return await processDocumentWithAI(documentPath);
});
```

### 3. Preload Script Implementation

The preload script (`electron/preload.js`) securely exposes APIs:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  queryDatabase: (query) => ipcRenderer.invoke('db:query', query),
  
  // AI processing
  processDocument: (documentPath) => ipcRenderer.invoke('ai:process-document', documentPath),
  
  // File system operations
  selectFiles: () => ipcRenderer.invoke('fs:select-files'),
  
  // Event listeners
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});
```

### 4. Renderer Process Integration

In the React components, use the exposed APIs:

```javascript
import { useEffect, useState } from 'react';

function DocumentProcessor() {
  const [documents, setDocuments] = useState([]);
  
  useEffect(() => {
    // Listen for AI processing updates
    window.electronAPI.on('ai-progress', (progress) => {
      console.log('Processing progress:', progress);
    });
  }, []);
  
  const processDocument = async () => {
    const result = await window.electronAPI.processDocument('/path/to/document.pdf');
    console.log('Processing result:', result);
  };
  
  return (
    <div>
      <button onClick={processDocument}>Process Document</button>
    </div>
  );
}
```

### 5. Local Database Integration

The desktop app uses a local SQLite database:

#### Prisma Schema (`prisma/schema.local.prisma`)
```prisma
datasource db {
  provider = "sqlite"
  url      = env("LOCAL_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma-local"
}

model Company {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // ... other fields
}
```

#### Database Client Usage
```typescript
import { PrismaClient } from '../src/generated/prisma-local';

const prisma = new PrismaClient();

export async function getCompanies() {
  return await prisma.company.findMany();
}

export async function createCompany(data: any) {
  return await prisma.company.create({ data });
}
```

### 6. AI Processing Pipeline

The desktop app includes a complete AI processing pipeline:

#### Document Ingestion
1. User selects documents via file dialog
2. Documents added to processing queue
3. Queue manager processes documents sequentially

#### Text Extraction
1. PDF documents processed with pdf-parse
2. Image documents processed with OCR
3. Raw text extracted and cleaned

#### Preprocessing
1. Text cleaning and normalization
2. Header/footer removal
3. Date and number standardization

#### AI Extraction
1. Structured prompts sent to LLM
2. Confidence scoring for each field
3. Data validation with Zod schemas

#### Review & Approval
1. Low-confidence extractions routed for review
2. Interactive correction UI
3. Final approval and storage

## Building the Application

### Prerequisites
- Node.js 18+
- npm or yarn
- Python 3.x (for native module compilation)
- Platform-specific build tools

### Build Process

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npm run db:local:generate
   ```

3. **Build Next.js Application**
   ```bash
   npm run build
   ```

4. **Build Electron Application**
   ```bash
   # Build for current platform
   npm run electron:build
   
   # Build for specific platforms
   npm run electron:builder:mac    # macOS
   npm run electron:builder:win    # Windows
   npm run electron:builder:linux  # Linux
   ```

### Automated Build Script
Use the provided build script for a streamlined process:
```bash
node scripts/build-desktop.js [platform]
```

## Development Workflow

### Running in Development Mode
```bash
# Run the desktop app in development mode
npm run electron:dev
```

This command will:
1. Start the Next.js development server
2. Launch the Electron app
3. Enable hot reloading for both frontend and backend

### Automated Development Script
Use the provided development script:
```bash
node scripts/dev-desktop.js
```

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
    "electron:builder:win": "electron-builder --win",
    "electron:builder:linux": "electron-builder --linux",
    "db:local:generate": "prisma generate --schema=prisma/schema.local.prisma",
    "db:local:push": "prisma db push --schema=prisma/schema.local.prisma"
  }
}
```

### Electron Builder Configuration
The `electron-builder.json` file configures the build process:
- App ID and product name
- Build output directories
- Platform-specific targets
- Icons and entitlements

## Security Considerations

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

## Testing

### Unit Testing
```bash
npm run test
npm run test:watch
```

### Integration Testing
- Test database operations
- Test AI processing pipeline
- Test IPC communication

### End-to-End Testing
- Test complete document processing workflow
- Test UI interactions
- Test offline functionality

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

## Best Practices

### Code Organization
- Separate desktop-specific code from web code
- Use consistent naming conventions
- Modularize AI processing components
- Implement proper error handling

### Performance Optimization
- Use efficient database queries
- Implement caching where appropriate
- Optimize AI processing pipeline
- Minimize memory usage

### User Experience
- Provide clear feedback during processing
- Implement proper loading states
- Handle errors gracefully
- Support keyboard shortcuts

## Future Enhancements

### Planned Features
- Cloud synchronization
- Advanced analytics dashboard
- Multi-user support
- Mobile companion app

### Scalability Improvements
- Distributed processing
- Enhanced caching
- Improved database performance
- Better resource management

## Support and Maintenance

### Documentation
- Keep this guide updated
- Maintain API documentation
- Update user manuals

### Community
- Monitor GitHub issues
- Engage with user community
- Provide regular updates

### Updates
- Regular security updates
- Feature enhancements
- Performance improvements
- Bug fixes