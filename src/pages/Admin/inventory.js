export const drinkTypes = [
  ['mojito', 'موهيتو'], ['frappe', 'فرابيه'], ['smoothies', 'سموذي'],
  ['hot', 'مشروبات ساخنة'], ['cold', 'مشروبات باردة'],
];

export function inventoryGroup(product) {
  const identity = `${product.slug || ''} ${product.name}`;
  if (product.category === 'cold' && /mojito/i.test(identity)) return 'mojito';
  if (product.category === 'blends') return /frapp/i.test(identity) ? 'frappe' : 'smoothies';
  return product.category;
}

export const inventoryPrice = row => Number(row.price_override ?? row.product_variants.price);
export const byInventoryPrice = (a, b) => inventoryPrice(a) - inventoryPrice(b)
  || a.product_variants.products.name.localeCompare(b.product_variants.products.name)
  || a.product_variants.size.localeCompare(b.product_variants.size);

export function inventoryProductImage(product) {
  if (product.image_path) return product.image_path;
  const folder = product.category === 'hot' ? 'hot-drinks' : 'cold-drinks';
  return `/assets/${folder}/${encodeURIComponent(product.name)}.png`;
}
