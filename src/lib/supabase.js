import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Keep prerendering and local previews usable before a project is configured.
export const supabase = url && key ? createClient(url, key) : null;

export async function getBranches() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('branches')
    .select('id, code, name_ar, name_en, delivery_enabled, delivery_fee').eq('active', true).order('sort_order');
  if (error) throw error;
  return data;
}

export async function getBranchMenu(branchId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('branch_inventory').select(`
    quantity, manual_unavailable, price_override,
    product_variants!inner(id, size, price, products!inner(id, name, category, description_ar, description_en, image_path, sort_order))
  `).eq('branch_id', branchId).eq('carried', true);
  if (error) throw error;
  return data;
}
