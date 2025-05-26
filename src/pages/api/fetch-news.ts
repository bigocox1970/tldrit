// Proxy API route for fetching news from Supabase Edge Function
export default async function handler(req: any, res: any) {
  const { authorization } = req.headers;
  // Using actual Supabase project ref
  const SUPABASE_PROJECT_REF = 'fyhxilsvczfjamltlpxc';
  const SUPABASE_EDGE_URL = `https://${SUPABASE_PROJECT_REF}.functions.supabase.co/fetch-news`;

  const response = await fetch(SUPABASE_EDGE_URL, {
    method: 'GET',
    headers: {
      'Authorization': authorization || '',
    },
  });
  const data = await response.json();
  res.status(response.status).json(data);
} 