import { offerCatalog } from './offerCatalog.js';
export const orderItems = cart => cart.map(item => ({ variant_id: item.id, quantity: item.quantity })).sort((a,b) => a.variant_id.localeCompare(b.variant_id));
export const isOfferEligible = item => item.category === 'donuts' && !/(^|[^a-z])mini([^a-z]|$)|ميني/i.test(`${item.slug || ''} ${item.name || ''}`);
export function offerPrompt(cart, isTuesday, enabledOffers = [], rules = offerCatalog) {
  const count = cart.filter(isOfferEligible).reduce((sum,item) => sum + item.quantity, 0);
  const candidates = rules.filter(offer => !offer.displayOnly && enabledOffers.includes(offer.code) && (!offer.tuesdayOnly || isTuesday))
    .map(offer => ({ ...offer, remaining: (offer.buy + offer.free) - count % (offer.buy + offer.free) }))
    .filter(offer => count % (offer.buy + offer.free) >= offer.buy)
    .sort((a,b) => a.remaining - b.remaining || b.free - a.free);
  const best = candidates[0];
  return best ? { type: best.code, remaining: best.remaining, count } : null;
}
