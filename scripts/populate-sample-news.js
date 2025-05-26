const { createClient } = require('@supabase/supabase-js');

// Sample news data for testing
const sampleNews = [
  {
    title: "Revolutionary AI Breakthrough in Natural Language Processing",
    source_url: "https://example.com/ai-breakthrough",
    category: "technology",
    summary: "Researchers have developed a new AI model that can understand and generate human language with unprecedented accuracy. The breakthrough could revolutionize how we interact with computers and automate complex tasks.",
    published_at: new Date().toISOString(),
    image_url: null,
  },
  {
    title: "Global Climate Summit Reaches Historic Agreement",
    source_url: "https://example.com/climate-summit",
    category: "world",
    summary: "World leaders have agreed on ambitious new targets for carbon reduction and renewable energy adoption. The agreement includes binding commitments from major economies to achieve net-zero emissions by 2050.",
    published_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    image_url: null,
  },
  {
    title: "Tech Giants Report Record Quarterly Earnings",
    source_url: "https://example.com/tech-earnings",
    category: "business",
    summary: "Major technology companies have posted exceptional quarterly results, driven by strong demand for cloud services and AI technologies. The results exceed analyst expectations across the board.",
    published_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    image_url: null,
  },
  {
    title: "New Study Reveals Potential for Life on Mars",
    source_url: "https://example.com/mars-life",
    category: "science",
    summary: "Scientists have discovered compelling evidence of past microbial life on Mars through analysis of rock samples. The findings suggest that the Red Planet may have been habitable billions of years ago.",
    published_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    image_url: null,
  },
  {
    title: "Cryptocurrency Market Sees Major Rally",
    source_url: "https://example.com/crypto-rally",
    category: "crypto",
    summary: "Bitcoin and other major cryptocurrencies have surged following institutional adoption announcements. The rally is driven by increased corporate investment and regulatory clarity in key markets.",
    published_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    image_url: null,
  },
  {
    title: "Breakthrough in Alzheimer's Disease Treatment",
    source_url: "https://example.com/alzheimers-treatment",
    category: "health",
    summary: "A new drug has shown promising results in clinical trials for treating Alzheimer's disease. The treatment appears to slow cognitive decline and improve quality of life for patients in early stages.",
    published_at: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    image_url: null,
  },
  {
    title: "Major Film Studio Announces Streaming Strategy",
    source_url: "https://example.com/streaming-strategy",
    category: "entertainment",
    summary: "A leading entertainment company has unveiled its new streaming platform strategy, including exclusive content deals and partnerships with major creators. The move aims to compete with established platforms.",
    published_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    image_url: null,
  },
  {
    title: "Championship Finals Set Record Viewership",
    source_url: "https://example.com/championship-viewership",
    category: "sports",
    summary: "The recent championship finals attracted the largest television audience in the sport's history. The thrilling match went to overtime and featured outstanding performances from both teams.",
    published_at: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
    image_url: null,
  },
];

async function populateNews() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    console.log('Populating sample news data...');
    
    const { data, error } = await supabase
      .from('news')
      .upsert(sampleNews, { onConflict: 'source_url' });

    if (error) {
      console.error('Error inserting news data:', error);
      process.exit(1);
    }

    console.log(`Successfully inserted ${sampleNews.length} news items`);
    console.log('Sample news data populated successfully!');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

populateNews();
