const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit' });
export const activeOrder = order => ['new', 'preparing', 'ready'].includes(order.status);
export function orderDay(value) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
// Fetch a generous UTC window, then match the exact local date. This also covers DST transitions.
export function dayWindow(day) {
  const center = Date.parse(`${day}T00:00:00Z`);
  return [new Date(center - 86400000).toISOString(), new Date(center + 2 * 86400000).toISOString()];
}
export function dashboardSummary(orders, today) {
  const daily = orders.filter(order => orderDay(order.created_at) === today);
  const completed = daily.filter(order => order.status === 'completed');
  const products = new Map();
  for (const order of completed) for (const item of order.order_items || []) {
    const name = `${item.name}${item.size === 'standard' ? '' : ` (${item.size})`}`;
    products.set(name, (products.get(name) || 0) + Number(item.quantity));
  }
  return { total: daily.length, completed: completed.length, cancelled: daily.filter(order => order.status === 'cancelled').length,
    revenue: completed.reduce((sum, order) => sum + Math.round(Number(order.total) * 100), 0) / 100,
    top: [...products].sort((a, b) => b[1] - a[1]).slice(0, 3) };
}
export function filterOrders(orders, { date, today, status, fulfillment, search }) {
  const query = search.trim().toLocaleLowerCase();
  const phoneQuery = query.replace(/[\s()+-]/g, '');
  return orders.filter(order => (date ? orderDay(order.created_at) === date : orderDay(order.created_at) === today || activeOrder(order))
    && (status === 'all' || order.status === status)
    && (fulfillment === 'all' || order.fulfillment === fulfillment)
    && (!query || [order.order_number, order.customer_name].some(value => value.toLocaleLowerCase().includes(query))
      || (phoneQuery && order.phone.replace(/[\s()+-]/g, '').includes(phoneQuery))));
}
export const waitingMinutes = (order, now) => Math.max(0, Math.floor((now - Date.parse(order.created_at)) / 60000));
export async function fetchOrderPages(makeQuery) {
  const rows = new Map();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await makeQuery().range(offset, offset + 499);
    if (error) throw error;
    for (const order of data) rows.set(order.id, order);
    if (data.length < 500) return [...rows.values()];
  }
}

// The first successful snapshot must also alert for orders awaiting acceptance.
export function incomingOrders(orders, seen) {
  return orders.filter(order => order.status === 'new' && !seen?.has(order.id));
}
