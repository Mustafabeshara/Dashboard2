# Bilingual AI Extraction Guide

## Overview

The Medical Distribution Dashboard now supports **fully bilingual** tender document extraction, processing both **Arabic (العربية)** and **English** documents seamlessly. This is specifically designed for Kuwait Ministry of Health (MOH) documents and other Middle Eastern government tenders.

## Language Support

### Supported Languages

- **Arabic (ar)** - Full RTL (right-to-left) support with diacritics
- **English (en)** - Standard LTR (left-to-right)
- **Bilingual (ar-en)** - Mixed Arabic/English documents (most common for Kuwait govt)

### Automatic Language Detection

The AI automatically detects document language and sets the `language` field:

```json
{
  "language": "ar-en" // Options: "ar", "en", or "ar-en"
}
```

## Bilingual Features

### 1. Reference Number Extraction (رقم المرجع)

Recognizes keywords in **both languages**:

**Arabic Keywords:**

- ملف رقم
- رقم الملف
- إستدراج عروض لملف رقم
- مناقصة رقم
- رقم المناقصة
- م.ع.ر

**English Keywords:**

- File No
- File No.
- Tender No
- Tender No.
- RFQ
- Reference No
- Ref:
- Ref. No.

**Examples:**

```
"إستدراج عروض لملف رقم: 5SSN11" → "5SSN11"
"File No: MOH-2025-123" → "MOH-2025-123"
"م.ع.ر رقم 1234/2025" → "1234/2025"
```

### 2. Title Extraction (العنوان)

Preserves original language(s):

**Arabic Only:**

```json
{ "title": "شراء لوازم طبية مستهلكات" }
```

**English Only:**

```json
{ "title": "Purchase of Medical Disposables" }
```

**Bilingual:**

```json
{ "title": "شراء أجهزة طبية / Supply of Medical Equipment" }
```

### 3. Organization Names (الجهة المصدرة)

Supports bilingual organization names:

**Arabic Terms:**

- وزارة الصحة
- إدارة المستودعات الطبية
- إدارة العقود
- إدارة المشتريات

**English Terms:**

- Ministry of Health
- MOH
- MEDICAL STORE ADMINISTRATION
- Contracts Department

**Example Output:**

```json
{
  "organization": "وزارة الصحة - إدارة المستودعات الطبية / Ministry of Health - Medical Store Administration"
}
```

### 4. Date Handling (التواريخ)

Processes dates in multiple formats:

**Arabic Keywords:**

- تاريخ الإغلاق
- آخر موعد
- ينتهي في
- قبل

**English Keywords:**

- CLOSING DATE
- DEADLINE
- BEFORE
- LAST DATE
- DUE DATE

**Supported Formats:**

```
26/11/2025 → 2025-11-26
26-11-2025 → 2025-11-26
2025/11/26 → 2025-11-26
November 26, 2025 → 2025-11-26
٢٦/١١/٢٠٢٥ (Arabic numerals) → 2025-11-26
```

### 5. Items Table (جدول الأصناف)

Extracts bilingual item descriptions:

**Table Headers (Arabic):**

- الرقم (Number)
- الصنف (Item)
- الوصف (Description)
- الكمية (Quantity)
- الوحدة (Unit)
- المواصفات (Specifications)

**Table Headers (English):**

- SL No
- ITEM
- DESCRIPTION
- QUANTITY / QTY
- UNIT
- SPECIFICATIONS

**Example Bilingual Items:**

```json
{
  "items": [
    {
      "itemDescription": "قفازات جراحية معقمة مقاس 7.5 / Surgical Gloves Sterile Size 7.5",
      "quantity": 100,
      "unit": "صندوق/Box",
      "specifications": "Latex-free, powder-free"
    },
    {
      "itemDescription": "حقن انسولين 1 مل / Insulin Syringes 1ml",
      "quantity": 5000,
      "unit": "قطعة/PCS",
      "specifications": "29G x 12.7mm"
    }
  ]
}
```

### 6. Quantity Parsing (الكمية)

