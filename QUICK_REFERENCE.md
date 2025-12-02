# Medical Distribution Dashboard - Quick Reference Card

## 🎯 What This System Does

**Medical device distribution management with AI-powered tender extraction**
- Upload tender documents (PDF, image)
- AI automatically extracts tender details
- Bulk process 100+ tenders at once
- Manage budget approvals and workflows
- Track inventory and deliveries

## ⚡ Quick Start (5 minutes)

```bash
# 1. Clone and setup
git clone <repo>
cd Dashboard2
npm install

# 2. Set environment
cp .env.example .env.local
# Add DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY, etc.

# 3. Start
npm run dev
# Open http://localhost:3000
```

## 🌐 Key URLs When Running

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Dashboard home |
| `http://localhost:3000/tenders/create` | Upload single tender |
| `http://localhost:3000/tenders/bulk-upload` | Bulk ZIP upload |
| `http://localhost:3000/tenders` | View all tenders |
| `http://localhost:3000/budgets` | Budget approvals |
| `http://localhost:3000/api/health` | System health |
| `http://localhost:3000/api/admin/metrics` | Performance stats |

## 🔑 Environment Variables

**Minimum Required:**
```bash
DATABASE_URL=postgresql://localhost/medical_distribution
NEXTAUTH_SECRET=any_random_secret_here
NEXTAUTH_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
```

**Get API Keys From:**
- Groq: https://groq.com/groqcloud
- Gemini: https://makersuite.google.com/app/apikey
- Claude: https://console.anthropic.com

## 📦 Package Structure

```
src/
├── app/          → Pages & API routes
├── components/   → React components
├── lib/          → Utilities & logic
│   └── ai/       → AI extraction pipeline
├── types/        → TypeScript definitions
└── hooks/        → Custom React hooks

prisma/          → Database schema & migrations
tests/            → Jest tests
```

## 🤖 AI Extraction How It Works

```
1. User uploads PDF/image
            ↓
2. Text extraction (PDF or OCR)
            ↓
3. AI processes text (Groq → Gemini → etc.)
            ↓
4. Tender fields extracted:
   - Reference: MOH-2025-001
   - Title: Medical Supplies
   - Closing date: 2025-12-31
   - Items: [drug1, drug2, ...]
            ↓
5. Confidence score: 0.85
            ↓
6. Stored in database
```

## �� API Cheat Sheet

### Get All Tenders
```bash
curl http://localhost:3000/api/tenders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Tender Manually
```bash
curl -X POST http://localhost:3000/api/tenders \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "MOH-2025-001",
    "title": "Medical Supplies",
    "closingDate": "2025-12-31",
    "items": [{
      "description": "Aspirin 500mg",
      "quantity": 1000
    }]
  }'
```

### Upload Bulk Tenders
```bash
curl -X POST http://localhost:3000/api/tenders/bulk-upload \
  -F "file=@tenders.zip"
```

### Check System Health
```bash
curl http://localhost:3000/api/health
# Returns: {"status": "ok", "database": "connected", "ai": {...}}
```

### View Performance Metrics
```bash
curl http://localhost:3000/api/admin/metrics
```

## 🗂️ Database Tables

| Table | Purpose |
|-------|---------|
| `User` | Users & authentication |
| `Tender` | Tender records |
| `Document` | Uploaded files |
| `DocumentExtraction` | AI extraction results |
| `BudgetCategory` | Budget hierarchy |
| `BudgetApproval` | Approval workflow |
| `Inventory` | Inventory tracking |
| `AIUsageLog` | Track API calls |

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 🚀 Deploy to Railway

1. Set environment variables in Railway dashboard
2. Connect GitHub repository
3. Railway auto-deploys on push
4. Verify at: https://your-app.railway.app

See `DEPLOYMENT_CHECKLIST.md` for details.

## 🐛 Troubleshooting

### "DATABASE_URL is not set"
```bash
# Add to .env.local:
DATABASE_URL=postgresql://user:pass@localhost:5432/medical_distribution
```

### "AI extraction is slow"
- Check internet connection
- Verify API key validity
- Try different provider (check health endpoint)

### "Build fails"
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### "Can't upload file"
- Check file size (<10MB for single, <100MB for bulk)
- Verify file format (PDF, PNG, JPG, ZIP)
- Check browser console for errors

## 📁 Important Commands

| Command | Does |
|---------|------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm test` | Run tests |
| `npm run db:push` | Sync database schema |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Load test data |
| `npm run lint` | Check code quality |

## 👥 Test Accounts (After `npm run db:seed`)

| Email | Password | Role |
|-------|----------|------|
| admin@beshara.com | admin123 | ADMIN |
| ceo@beshara.com | admin123 | CEO |
| cfo@beshara.com | admin123 | CFO |
| finance@beshara.com | admin123 | FINANCE_MANAGER |
| manager@beshara.com | admin123 | MANAGER |

## 🎓 Core Concepts

### Tender Extraction Workflow
1. Document upload
2. Text extraction (PDF/OCR)
3. AI processing
4. Field parsing
5. Confidence scoring
6. Database storage
7. Manual review optional

### Budget Approval Levels
- <1K KWD: Auto-approved
- 1K-10K: Manager approval
- 10K-50K: Finance Manager approval
- 50K-100K: CFO approval
- >100K: CEO approval

### Role-Based Access
- `ADMIN`: Full system access
- `CEO`: Executive oversight
- `CFO`: Financial operations
- `FINANCE_MANAGER`: Budget management
- `MANAGER`: Team lead approvals
- `SALES`: Tender management
- `WAREHOUSE`: Inventory operations

## 📚 Full Documentation

- `SYSTEM_STATUS.md` - Complete system overview
- `TENDER_EXTRACTION_GUIDE.md` - Feature details
- `DEPLOYMENT_CHECKLIST.md` - Production deployment
- `TEST_TENDER_EXTRACTION.md` - Testing procedures
- `README.md` - Full documentation

## 🆘 Getting Help

1. Check `SYSTEM_STATUS.md` for known issues
2. Look at test files for usage examples
3. Check API response errors (detailed messages)
4. Review logs: `npm run dev 2>&1 | grep error`
5. Open GitHub issue with error and steps to reproduce

---

**Last Updated**: 2025
**Version**: 1.0.0 (Production Ready)
**Status**: ✅ Working, Tested, Deployed

