/**
 * AI LIBRARY - CORE AI INTEGRATION
 * 
 * This library handles all AI-related operations for TLDRit, including:
 * - Content summarization using OpenAI/OpenRouter
 * - URL content extraction
 * - File content processing
 * - Audio generation for summaries
 * - TLDR generation for news articles
 * 
 * KEY FUNCTIONS:
 * - summarizeContent(): Main AI summarization with ELI5 support
 * - extractContentFromUrl(): Extracts text from web pages
 * - processFileContent(): Processes uploaded files (PDF, TXT, DOCX)
 * - generateAudio(): Creates audio versions of summaries
 * - summarizeUrl(): Creates TLDR summaries from URLs
 * 
 * API ROUTING:
 * - OpenAI: Used for basic summarization (free users, short content)
 * - OpenRouter: Used for premium users with longer content
 * - Content extraction: Routes through Vite proxy to backend functions
 */

import axios from 'axios';
// import { SummaryRequest } from '../types';
import { supabase } from './supabase';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface SummarizeOptions {
  isPremium: boolean;
  isEli5: boolean;
  summaryLevel: number;
  eli5Level?: number;
  isNewsArticle?: boolean;
}

interface TLDROptions {
  summaryLevel?: number;
  isEli5?: boolean;
  eli5Level?: number;
}

function getEliPrompt(age: number) {
  if (age <= 5) {
    return 'Explain in very simple terms, as if to a 5-year-old.';
  } else if (age <= 10) {
    return 'Explain in moderately simple terms, as if to a 10-year-old.';
  } else {
    return 'Explain in clear, but more advanced terms, as if to a 15-year-old.';
  }
}