Handles numeric formats in both scripts:

**Arabic Numerals:**

```
٦٠٠ → 600
١٬٠٠٠ → 1000
٢-٣ → 3 (uses higher number)
```

**Western Numerals:**

```
600 → 600
1,000 → 1000
2-3 units → 3
```

**Text Numbers:**

```
"ستمائة فقط" or "Six Hundred Only" → 600
```

### 7. Units (الوحدة)

Preserves original language units (no translation):

**Arabic Units:**

- قطعة (piece)
- صندوق (box)
- علبة (container)
- وحدة (unit)
- عبوة (package)
- مجموعة (set)
- كرتون (carton)
- لفة (roll)

**English Units:**

- PCS
- pieces
- boxes
- units
- sets
- kits
- cartons
- packs
- rolls

### 8. Notes & Instructions (ملاحظات)

Extracts bilingual notes:

**Arabic Terms:**

- ملاحظات
- تعليمات
- شروط خاصة
- العينات المطلوبة
- الشهادات
- التسليم
- الوثائق المطلوبة

**English Terms:**

- Notes
- Instructions
- Special Conditions
- Required Samples
- Certificates
- Delivery Terms
- Required Documents

**Example:**

```json
{
  "notes": "يجب تقديم عينات مع العرض / Samples must be submitted with quotation. شهادة CE مطلوبة / CE Certificate Required."
}
```

## Technical Implementation

### Enhanced OCR Capabilities

The system now handles:

- ✅ Bidirectional text (RTL/LTR)
- ✅ Arabic diacritics (تشكيل): َ ً ُ ٌ ِ ٍ ّ ْ
- ✅ Arabic ligatures: لا، ال
- ✅ Mixed character sets
- ✅ Arabic numerals (٠-٩) and Western (0-9)
- ✅ Multi-column bilingual layouts
- ✅ Faint or low-quality scans
- ✅ Government seals and watermarks

### Typical Kuwait Document Layout

```
┌────────────────────────────────────────────┐
│  [Government Seal/Logo]                    │
│                                            │
│  وزارة الصحة    │    Ministry of Health   │
│  إدارة المستودعات الطبية                  │
│  Medical Store Administration              │
│                                            │
│  ملف رقم: 5SSN11  │  File No: 5SSN11      │
│                                            │
│  ┌──────────────┬──────────────┐          │
│  │ النصوص العربية│ English Text │          │
│  │  (RTL) →     │  ← (LTR)     │          │
│  └──────────────┴──────────────┘          │
└────────────────────────────────────────────┘
```

## Schema Updates

### Validation Schema Changes

```typescript
// Increased limits for bilingual content
title: max(500) // was 200
organization: max(300) // was 100
notes: max(2000) // was 1000
itemDescription: max(1000) // no previous limit
unit: max(50) // was 20
language: enum(['ar', 'en', 'ar-en']) // NEW field
```

### Database Storage

All bilingual text is stored as-is in the database. No automatic translation occurs. This preserves:

- Original terminology
- Technical/medical terms
- Brand names and catalog numbers
- Legal phrasing

## Confidence Scoring

The AI provides confidence scores based on:

- ✅ Text clarity in **both languages**
- ✅ Expected keywords found in **either language**
- ✅ **Consistency** between Arabic and English versions
- ✅ OCR accuracy for both scripts

**Example Confidence Object:**

```json
{
  "confidence": {
    "overall": 0.92,
    "reference": 0.95,
    "title": 0.9,
    "organization": 0.88,
    "closingDate": 0.93,
    "items": 0.91
  }
}
```

Lower confidence indicates:

- ❌ Blurry or obscured text
- ❌ Missing expected patterns
- ❌ Inconsistencies between Arabic/English
- ❌ Heavy OCR errors

## Usage Example

### API Request

```typescript
const response = await fetch('/api/tenders/extract', {
  method: 'POST',
  body: formData, // contains bilingual PDF
});

const result = await response.json();
```

### API Response (Bilingual Document)

