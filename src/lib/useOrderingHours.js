import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// The database clock is authoritative, including when a customer's device is abroad.
export default function useOrderingHours(branchId) {
  const [status, setStatus] = useState(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      if (!supabase || !branchId) throw new Error('Unavailable');
      const { data, error } = await supabase.rpc('get_branch_ordering_status', { p_branch: branchId });
      if (error || typeof data?.open !== 'boolean') throw error || new Error('Invalid status');
      if (request === sequence.current) setStatus({ branchId, open: data.open, failed: false });
      return data.open;
    } catch {
      if (request === sequence.current) setStatus({ branchId, open: false, failed: true });
      return null;
    }
  }, [branchId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { sequence.current++; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  return { status: status?.branchId === branchId ? status : null, refresh };
}