export async function summarizeContent(content: string, options: SummarizeOptions) {
  const { isPremium, isEli5, summaryLevel, eli5Level, isNewsArticle } = options;
  
  // Determine which API to use based on content length and user's subscription
  const useOpenRouter = isPremium && content.length > 1000;
  const apiUrl = useOpenRouter ? OPENROUTER_API_URL : OPENAI_API_URL;
  
  // Select model based on content complexity and user's subscription
  const model = useOpenRouter 
    ? 'anthropic/claude-3-opus'
    : 'gpt-3.5-turbo';
  
  // Adjust summary length based on slider level (1-5)
  const summaryLength = getSummaryLengthFromLevel(summaryLevel);
  
  // Create enhanced system message for news articles
  const markdownInstructions = `
- Use markdown for ALL structure.
- For every list of facts, key points, or steps, use markdown bullet points (lines starting with '- ').
- Add exactly one blank line between each paragraph, heading, and bullet point for readability.
- Never add more than one blank line in a row.
- Never use plain lines for lists—always use markdown list syntax.
- If you list more than one fact, always use markdown bullet points.
- Use markdown headings (##, ###) for sections.
- Use numbered lists (1., 2., etc.) where appropriate.
- Use short paragraphs for explanations.
- Do NOT repeat the title or headline.
- Do NOT include any heading like 'TLDR Summary' or similar in your output.
- Make the summary easy to scan and visually appealing.`;

  const newsSpecificInstructions = isNewsArticle 
    ? `EXAMPLE MARKDOWN OUTPUT (copy this structure):

## Key Points from the Article

- Salesforce acquired Informatica for $8 billion.

- The acquisition aims to bolster Salesforce's capabilities in enterprise data management and artificial intelligence (AI).

- Informatica's expertise in data integration and data governance will enhance Salesforce's offerings.

## Implications and Insights

- Salesforce's acquisition of Informatica signifies a strategic move to strengthen its position in the competitive landscape of enterprise data and AI.

- This acquisition highlights the increasing focus on leveraging data effectively to enhance customer relationships and drive business growth.

---

You are creating a TLDR summary for a news article.

${markdownInstructions}`
    : `You are an expert at creating concise, accurate summaries while preserving key information. Focus on main points and maintain the original tone.\n${markdownInstructions}`;
  
  // Create system message
  const explicitEliPrompt = isEli5 ? `${getEliPrompt(eli5Level || 5)} The higher the age, the more advanced and detailed the explanation should be.` : '';
  const systemMessage = isEli5
    ? `You are an expert at explaining complex topics. ${explicitEliPrompt} Keep explanations clear, engaging, and use simple analogies when helpful. ${newsSpecificInstructions}`
    : newsSpecificInstructions;
  
  // Create enhanced user message for news articles
  const newsPrompt = isNewsArticle 
    ? `Create a TLDR summary of the following news article content.\n\n- Do NOT include or repeat the title/headline.\n- Do NOT include any heading like 'TLDR Summary' or similar.\n- Focus on the main facts, events, and key details from the article body.\n- Provide context and insights in about ${summaryLength} words.\n- Use markdown formatting for structure: headings, subheadings, bullet points, numbered lists, and short paragraphs.\n- After each heading, list, and paragraph, add a blank line for clear separation and maximum readability.\n- Make the summary visually appealing and easy to scan.`
    : `Summarize the following in about ${summaryLength} words:\n\n- Use markdown formatting for structure: headings, subheadings, bullet points, numbered lists, and short paragraphs.\n- After each heading, list, and paragraph, add a blank line for clear separation and maximum readability.\n- Make the summary visually appealing and easy to scan.`;
  
  // Create user message
  const userMessage = isEli5
    ? `${getEliPrompt(eli5Level || 5)} The higher the age, the more advanced and detailed the explanation should be. ${newsPrompt}\n\n${content}`
    : `${newsPrompt}\n\n${content}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useOpenRouter) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`;
      headers['HTTP-Referer'] = window.location.origin;
    } else {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`;
    }

    const response = await axios.post(apiUrl, {
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: summaryLength * 4, // Approximate tokens needed
    }, { headers });

    const summary = useOpenRouter
      ? response.data.choices[0].message.content
      : response.data.choices[0].message.content;

    return { summary };
  } catch (error) {
    console.error('Error summarizing content:', error);
    throw new Error('Failed to generate summary');
  }
}

export async function generateAudio(text: string, isPremium: boolean) {
  // Get the current user's session and access token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('User must be authenticated to generate audio');
  }

  try {
    const response = await axios.post('/api/text-to-speech', {
      text,
      isPremium,
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw new Error('Failed to generate audio');
  }
}

function getSummaryLengthFromLevel(level: number): number {
  // Map summary level (1-5) to word count
  const wordCounts = {
    1: 50,    // Very Short
    2: 100,   // Short
    3: 200,   // Medium
    4: 350,   // Detailed
    5: 500,   // Comprehensive
  };
  
  return wordCounts[level as keyof typeof wordCounts] || 200;
}

export async function extractContentFromUrl(url: string) {
  try {
    // Get the current user's session and access token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post('/api/extract-url', { url }, { headers });
    return response.data.content;
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    throw new Error('Failed to extract content from URL');
  }
}

export async function processFileContent(file: File) {
  // Get the current user's session and access token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post('/api/process-file', formData, { headers });
    
    return response.data.content;
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error('Failed to process file');
  }
}

// TLDR function for news articles - extracts content from URL and creates a concise summary
export async function summarizeUrl(url: string, isPremium: boolean = false, tldrOptions?: TLDROptions): Promise<string> {
  try {
    // First extract content from the URL
    const content = await extractContentFromUrl(url);
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content could be extracted from the URL');
    }

    // Create a TLDR summary using AI with custom options, specifically for news articles
    const summaryOptions: SummarizeOptions = {
      isPremium,
      isEli5: tldrOptions?.isEli5 || false,
      summaryLevel: tldrOptions?.summaryLevel || 2, // Default to short summary for TLDR
      eli5Level: tldrOptions?.eli5Level,
      isNewsArticle: true // Flag to indicate this is a news article
    };

    const result = await summarizeContent(content, summaryOptions);
    return result.summary;
  } catch (error) {
    console.error('Error creating TLDR summary:', error);
    throw new Error('Failed to create TLDR summary');
  }
}
