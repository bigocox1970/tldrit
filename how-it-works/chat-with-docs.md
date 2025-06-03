# Chat with Docs - Implementation Plan

## Overview
Add chat functionality to TLDRit for large documents while keeping core summarization separate. This serves as a testing ground before forking to eli5.app and SEOit.app.

## User Experience Flow

### File Size Detection
```
User uploads document
    ↓
Check file content size
    ↓
If < 5,000 words → Standard TLDRit flow (summarize only)
If > 5,000 words → Large document flow (summarize + chat option)
```

### Large Document Flow
```
"This document is 15,000 words (45 pages). Choose your action:"
    → [Summarize Only] (existing flow)
    → [Summarize + Enable Chat] (new feature)
        ↓
    Document gets chunked and indexed
        ↓
    Summary + Chat interface available
```

## Technical Architecture

### 1. Document Chunking System

#### Chunking Strategy
```typescript
interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;          // Chapter/section title
  content: string;        // Actual text content
  summary: string;        // AI-generated summary
  keywords: string[];     // AI-extracted keywords
  wordCount: number;
  embedding?: number[];   // Vector embedding for semantic search
  createdAt: string;
}
```

#### Chunking Logic
- **Smart splitting**: By headings, paragraphs, logical sections
- **Chunk size**: 1,000-2,000 words per chunk (optimal for LLM context)
- **Overlap**: 100-200 words between chunks to maintain context
- **Metadata extraction**: Title, keywords, summary per chunk

#### Index Generation
```typescript
interface DocumentIndex {
  id: string;
  documentId: string;
  title: string;
  description: string;
  totalChunks: number;
  chunkSummaries: {
    chunkId: string;
    title: string;
    summary: string;
    keywords: string[];
  }[];
  createdAt: string;
}
```

### 2. Database Schema Extensions

#### New Tables
```sql
-- Document chunks
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES summaries(id) NOT NULL,
  chunk_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  word_count INTEGER NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimensions
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document index
CREATE TABLE document_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES summaries(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  chunk_summaries JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  document_id UUID REFERENCES summaries(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_chunks UUID[] DEFAULT '{}', -- Referenced chunks
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Indexes for Performance
```sql
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
```

### 3. Component Architecture

#### File Structure
```
src/
  components/
    chat/
      ChatInterface.tsx          // Main chat UI
      ChatMessage.tsx            // Individual message
      DocumentChunks.tsx         // Chunk visualization
      ChatHistory.tsx            // Conversation list
      ChunkReference.tsx         // Referenced chunks display
    summarize/
      LargeDocumentOptions.tsx   // Choose summarize vs chat
      SummaryResult.tsx          // Enhanced with chat option
  store/
    chatStore.ts                 // Chat state management
  lib/
    documentChunking.ts          // Chunking algorithms
    vectorSearch.ts              // Semantic search
    chatAPI.ts                   // Chat API calls
```

#### Key Components

**LargeDocumentOptions.tsx**
```typescript
interface LargeDocumentOptionsProps {
  wordCount: number;
  onSummarizeOnly: () => void;
  onSummarizeAndChat: () => void;
}
```

**ChatInterface.tsx**
```typescript
interface ChatInterfaceProps {
  documentId: string;
  chunks: DocumentChunk[];
  index: DocumentIndex;
}
```

### 4. RAG Implementation

#### Query Processing Flow
```
User asks question
    ↓
Query → Embedding
    ↓
Vector search against chunk embeddings
    ↓
Retrieve top 3-5 relevant chunks
    ↓
Construct prompt with context
    ↓
LLM generates response
    ↓
