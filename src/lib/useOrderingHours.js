import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { getOrderingStatus } from './orderingHours';

// The database clock is authoritative, including when a customer's device is abroad.
export default function useOrderingHours(branchId) {
  const [status, setStatus] = useState(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const data = await getOrderingStatus(supabase, branchId, controller.signal);
      if (request === sequence.current) setStatus({ branchId, ...data, failed: false });
      return data.open;
    } catch {
      if (request === sequence.current) setStatus({ branchId, open: false, failed: true });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }, [branchId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { sequence.current++; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [refresh]);
  return { status: status?.branchId === branchId ? status : null, refresh };
}
