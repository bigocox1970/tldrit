# File Upload Processing - How It Works

## Overview
The file upload section allows users to upload documents (PDF, TXT, DOCX) and have TLDRit extract the content and generate summaries. This is perfect for processing documents, research papers, and other file-based content.

## User Flow
1. **Upload**: User selects and uploads a file (drag & drop or file picker)
2. **Validation**: System checks file type, size, and user permissions
3. **Content Extraction**: System processes the file and extracts text content
4. **Processing**: Extracted content is sent to AI for summarization
5. **Output**: Summary is generated and displayed

## Technical Implementation

### Frontend Components
- **SummarizeForm.tsx**: Handles file upload interface
- **File validation**: Checks file type, size limits, and user permissions
- **State management**: Uses `useSummaryStore` for processing

### Processing Flow
```
User Upload (File)
    ↓
SummarizeForm validation
    ↓
summaryStore.createSummary()
    ↓
processFileContent() call
    ↓
Vite proxy routes to production Netlify function
    ↓
/api/process-file → https://tldrit.netlify.app/.netlify/functions/process-file
    ↓
Netlify function processes file content
    ↓
File type detection and processing:
    - PDF: Extract text using pdf-parse
    - TXT: Direct text reading
    - DOCX: Extract text using mammoth
    ↓
Return extracted text
    ↓
AI summarization via OpenAI/OpenRouter
    ↓
Save to Supabase database
    ↓
Display result to user
```

### Backend Infrastructure

#### Development Environment
- **Vite Proxy**: Routes `/api/process-file` to **production Netlify function**
- **Why production?**: PDF processing libraries aren't compatible with Supabase Edge Runtime
- **Consistent experience**: Same processing in dev and production

#### Production Environment
- **Netlify Function**: `netlify/functions/process-file.js`
- **PDF Processing**: Uses `pdf-parse` library for PDF text extraction
- **DOCX Processing**: Uses `mammoth` library for Word document processing
- **TXT Processing**: Direct text file reading

### File Processing Details

#### Supported File Types
- **PDF**: Portable Document Format files
- **TXT**: Plain text files
- **DOCX**: Microsoft Word documents (newer format)

#### File Size Limits
- **Free Users**: 5MB maximum file size
- **Premium Users**: 20MB maximum file size

#### Processing Libraries
- **PDF**: `pdf-parse` - Extracts text from PDF files
- **DOCX**: `mammoth` - Converts Word documents to text
- **TXT**: Native Node.js file reading

### Code Locations
- Form component: `src/components/summarize/SummarizeForm.tsx`
- Processing logic: `src/store/summaryStore.ts` (createSummary function)
- AI integration: `src/lib/ai.ts` (processFileContent function)
- Netlify function: `netlify/functions/process-file.js`
- Supabase function: `supabase/functions/process-file/index.ts` (fallback for TXT files)

### Architecture Decision: Why Production Function?

The file upload processing uses a unique architecture where **local development calls the production Netlify function**:

#### Problem
- PDF processing libraries like `pdf-parse` and `pdfjs-dist` are not compatible with Supabase Edge Runtime
- Supabase functions run in a Deno environment with limited Node.js compatibility
- This caused boot errors and 503 responses when trying to process PDFs

#### Solution
- **Local Development**: Routes to production Netlify function via Vite proxy
- **Production**: Uses Netlify functions with full Node.js support
- **Fallback**: Supabase function handles TXT files and provides error messages

#### Benefits
- **Reliable PDF processing**: Uses proven libraries in Node.js environment
- **Consistent behavior**: Same processing logic in dev and production
- **No environment differences**: Eliminates "works in production but not locally" issues

### Error Handling
- **File type validation**: Only allows supported file types
- **File size limits**: Enforces limits based on user subscription
- **Processing errors**: Handles corrupted or unreadable files
- **Network errors**: Handles upload and processing failures
- **Authentication**: Ensures user is logged in and authorized

### Security Features
- **User authentication**: Requires valid user session
- **File size limits**: Prevents abuse and resource exhaustion
- **File type validation**: Only processes safe file types
- **Content sanitization**: Cleans extracted content

### Performance Considerations
- **Streaming uploads**: Handles large files efficiently
- **Processing timeouts**: Prevents long-running operations
- **Memory management**: Handles large documents without memory issues
- **Concurrent processing**: Supports multiple simultaneous uploads

## Benefits
- **Document processing**: Handle various document formats automatically
- **Bulk content**: Process entire documents at once
- **Offline content**: Process files that aren't available online
- **Format flexibility**: Support for multiple common document formats

## Limitations
- **File size limits**: Based on subscription tier
- **Supported formats**: Limited to PDF, TXT, and DOCX
- **Processing time**: Large files may take longer to process
- **Text-only**: Cannot process images or multimedia content within documents