```json
{
  "success": true,
  "data": {
    "reference": "5SSN11",
    "title": "توريد مستلزمات طبية مستهلكات / Supply of Medical Consumables",
    "organization": "وزارة الصحة - إدارة المستودعات / MOH - Medical Store",
    "closingDate": "2025-11-26",
    "language": "ar-en",
    "items": [
      {
        "itemDescription": "قفازات جراحية لاتكس / Surgical Gloves Latex",
        "quantity": 1000,
        "unit": "صندوق/Box",
        "specifications": "Size 7.5, Sterile, Powder-free"
      }
    ],
    "notes": "يجب تقديم عينات / Samples required. شهادة CE / CE Certificate",
    "confidence": {
      "overall": 0.94,
      "reference": 0.98,
      "title": 0.92,
      "organization": 0.9,
      "closingDate": 0.95,
      "items": 0.93
    }
  }
}
```

## Testing Bilingual Extraction

### Test with Arabic Document

```bash
# Upload Arabic-only tender
curl -X POST http://localhost:3000/api/tenders/extract \
  -F "file=@tender_arabic.pdf"
```

### Test with Bilingual Document

```bash
# Upload bilingual Kuwait MOH tender
curl -X POST http://localhost:3000/api/tenders/extract \
  -F "file=@moh_bilingual_tender.pdf"
```

### Expected Behavior

1. ✅ Reference number extracted correctly regardless of language
2. ✅ All table rows extracted as individual items
3. ✅ Arabic and English descriptions preserved
4. ✅ Units kept in original language (not translated)
5. ✅ Dates converted to YYYY-MM-DD format
6. ✅ Language field set to "ar", "en", or "ar-en"
7. ✅ Confidence scores reflect bilingual processing quality

## Best Practices

### For Document Upload

1. **Scan Quality**: Ensure minimum 300 DPI for Arabic text
2. **Orientation**: Keep Arabic text right-aligned
3. **File Format**: PDF preferred (supports text layer)
4. **File Size**: Under 10MB for optimal processing

### For Review

1. **Verify Reference**: Check against both Arabic and English versions
2. **Check Items**: Ensure ALL table rows extracted (no missing items)
3. **Review Units**: Confirm units match source document
4. **Validate Dates**: Cross-check with deadline shown in document

### For Editing

1. **Preserve Format**: Keep bilingual format "عربي / English"
2. **Technical Terms**: Don't translate medical/brand names
3. **Units**: Keep original units (don't convert)
4. **Notes**: Maintain bilingual instructions

## Troubleshooting

### Issue: Reference Number Not Found

**Solution:** Check document for alternative keywords:

- Look for "م.ع.ر" (abbreviation)
- Check document header/footer
- May be embedded in barcode or QR code

### Issue: Mixed Language in Single Field

**This is expected** for bilingual documents. The system preserves both:

```
"قفازات / Gloves" ✅ Correct
NOT: "Gloves" ❌ (loses Arabic)
```

### Issue: Arabic Text Garbled

**Causes:**

- Missing UTF-8 encoding
- Font embedding issues in PDF
- Scanned image without text layer

**Solution:**

- Re-scan document at higher quality
- Use OCR preprocessing
- Check PDF has embedded fonts

### Issue: Confidence Score Too Low

**Check:**

1. Document scan quality (blurry?)
2. Expected keywords present?
3. Table structure clear?
4. Consistency between languages?

## Future Enhancements

Planned improvements:

- [ ] Support for Persian/Farsi documents
- [ ] French/English bilingual support
- [ ] Automatic translation API integration
- [ ] Enhanced table cell detection
- [ ] Arabic handwriting recognition
- [ ] Multi-page table continuation

## Related Files

- `/src/lib/ai/config.ts` - Extraction prompts
- `/src/lib/ai/tender-validation.ts` - Validation schemas
- `/src/lib/ai/tender-extraction.ts` - Extraction logic
- `/src/lib/document-processor.ts` - OCR processing

---

**Last Updated:** December 3, 2025  
**Version:** 1.0.0  
**Language Support:** Arabic (العربية) + English
