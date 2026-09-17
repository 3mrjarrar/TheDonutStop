export const tracksQuantity = category => category === 'donuts';

export function isAvailable(category, inventory) {
  return inventory.carried !== false && !inventory.manual_unavailable
    && (!tracksQuantity(category) || inventory.quantity > 0);
}
