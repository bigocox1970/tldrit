import { createClient } from '@supabase/supabase-js';
import { Summary } from '../types';

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

export async function upsertUserNewsMeta(userId: string, newsId: string, meta: { bookmarked?: boolean; inPlaylist?: boolean }) {
  const { data, error } = await supabase
    .from('user_news_meta')
    .upsert({ user_id: userId, news_id: newsId, ...meta }, { onConflict: 'user_id,news_id' });
  return { data, error };
}

// --- SHARED NEWS TLDR/AUDIO ---
export async function updateNewsTLDR(newsId: string, tldr: string) {
  const { data, error } = await supabase
    .from('news')
    .update({ tldr })
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