Return response + source chunks
```

#### Semantic Search
```typescript
async function searchRelevantChunks(
  query: string,
  documentId: string,
  limit: number = 5
): Promise<DocumentChunk[]> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Vector similarity search
  const { data } = await supabase.rpc('search_chunks', {
    query_embedding: queryEmbedding,
    document_id: documentId,
    similarity_threshold: 0.7,
    match_count: limit
  });
  
  return data;
}
```

#### Context Assembly
```typescript
function assembleContext(chunks: DocumentChunk[], query: string): string {
  return `Based on the following document sections, answer the user's question.

Document sections:
${chunks.map((chunk, i) => `
Section ${i + 1}: ${chunk.title}
${chunk.content}
`).join('\n')}

User question: ${query}

Answer based only on the provided sections. If the answer isn't in the sections, say so.`;
}
```

### 5. Processing Pipeline

#### Document Upload Flow
```typescript
async function processLargeDocument(file: File, summaryId: string) {
  // 1. Extract text content
  const content = await extractTextFromFile(file);
  
  // 2. Check if large enough for chat
  const wordCount = countWords(content);
  if (wordCount < 5000) {
    return { requiresChat: false };
  }
  
  // 3. Smart chunking
  const chunks = await intelligentChunking(content);
  
  // 4. Generate chunk metadata
  for (const chunk of chunks) {
    chunk.summary = await generateChunkSummary(chunk.content);
    chunk.keywords = await extractKeywords(chunk.content);
    chunk.embedding = await generateEmbedding(chunk.content);
  }
  
  // 5. Create index
  const index = await generateDocumentIndex(chunks);
  
  // 6. Save to database
  await saveChunksAndIndex(summaryId, chunks, index);
  
  return { requiresChat: true, chunks, index };
}
```

#### Chunking Algorithm
```typescript
function intelligentChunking(content: string): DocumentChunk[] {
  // 1. Split by headings/sections first
  const sections = splitBySections(content);
  
  // 2. Further split large sections
  const chunks = [];
  for (const section of sections) {
    if (section.wordCount > 2000) {
      chunks.push(...splitByParagraphs(section, 1500));
    } else {
      chunks.push(section);
    }
  }
  
  // 3. Add overlap between chunks
  return addOverlap(chunks, 200);
}
```

### 6. Chat Store Implementation

```typescript
interface ChatState {
  conversations: Record<string, ChatConversation>;
  currentConversation: string | null;
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  chunks: Record<string, DocumentChunk[]>;
  indices: Record<string, DocumentIndex>;
}

interface ChatStore extends ChatState {
  // Actions
  startConversation: (documentId: string) => Promise<string>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  searchChunks: (query: string, documentId: string) => Promise<DocumentChunk[]>;
}
```

### 7. API Endpoints

#### Supabase Functions
```typescript
// supabase/functions/process-large-document/index.ts
// supabase/functions/chat-with-document/index.ts
// supabase/functions/search-chunks/index.ts
```

#### Vector Search Function
```sql
-- SQL function for similarity search
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  document_id uuid,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  summary text,
  keywords text[],
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    dc.id,
    dc.title,
    dc.content,
    dc.summary,
    dc.keywords,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.document_id = search_chunks.document_id
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database schema migration
- [ ] Document chunking service
- [ ] Basic vector embeddings
- [ ] Chunk storage and retrieval

### Phase 2: Chat Interface
- [ ] Chat UI components
- [ ] Message flow
- [ ] Conversation management
- [ ] Basic RAG implementation

### Phase 3: Enhanced Features
- [ ] Chunk visualization
- [ ] Source attribution
- [ ] Chat history
- [ ] Performance optimization

### Phase 4: Polish & Fork Preparation
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile optimization
- [ ] Code organization for forking

## Pricing Integration

### Plan Limits
```typescript
const CHAT_LIMITS = {
  free: {
    conversations: 1,
    messagesPerDay: 10,
    maxDocumentSize: 10000 // words
  },
  pro: {
    conversations: 10,
    messagesPerDay: 100,
    maxDocumentSize: 50000
  },
  premium: {
    conversations: Infinity,
    messagesPerDay: Infinity,
    maxDocumentSize: Infinity
  }
};
```

## Success Metrics

### Technical
- Chunking accuracy (semantic coherence)
- Search relevance (user feedback)
- Response time (<3s)
- Context utilization

### User Experience
- Chat engagement rate
- Document upload → chat conversion
- User satisfaction with answers
- Feature adoption rate

## Future Enhancements (Post-Fork)

### eli5.app Adaptations
- Age-appropriate explanations
- Visual learning aids
- Progressive complexity
- Parent/teacher dashboards

### SEOit.app Adaptations
- Competitor analysis integration
- SEO metric extraction
- Action plan generation
- Strategy chat assistance

---

*This plan serves as the foundation for implementing chat-with-docs in TLDRit, then forking to specialized apps.*
