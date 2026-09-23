import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

let channelId = 0;
export function watchOffers(branchId, refresh, shared = false) {
  if (!supabase) return () => {};
  const channel = supabase.channel(`offers-${++channelId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: shared ? 'shared_offers' : 'branch_offers', ...(!shared && branchId ? { filter: `branch_id=eq.${branchId}` } : {}) }, refresh)
    .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
  window.addEventListener('donut-offers-changed', refresh);
  return () => { supabase.removeChannel(channel); window.removeEventListener('donut-offers-changed', refresh); };
}

export function useOffers(branchId = null, shared = false) {
  const [state, setState] = useState({ rows: [], loading: true, error: false, branchId });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let live = true;
    let running = false;
    let queued = false;
    async function load() {
      if (running) { queued = true; return; }
      running = true;
      do {
        queued = false;
        try {
          if (!supabase) throw new Error('Not configured');
          // Read optional activation metadata without breaking older database schemas.
          let request = shared ? supabase.from('shared_offers').select('*')
            : supabase.from('branch_offers').select('*,shared_offers!inner(*),branches!inner(code,name_ar,name_en,active)').eq('branches.active', true);
          if (!shared && branchId) request = request.eq('branch_id', branchId);
          const { data, error } = await request;
          if (error) throw error;
          if (live && !queued) setState({ rows: data, loading: false, error: false, branchId });
        } catch { if (live) setState({ rows: [], loading: false, error: true, branchId }); }
      } while (live && queued);
      running = false;
    }
    load();
    const unwatch = watchOffers(branchId, load, shared);
    const timer = setInterval(load, 5000);
    window.addEventListener('focus', load);
    return () => { live = false; unwatch(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, [branchId, revision, shared]);
  return { ...(state.branchId === branchId ? state : { rows: [], loading: true, error: false }), refresh };
}
