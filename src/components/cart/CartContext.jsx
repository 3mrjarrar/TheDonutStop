import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { orderItems } from '../../lib/offers';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [branch, setBranch] = useState(null);
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [locked, setLocked] = useState(false);
  const signature = JSON.stringify([branch?.id, orderItems(cart)]);
  useEffect(() => {
    let active = true;
    let running = false;
    if (!cart.length || !branch) { setResult(null); return; }
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const { data, error } = await supabase.rpc('get_guest_order_quote', { p_branch: branch.id, p_items: orderItems(cart) });
        if (error) throw error;
        if (active) setResult({ signature, data, error: false });
      } catch { if (active) setResult({ signature, data: null, error: true }); }
      finally { running = false; }
    };
    refresh(); const timer = setInterval(refresh,30000); window.addEventListener('focus',refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus',refresh); };
  }, [signature, revision]);
  const current = result?.signature === signature ? result : null;
  return <CartContext.Provider value={{ cart, setCart, branch, setBranch, locked, setLocked,
    quote: current?.data, quoteError: current?.error, refreshQuote: () => setRevision(value => value + 1),
    count: cart.reduce((total, item) => total + item.quantity, 0) }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
