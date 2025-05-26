import { createClient } from '@supabase/supabase-js';

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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error };
  }

  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      isPremium: profile?.is_premium || false,
      interests: profile?.interests || [],
      eli5Age: profile?.eli5_age ?? 5,
    },
    error: profileError,
  };
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