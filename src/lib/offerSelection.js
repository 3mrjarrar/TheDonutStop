import { isAvailable } from './availability.js';
import { isOfferEligible } from './offers.js';
import { findOffer } from './offerCatalog.js';

export function offerCapacity(row, cart, type) {
  const variant = row.product_variants;
  const prices = findOffer(type)?.eligiblePrices;
  if (!isOfferEligible(variant.products) || !isAvailable('donuts', row)
    || (prices && !prices.includes(Number(row.price_override ?? variant.price)))) return 0;
  const existing = cart.find(item => item.id === variant.id);
  if (!existing && cart.length >= 50) return 0;
  return Math.max(0, Math.min(99, Number(row.quantity)) - (existing?.quantity || 0));
}

// Validate the entire selection before changing any cart line.
export function addOfferSelection(cart, rows, selection, offer) {
  const entries = Object.entries(selection).filter(([, quantity]) => quantity !== 0);
  const total = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  if (!total || total > offer.remaining || entries.some(([, quantity]) => !Number.isInteger(quantity) || quantity < 0)) return null;
  const additions = [];
  for (const [id, quantity] of entries) {
    const row = rows.find(row => row.product_variants.id === id);
    if (!row || quantity > offerCapacity(row, cart, offer.type)) return null;
    const variant = row.product_variants;
    additions.push({ id, name: variant.products.name, slug: variant.products.slug,
      size: variant.size, category: 'donuts', price: Number(row.price_override ?? variant.price), quantity });
  }
  if (cart.length + additions.filter(addition => !cart.some(item => item.id === addition.id)).length > 50) return null;
  return [...cart.map(item => {
    const addition = additions.find(addition => addition.id === item.id);
    return addition ? { ...item, quantity: item.quantity + addition.quantity } : item;
  }), ...additions.filter(addition => !cart.some(item => item.id === addition.id))];
}
