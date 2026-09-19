export const offerCatalog = [
  { code: 'buy6get2', buy: 6, free: 2, image: 'buy6get2', isNew: true },
  { code: 'buy7get3', buy: 7, free: 3, image: 'buy7get3', isNew: true },
  { code: 'buy8get4', buy: 8, free: 4, image: 'buy8get4', isNew: true },
  { code: 'buy6get6', buy: 6, free: 6, image: 'buy6get6', isNew: true },
  { code: 'daily', buy: 5, free: 1, image: 'daily', eligiblePrices: [6, 7], requiresActivation: true },
  { code: 'tuesday', buy: 7, free: 5, image: 'tuesday', tuesdayOnly: true, requiresActivation: true },
  { code: 'morning', image: 'morning', displayOnly: true, requiresActivation: true, includesDrinks: true },
];
export const findOffer = code => offerCatalog.find(offer => offer.code === code);
export function isOfferEnabled(row) {
  const offer = findOffer(row?.code);
  return !!offer && row.enabled === true && (!offer.requiresActivation || row.admin_activated === true);
}
export function visibleOffers(rows, branchCode = null) {
  // The catalog supplies presentation only; it must never create a visible offer.
  const enabledCodes = new Set(rows.filter(row => isOfferEnabled(row)
    && (!branchCode || row.branches?.code === branchCode)
    && (row.code !== 'morning' || !branchCode || ['NAB', 'TERI'].includes(branchCode))
  ).map(row => row.code));
  return [...enabledCodes].map(findOffer).filter(Boolean)
    .sort((a, b) => offerCatalog.indexOf(a) - offerCatalog.indexOf(b));
}
export function offerTitle(code, en = false) {
  const offer = findOffer(code);
  if (!offer) return en ? 'Offer' : 'عرض';
  if (offer.displayOnly) return en ? 'Donut + coffee · ₪12' : 'دونات + قهوة · 12 شيكل';
  return `${offer.tuesdayOnly ? (en ? 'Tuesday: ' : 'الثلاثاء: ') : ''}${en ? `Buy ${offer.buy}, get ${offer.free} free` : `اشتري ${offer.buy} وخذ ${offer.free} مجانًا`}`;
}
export function offerDetails(offer, en = false) {
  const exclusion = en ? ' Mini donuts are excluded from all offers and do not count toward offer quantities.' : ' الميني دونات مستثناة من جميع العروض ولا تُحسب ضمن عدد حبات العرض.';
  return offerBaseDetails(offer, en) + exclusion;
}
function offerBaseDetails(offer, en = false) {
  if (offer.displayOnly) return en ? '7:30–11 AM. In-store promotion; not applied to online orders.' : 'من 7:30 حتى 11 صباحًا. عرض داخل الفرع، لا يُحسب تلقائيًا في الطلبات الإلكترونية.';
  if (offer.eligiblePrices) return en ? 'Choose 6 donuts; one priced at ₪6 or ₪7 is free. Repeats with each complete bundle.' : 'اختر 6 حبات؛ واحدة من أصناف 6 أو 7 شيكل مجانًا. يتكرر مع كل مجموعة مكتملة.';
  return en ? `Choose ${offer.buy + offer.free} donuts at any price; the ${offer.free} lowest-priced are free. Repeats with each complete bundle.${offer.tuesdayOnly ? ' Tuesdays only.' : ''}` : `اختر ${offer.buy + offer.free} ${offer.buy + offer.free <= 10 ? 'حبات' : 'حبة'} من أي سعر؛ ${offer.free} من الحبات الأقل سعرًا مجانًا. يتكرر مع كل مجموعة مكتملة.${offer.tuesdayOnly ? ' كل ثلاثاء فقط.' : ''}`;
}
export function offerAvailability(offer, en = false) {
  return offer.includesDrinks
    ? (en ? 'Available at all branches except Icon Mall.' : 'متوفر في جميع الفروع ما عدا Icon Mall.')
    : (en ? 'Available at all branches.' : 'متوفر في جميع الفروع.');
}
