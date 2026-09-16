import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Keep prerendering and local previews usable before a project is configured.
export const supabase = url && key ? createClient(url, key) : null;

export async function getBranches() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('branches')
    .select('id, code, name_ar, name_en').eq('active', true).order('sort_order');
  if (error) throw error;
  return data;
}
