import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export default function useOrderHold(branchId) {
  const [result, setResult] = useState(null);
  const sequence = useRef(0);
  const controller = useRef(null);
  const setupMissing = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 10000);
    try {
      if (!supabase || !branchId) throw new Error('Unavailable');
      const { data, error } = await supabase.rpc('get_branch_order_hold', { p_branch: branchId }).abortSignal(abort.signal);
      if (error || typeof data?.paused !== 'boolean' || !Number.isInteger(data.version) || typeof data.reason !== 'string') throw error || new Error('Invalid status');
      if (request === sequence.current) { setupMissing.current = false; setResult({ branchId, data, error: false }); }
      return data;
    } catch (problem) {
      if (request === sequence.current) {
        setupMissing.current = ['PGRST202', 'PGRST204', '42883', '42703'].includes(problem?.code);
        setResult({ branchId, data: null, error: setupMissing.current ? 'setup' : 'network' });
      }
      return null;
    } finally { clearTimeout(timer); }
  }, [branchId]);
  useEffect(() => {
    refresh();
    // Missing database setup cannot heal through polling. Manual Retry still checks
    // immediately after applying the migration, without repeated 404s meanwhile.
    const autoRefresh = () => { if (!setupMissing.current) refresh(); };
    const timer = setInterval(autoRefresh, 15000);
    window.addEventListener('focus', autoRefresh);
    return () => { sequence.current++; controller.current?.abort(); clearInterval(timer); window.removeEventListener('focus', autoRefresh); };
  }, [refresh]);
  return { data: result?.branchId === branchId ? result.data : null, error: result?.branchId === branchId && result.error, refresh };
}
