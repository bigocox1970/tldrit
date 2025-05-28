const multipart = require('parse-multipart-data');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

exports.handler = async function(event, context) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Processing file upload...');
    console.log('Content-Type:', event.headers['content-type']);
    
    // Parse multipart form data
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);
    
    console.log('Parsed parts:', parts?.length || 0);
    
    if (!parts || parts.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    const file = parts[0];
    const filename = file.filename;
    const fileData = file.data;
    
    console.log('Processing file:', filename, 'Size:', fileData?.length || 0);
    
    let content = '';

    // Process based on file type
    if (filename.toLowerCase().endsWith('.pdf')) {
      try {
        console.log('Processing PDF file...');
        const pdfData = await pdf(fileData);
        content = pdfData.text;
        console.log('PDF content extracted, length:', content.length);
      } catch (error) {
        console.error('PDF processing error:', error);
        throw new Error('Failed to process PDF file: ' + error.message);
      }
    } else if (filename.toLowerCase().endsWith('.txt')) {
      console.log('Processing TXT file...');
      content = fileData.toString('utf-8');
      console.log('TXT content extracted, length:', content.length);
    } else if (filename.toLowerCase().endsWith('.docx')) {
      try {
        console.log('Processing DOCX file...');
        const result = await mammoth.extractRawText({ buffer: fileData });
        content = result.value;
        console.log('DOCX content extracted, length:', content.length);
      } catch (error) {
        console.error('DOCX processing error:', error);
        throw new Error('Failed to process DOCX file: ' + error.message);
      }
    } else {
      throw new Error('Unsupported file type. Please upload PDF, TXT, or DOCX files.');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content could be extracted from the file');
    }

    // Clean up the content but preserve some formatting
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
      .trim();

    console.log('Final content length:', content.length);
    console.log('Content preview:', content.substring(0, 100) + '...');

    // Limit content length (adjust based on user's subscription)
    if (content.length > 10000) {
      content = content.substring(0, 10000);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content,
        filename,
      }),
    };

  } catch (error) {
    console.error('Error processing file:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process file',
        details: error.message 
      }),
    };
  }
};
