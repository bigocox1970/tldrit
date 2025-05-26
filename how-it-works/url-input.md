# URL Input Processing - How It Works

## Overview
The URL input section allows users to provide a web page URL, and TLDRit will automatically extract the content from that page and summarize it. This is perfect for summarizing articles, blog posts, and web content.

## User Flow
1. **Input**: User enters a URL in the input field
2. **Validation**: System validates URL format
3. **Content Extraction**: System fetches and extracts text from the webpage
4. **Processing**: Extracted content is sent to AI for summarization
5. **Output**: Summary is generated and displayed

## Technical Implementation

### Frontend Components
- **SummarizeForm.tsx**: Handles URL input and validation
- **URL validation**: Checks for valid URL format
- **State management**: Uses `useSummaryStore` for processing

### Processing Flow
```
User Input (URL)
    ↓
SummarizeForm validation
    ↓
summaryStore.createSummary()
    ↓
extractContentFromUrl() call
    ↓
Vite proxy routes to Supabase function
    ↓
/api/extract-url → Supabase extract-url function
    ↓
Function fetches webpage content
    ↓
Content extraction and cleaning
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
- **Vite Proxy**: Routes `/api/extract-url` to Supabase function
- **Supabase Function**: `supabase/functions/extract-url/index.ts`
- **Content Extraction**: Uses web scraping to extract text content

#### Production Environment
- **Netlify Function**: `netlify/functions/extract-url.js`
- **Same logic**: Consistent behavior across environments

### Key Features
- **Automatic content detection**: Extracts main article content
- **Content cleaning**: Removes ads, navigation, and irrelevant content
- **Error handling**: Handles inaccessible URLs, timeouts, and parsing errors
- **CORS support**: Handles cross-origin requests properly

### Code Locations
- Form component: `src/components/summarize/SummarizeForm.tsx`
- Processing logic: `src/store/summaryStore.ts` (createSummary function)
- AI integration: `src/lib/ai.ts` (extractContentFromUrl function)
- Supabase function: `supabase/functions/extract-url/index.ts`
- Netlify function: `netlify/functions/extract-url.js`

### Error Handling
- **Invalid URL format**: Frontend validation
- **Inaccessible URLs**: Network error handling
- **Content extraction failures**: Fallback mechanisms
- **Rate limiting**: Prevents abuse
- **Timeout handling**: For slow-loading pages

### Supported Content Types
- News articles
- Blog posts
- Documentation pages
- Wikipedia articles
- Most text-based web content

### Limitations
- **JavaScript-heavy sites**: May not extract dynamic content
- **Paywalled content**: Cannot access subscription-required content
- **Private pages**: Cannot access login-required content
- **Rate limits**: May be throttled by target websites

## Benefits
- **Convenience**: No need to copy/paste content manually
- **Accuracy**: Gets the most up-to-date content from the source
- **Efficiency**: Processes entire articles with a single URL
- **Automatic cleaning**: Removes irrelevant content automatically
