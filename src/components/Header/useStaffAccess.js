import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function useStaffAccess() {
  const [userId, setUserId] = useState(null);
  const [verifiedUserId, setVerifiedUserId] = useState(null);
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let live = true;
    setVerifiedUserId(null);
    if (userId) {
      supabase.from('staff_profiles').select('active, role').eq('user_id', userId).maybeSingle()
        .then(({ data, error }) => {
          if (live && !error && data?.active && ['owner', 'manager', 'order_staff'].includes(data.role)) setVerifiedUserId(userId);
        }).catch(() => {});
    }
    return () => { live = false; };
  }, [userId]);
  return !!userId && verifiedUserId === userId;
}
