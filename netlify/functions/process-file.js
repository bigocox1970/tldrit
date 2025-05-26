const multipart = require('parse-multipart-data');
const pdf = require('pdf-parse');

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
    // Parse multipart form data
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);
    
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
    
    let content = '';

    // Process based on file type
    if (filename.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfData = await pdf(fileData);
        content = pdfData.text;
      } catch (error) {
        throw new Error('Failed to process PDF file');
      }
    } else if (filename.toLowerCase().endsWith('.txt')) {
      content = fileData.toString('utf-8');
    } else if (filename.toLowerCase().endsWith('.docx')) {
      // For DOCX files, we'd need a library like mammoth
      // For now, return an error message
      throw new Error('DOCX files are not yet supported. Please convert to PDF or TXT format.');
    } else {
      throw new Error('Unsupported file type. Please upload PDF, TXT, or DOCX files.');
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n+/g, ' ') // Replace newlines with space
      .trim();

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
