export const orderItems = cart => cart.map(item => ({ variant_id: item.id, quantity: item.quantity })).sort((a,b) => a.variant_id.localeCompare(b.variant_id));
export function offerPrompt(cart, isTuesday) {
  const count = cart.filter(item => item.category === 'donuts').reduce((sum,item) => sum + item.quantity, 0);
  if (isTuesday && count % 12 >= 7) return { type: 'tuesday', remaining: 12 - count % 12, count };
  if (count % 6 === 5) return { type: 'daily', remaining: 1, count };
  return null;
}
