export const offerCatalog = [
  { code: 'buy6get2', buy: 6, free: 2, image: 'buy6get2', isNew: true },
  { code: 'buy7get3', buy: 7, free: 3, image: 'buy7get3', isNew: true },
  { code: 'buy8get4', buy: 8, free: 4, image: 'buy8get4', isNew: true },
  { code: 'buy6get6', buy: 6, free: 6, image: 'buy6get6', isNew: true },
  { code: 'daily', buy: 5, free: 1, image: 'daily', eligiblePrices: [6, 7] },
  { code: 'tuesday', buy: 7, free: 5, image: 'tuesday', tuesdayOnly: true },
  { code: 'morning', image: 'morning', displayOnly: true },
];
export const findOffer = code => offerCatalog.find(offer => offer.code === code);
export const visibleOffers = rows => offerCatalog.filter(offer => rows.some(row => row.code === offer.code && row.enabled === true));
export function offerTitle(code, en = false) {
  const offer = findOffer(code);
  if (!offer) return en ? 'Offer' : 'عرض';
  if (offer.displayOnly) return en ? 'Donut + coffee · ₪12' : 'دونات + قهوة · 12 شيكل';
  return `${offer.tuesdayOnly ? (en ? 'Tuesday: ' : 'الثلاثاء: ') : ''}${en ? `Buy ${offer.buy}, get ${offer.free} free` : `اشتري ${offer.buy} وخذ ${offer.free} مجانًا`}`;
}
export function offerDetails(offer, en = false) {
  if (offer.displayOnly) return en ? '7:30–11 AM. In-store promotion; not applied to online orders.' : 'من 7:30 حتى 11 صباحًا. عرض داخل الفرع، لا يُحسب تلقائيًا في الطلبات الإلكترونية.';
  if (offer.eligiblePrices) return en ? 'Choose 6 donuts; one priced at ₪6 or ₪7 is free. Repeats with each complete bundle.' : 'اختر 6 حبات؛ واحدة من أصناف 6 أو 7 شيكل مجانًا. يتكرر مع كل مجموعة مكتملة.';
  return en ? `Choose ${offer.buy + offer.free} donuts at any price; the ${offer.free} lowest-priced are free. Repeats with each complete bundle.${offer.tuesdayOnly ? ' Tuesdays only.' : ''}` : `اختر ${offer.buy + offer.free} ${offer.buy + offer.free <= 10 ? 'حبات' : 'حبة'} من أي سعر؛ ${offer.free} من الحبات الأقل سعرًا مجانًا. يتكرر مع كل مجموعة مكتملة.${offer.tuesdayOnly ? ' كل ثلاثاء فقط.' : ''}`;
}
