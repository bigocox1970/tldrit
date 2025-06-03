import { createClient } from '@supabase/supabase-js';
import { Summary } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  console.log('[supabase] getCurrentUser called');
  
  // First check the session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log('[supabase] session check:', { sessionData, sessionError });
  
  if (sessionError || !sessionData?.session) {
    console.log('[supabase] no valid session');
    return { user: null, error: sessionError };
  }

  const { data, error } = await supabase.auth.getUser();
  console.log('[supabase] supabase.auth.getUser result:', { data, error });
  if (error || !data?.user) {
    console.log('[supabase] getCurrentUser: no user', { error });
    return { user: null, error };
  }

  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  console.log('[supabase] profile fetch result:', { profile, profileError });

  const result = {
    user: {
      id: data.user.id,
      email: data.user.email,
      isPremium: profile?.is_premium || false,
      interests: profile?.interests || [],
      eli5Age: profile?.eli5_age ?? 5,
      plan: profile?.plan || 'free',
    },
    error: profileError,
  };
  console.log('[supabase] getCurrentUser returning:', result);
  return result;
}

export async function saveUserInterests(userId: string, interests: string[]) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', userId);
  
  return { data, error };
}

export async function getSummaries(userId: string) {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
}

export async function saveSummary(summary: Omit<Summary, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('summaries')
    .insert({
      user_id: summary.userId,
      title: summary.title,
      original_content: summary.originalContent,
      summary: summary.summary,
      is_eli5: summary.isEli5,
      summary_level: summary.summaryLevel,
      audio_url: summary.audioUrl,
    })
    .select();
  
  return { data, error };
}

export async function updateSummary(id: string, summary: Partial<Omit<Summary, 'id' | 'createdAt'>>) {
  const { data, error } = await supabase
    .from('summaries')
    .update({
      title: summary.title,
      original_content: summary.originalContent,
      summary: summary.summary,
      is_eli5: summary.isEli5,
      summary_level: summary.summaryLevel,
      audio_url: summary.audioUrl,
      in_playlist: summary.inPlaylist,
    })
    .eq('id', id)
    .select();
  
  return { data, error };
}

// Update summary playlist status
export async function updateSummaryPlaylist(summaryId: string, inPlaylist: boolean) {
  const { data, error } = await supabase
    .from('summaries')
    .update({ in_playlist: inPlaylist })
    .eq('id', summaryId)
    .select();
  
  return { data, error };
}

export async function getNewsItems(userId: string) {
  // First get user interests
  const { data: profile } = await supabase
    .from('profiles')
    .select('interests')
    .eq('id', userId)
    .single();
  
  const interests = profile?.interests || [];
  
  // Then get news based on interests
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .in('category', interests.length > 0 ? interests : ['general'])
    .order('published_at', { ascending: false })
    .limit(20);
  
  return { data, error };
}

export async function getAvailableInterests() {
  const { data, error } = await supabase
    .from('interests')
    .select('*');
  
  return { data, error };
}

// --- USER NEWS META (per-user bookmarks/playlist) ---
export async function getUserNewsMeta(userId: string) {
  const { data, error } = await supabase
    .from('user_news_meta')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
}

export async function upsertUserNewsMeta(userId: string, newsId: string, meta: { bookmarked?: boolean; in_playlist?: boolean }) {
  const { data, error } = await supabase
    .from('user_news_meta')
    .upsert({ user_id: userId, news_id: newsId, ...meta }, { onConflict: 'user_id,news_id' });
  return { data, error };
}

// Get bookmarked news items for a user
export async function getBookmarkedNewsItems(userId: string) {
  const { data, error } = await supabase
    .from('user_news_meta')
    .select(`
      news_id,
      bookmarked,
      in_playlist,
      news (
        id,
        title,
        source_url,
        url_hash,
        summary,
        tldr,
        audio_url,
        category,
        published_at,
        image_url
      )
    `)
    .eq('user_id', userId)
    .eq('bookmarked', true)
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// --- SHARED NEWS TLDR/AUDIO ---
export async function updateNewsTLDR(newsId: string, summary: string) {
  const { data, error } = await supabase
    .from('news')
    .update({ summary })
    .eq('id', newsId);
  return { data, error };
}

export async function updateNewsAudio(newsId: string, audioUrl: string) {
  const { data, error } = await supabase
    .from('news')
    .update({ audio_url: audioUrl })
    .eq('id', newsId);
  return { data, error };
}

// Fetch a single news item by id (with tldr and audio_url)
export async function getNewsItemById(newsId: string) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', newsId)
    .single();
  return { data, error };
}

// Fetch a news item by source_url
export async function getNewsBySourceUrl(sourceUrl: string) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('source_url', sourceUrl)
    .single();
  return { data, error };
}

interface NewsItem {
  id: string;
  title: string;
  source_url: string;
  url_hash: string;
  summary?: string;
  audio_url?: string;
  category: string;
  published_at: string;
}

export async function upsertNewsBySourceUrl(news: Omit<NewsItem, 'id'>) {
  const { data, error } = await supabase
    .from('news')
    .upsert([news], { onConflict: 'source_url' })
    .select()
    .single();
  return { data, error };
}

// Fetch a news item by url_hash
export async function getNewsByUrlHash(urlHash: string) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('url_hash', urlHash);
  return { data: Array.isArray(data) && data.length > 0 ? data[0] : null, error };
}

export async function upsertNewsByUrlHash(news: Omit<NewsItem, 'id'>) {
  const { data, error } = await supabase
    .from('news')
    .upsert([news], { onConflict: 'url_hash' })
    .select()
    .single();
  return { data, error };
}

export async function getUserIdByEmail(email: string): Promise<{ id: string | null; error: Error | null }> {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    const user = users.find(u => u.email === email);
    return { id: user?.id || null, error: null };
  } catch (error) {
    return { id: null, error: error as Error };
  }
}

export async function deleteSummaries(summaryIds: string[]) {
  const { data, error } = await supabase
    .from('summaries')
    .delete()
    .in('id', summaryIds)
    .select();
  
  return { data, error };
}

export async function getExampleSummaries(): Promise<{ data: Summary[] | null; error: PostgrestError | null }> {
  try {
    // Get example user ID
    const { data: exampleUserId, error: userError } = await supabase
      .rpc('get_example_user_id');
    
    if (userError) throw userError;
    if (!exampleUserId) {
      return { data: null, error: null };
    }

    // Get summaries from example user
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', exampleUserId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Transform data from Supabase format to our app format
    const summaries: Summary[] = data.map(item => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      originalContent: item.original_content,
      summary: item.summary,
      createdAt: item.created_at,
      audioUrl: item.audio_url,
      isEli5: item.is_eli5,
      summaryLevel: item.summary_level
    }));

    return { data: summaries, error: null };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
}

// Get playlist news items for a user (news items with inPlaylist: true AND bookmarked: true)
export async function getPlaylistNewsItems(userId: string) {
  const { data, error } = await supabase
    .from('user_news_meta')
    .select(`
      news_id,
      bookmarked,
      in_playlist,
      news (
        id,
        title,
        source_url,
        url_hash,
        summary,
        tldr,
        audio_url,
        category,
        published_at,
        image_url
      )
    `)
    .eq('user_id', userId)
    .eq('in_playlist', true)
    .eq('bookmarked', true)
    .order('created_at', { ascending: false });
  
  return { data, error };
}
