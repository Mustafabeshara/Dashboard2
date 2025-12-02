# Testing Tender Extraction Locally

## Prerequisites
- Node 20+
- PostgreSQL running locally OR `.env.local` with valid DATABASE_URL
- Valid API keys for at least one AI provider

## Local Setup

### 1. Environment Variables
Create `.env.local`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_distribution
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# Required: At least one AI provider
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Optional
GOOGLE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### 2. Start Local Server
```bash
npm run dev
# App runs on http://localhost:3000
```

### 3. Initialize Database
```bash
npm run db:push
npm run db:seed
```

## Manual Testing

### Test 1: Single Document Extraction
1. Open http://localhost:3000/tenders/create
2. Drag a PDF or image of a tender document
3. Click "Extract" 
4. Verify extracted fields appear
5. Edit any fields if needed
6. Click "Create Tender"
7. Navigate to http://localhost:3000/tenders to verify creation

### Test 2: Bulk Upload
1. Prepare test ZIP file with 2-3 tender PDFs
2. Open http://localhost:3000/tenders/bulk-upload
3. Upload ZIP file
4. Wait for extraction to complete
5. Review results in the table
6. Click "View Details" on any result
7. Click "Create Tender" for successful extractions

### Test 3: Analytics
1. After creating several tenders via extraction
2. Open http://localhost:3000/tenders/analytics (if available)
3. Or test API: `curl http://localhost:3000/api/tenders/analytics`
4. Should show tender statistics

### Test 4: Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "ai": {
    "groq": "operational" (or "error"),
    "gemini": "operational" (or "error")
  }
}
```

### Test 5: Metrics
```bash
curl http://localhost:3000/api/admin/metrics
```

Should show:
- AI provider status
- Request counts
- Response times
- Memory usage

## Automated Testing

### Jest Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report (70% threshold)
```

## Sample Tender Files

### Create Test ZIP
```bash
mkdir -p /tmp/tender-test
cd /tmp/tender-test

# Create sample PDF (requires imagemagick)
convert -size 300x200 \
  -background white \
  -pointsize 20 \
  -gravity center \
  label:'Reference: MOH-2025-001\nSupplies & Equipment' \
  test1.pdf

# Create another
convert -size 300x200 \
  -background white \
  -pointsize 20 \
  -gravity center \
  label:'Reference: 5SSN11\nMedical Devices' \
  test2.pdf

# Create ZIP
zip tenders.zip test1.pdf test2.pdf

# Upload to http://localhost:3000/tenders/bulk-upload
```

## Debugging

### Check Logs
```bash
# Look for extraction errors
npm run dev 2>&1 | grep -i "extract\|error\|tender"
```

### Database Inspection
```bash
# Open Prisma Studio
npm run db:studio

# Then browse Tender, Document, DocumentExtraction tables
```

### API Testing
```bash
# Test bulk upload API directly
curl -X POST \
  -F "file=@tenders.zip" \
  http://localhost:3000/api/tenders/bulk-upload

# Test single tender creation
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TEST-001",
    "title": "Test Tender",
    "closingDate": "2025-12-31",
    "items": []
  }' \
  http://localhost:3000/api/tenders
```

## Expected Extraction Results

### High Confidence (>0.9)
- Reference number
- Closing date
- Organization name
- Item descriptions

### Medium Confidence (0.6-0.9)
- Quantities
- Unit prices
- Delivery terms

### Low Confidence (<0.6)
- Specific payment terms
- Complex technical requirements
- Conditional clauses

## Performance Benchmarks

### Single Extraction Time
- Groq: ~3-5 seconds
- Gemini: ~5-8 seconds
- Fallback chain: ~15-20 seconds if retrying

### Bulk Processing
- 10 documents: ~1-2 minutes
- 50 documents: ~5-10 minutes
- 100 documents: ~15-30 minutes (depending on file sizes)

## Troubleshooting

### "Extraction Failed"
- Check API key validity
- Look at server logs for provider errors
- Try with different document format

### "Cannot read property 'text' of undefined"
- Document preprocessing failed
- Try re-uploading with cleaner PDF
- Check PDF has readable text (not scanned image)

### "Timeout waiting for AI response"
- AI provider rate limited
- Network issue
- Try again in 30 seconds

### Large Bulk Upload Hangs
- Check max file size (default 100MB)
- Try uploading smaller ZIP first
- Monitor `/api/admin/metrics` for bottlenecks

## Success Criteria ✅

Extraction is working if:
1. ✅ Tender reference extracted correctly
2. ✅ Closing date parsed as valid YYYY-MM-DD
3. ✅ Items array contains at least one item
4. ✅ Confidence scores are between 0 and 1
5. ✅ Bulk upload processes all files in ZIP
6. ✅ Health check shows AI providers operational
7. ✅ Performance metrics show <5s avg response

