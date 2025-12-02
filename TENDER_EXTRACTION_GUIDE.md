# Tender Extraction System - Working Implementation

## ✅ Completed Features

### 1. **Single Tender Upload & AI Extraction**
- **Location**: `/tenders/create`
- **Features**:
  - Drag-drop document upload (PDF, PNG, JPG)
  - Automatic AI extraction of tender details
  - Multi-step wizard interface
  - Real-time extraction preview
  - Manual editing of extracted data

### 2. **Bulk Tender Upload**
- **Location**: `/tenders/bulk-upload`
- **API**: `POST /api/tenders/bulk-upload`
- **Features**:
  - Upload ZIP file with multiple documents
  - Batch AI extraction (supports parallel processing)
  - Confidence scoring per tender
  - Results table with success/failure tracking
  - Individual tender review dialog
  - One-click tender creation from extracted data

### 3. **AI-Powered Extraction Pipeline**
- **Location**: `src/lib/ai/tender-extraction.ts`
- **Capabilities**:
  - Text extraction from PDF/images
  - Fallback chain: Groq → Gemini → Google AI → Anthropic
  - Confidence scoring for each field
  - Partial data extraction on failures
  - Support for Arabic + English documents
  - Regex-based fallback parsing
  - Timeout handling (2-minute limit)

### 4. **Tender Analytics**
- **API**: `GET /api/tenders/analytics?includeAI=true`
- **Data**:
  - Summary statistics (total, open, won/lost)
  - Recent activity (new this week, closing soon)
  - Optional AI analysis with Gemini/Claude
  - Market trends and recommendations

### 5. **Health & Performance Monitoring**
- **AI Health Check**: `GET /api/health` includes provider status
- **Performance Metrics**: `GET /api/admin/metrics`
- **Request Timeouts**: 2-minute limit on AI calls
- **Fallback Chain**: Automatic provider switching

## 📋 Database Schema

### Key Tables:
- `Tender`: Core tender data (reference, title, deadline, status)
- `Document`: Uploaded files with metadata
- `DocumentExtraction`: AI extraction results with confidence scores
- `AIUsageLog`: Track AI provider usage and costs

## 🚀 How to Use

### Single Document:
1. Go to `/tenders/create`
2. Upload PDF/image
3. AI extracts automatically
4. Review and adjust data
5. Click "Create Tender"

### Bulk Upload:
1. Go to `/tenders/bulk-upload`
2. Create ZIP file with multiple PDFs
3. Upload ZIP (max 100MB)
4. Wait for extraction
5. Review results table
6. Click "Create" for each tender

## 🔧 Technical Details

### Extraction Flow:
```
Document Upload
    ↓
S3/Local Storage (if configured)
    ↓
Text Extraction (PDF/OCR)
    ↓
Preprocessing (clean, normalize)
    ↓
AI Extraction (Groq/Gemini)
    ↓
Validation (Zod schema)
    ↓
Confidence Scoring
    ↓
Database Storage
```

### Supported Formats:
- **Documents**: PDF, PNG, JPG, JPEG
- **Archives**: ZIP (for bulk upload)
- **Max Sizes**: 10MB individual, 100MB bulk

### Extraction Timeout:
- Single extraction: 2 minutes
- Bulk file: 2 minutes each
- Auto-fallback if timeout

## 📊 Extracted Fields

Each tender extraction includes:
- `reference`: Tender number (e.g., "5SSN11")
- `title`: Tender subject/title
- `organization`: Issuing organization
- `closingDate`: Deadline (YYYY-MM-DD)
- `items`: Array of requested items
  - itemDescription
  - quantity
  - unit
- `notes`: Additional requirements
- `confidence`: Per-field confidence scores (0-1)

## ⚙️ Configuration

### Environment Variables:
```
# AI Providers
GROQ_API_KEY=...
GEMINI_API_KEY=...
GOOGLE_AI_API_KEY=...
ANTHROPIC_API_KEY=...

# Optional S3
S3_BUCKET_NAME=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

### Default Fallback Order:
1. **Groq** (llama-3.1-70b) - Fastest
2. **Gemini** (1.5-flash) - Best vision support
3. **Google AI** (1.5-pro) - Most capable
4. **Anthropic** (Claude) - Last resort

## 🧪 Testing

### Manual Test:
1. Go to `/tenders/bulk-upload`
2. Create test ZIP with sample PDFs
3. Upload and wait for results
4. Verify extracted reference numbers
5. Check confidence scores

### Example File Structure:
```
tenders.zip
├── 5SSN11.pdf
├── MOH-2025-001.pdf
└── supply-tender.png
```

## 📝 API Endpoints

- `GET /api/tenders` - List all tenders
- `POST /api/tenders` - Create tender
- `POST /api/tenders/bulk-upload` - Bulk ZIP upload
- `GET /api/tenders/analytics` - Analytics + AI insights
- `POST /api/documents/[id]/process` - Process single document
- `GET /api/health` - Health check with AI status

## 🎯 Next Steps to Improve

1. **Async Processing**: Move to background jobs (Bull/Bee-Queue)
2. **Webhook Notifications**: Notify when bulk extraction completes
3. **Template Matching**: Use historical tenders to guide extraction
4. **User Verification**: Flag low-confidence extractions for review
5. **Cost Tracking**: Dashboard for AI spending
6. **Batch Validation**: Pre-validate before creating multiple tenders
7. **Excel Export**: Export extraction results as spreadsheet
8. **Scheduled Uploads**: Monitor folder for auto-extraction

## 🐛 Known Limitations

- S3 integration not yet implemented (uses local buffer for now)
- Background processing uses serial queue (not parallel for now)
- No webhook notifications for bulk completion
- Template system not yet implemented
- Cost tracking basic (no detailed breakdown)

## 📚 Reference Files

All reference implementation files are in `/docs-reference/` including:
- Previous LLM provider integration
- Bulk tender upload patterns
- TrPC router examples
- Test cases from real Kuwait MOH tenders
