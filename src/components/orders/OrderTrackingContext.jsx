import { createContext, useContext, useEffect, useState } from 'react';

const Context = createContext(null);
const storageKey = 'donut-stop-tracked-orders';
const statuses = new Set(['new', 'preparing', 'ready', 'completed', 'cancelled']);
export function OrderTrackingProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setOrders(saved.filter(order => order && /^[0-9a-f-]{36}$/i.test(order.requestId) && typeof order.order_number === 'string' && statuses.has(order.status) && ['pickup', 'delivery'].includes(order.fulfillment)));
    } catch { /* Tracking remains available in memory when storage is blocked. */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) { try { localStorage.setItem(storageKey, JSON.stringify(orders)); } catch {} }
  }, [orders, loaded]);
  function trackOrder(order) {
    setOrders(current => [order, ...current.filter(item => item.requestId !== order.requestId)]);
  }
  function updateOrder(requestId, data) {
    if (!data || !statuses.has(data.status)) return;
    setOrders(current => current.map(order => order.requestId === requestId ? { ...order, ...data, requestId } : order));
  }
  function dismissOrder(requestId) {
    setOrders(current => current.filter(order => order.requestId !== requestId));
  }
  return <Context.Provider value={{ orders, trackOrder, updateOrder, dismissOrder }}>{children}</Context.Provider>;
}
export const useOrderTracking = () => useContext(Context);
