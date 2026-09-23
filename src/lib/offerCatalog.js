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
export function offerDefinition(row) {
  if (!row) return null;
  const definition = row.shared_offers || row;
  const legacy = findOffer(row.code);
  if (definition.buy_quantity == null && !legacy) return null;
  return { ...legacy, ...definition, code: row.code,
    buy: definition.buy_quantity ?? legacy?.buy, free: definition.free_quantity ?? legacy?.free,
    imageUrl: definition.image_url || null };
}
export function isOfferEnabled(row) {
  const offer = offerDefinition(row);
  return !!offer && row.enabled === true && (!offer.requiresActivation || row.admin_activated === true);
}
export function visibleOffers(rows, branchCode = null) {
  // The catalog supplies presentation only; it must never create a visible offer.
  const enabled = rows.filter(row => isOfferEnabled(row)
    && (!branchCode || row.branches?.code === branchCode)
    && (row.code !== 'morning' || !branchCode || ['NAB', 'TERI'].includes(branchCode))
  );
  return [...new Map(enabled.map(row => [row.code, offerDefinition(row)])).values()]
    .sort((a, b) => (offerCatalog.findIndex(o => o.code === a.code) + 1 || 99) - (offerCatalog.findIndex(o => o.code === b.code) + 1 || 99));
}
export function offerTitle(code, en = false) {
  const offer = typeof code === 'object' ? code : findOffer(code);
  if (!offer) return en ? 'Offer' : 'عرض';
  if (offer.displayOnly) return en ? 'Donut + coffee · ₪12' : 'دونات + قهوة · 12 شيكل';
  return `${offer.tuesdayOnly && !offer.weekdays ? (en ? 'Tuesday: ' : 'الثلاثاء: ') : ''}${en ? `Buy ${offer.buy}, get ${offer.free} free` : `اشتري ${offer.buy} وخذ ${offer.free} مجانًا`}`;
}
export function offerDetails(offer, en = false) {
  const exclusion = en ? ' Mini donuts are excluded from all offers and do not count toward offer quantities.' : ' الميني دونات مستثناة من جميع العروض ولا تُحسب ضمن عدد حبات العرض.';
  return offerBaseDetails(offer, en) + exclusion;
}
function offerBaseDetails(offer, en = false) {
  if (offer.displayOnly) return en ? 'In-store promotion; not applied to online orders.' : 'عرض داخل الفرع، لا يُحسب تلقائيًا في الطلبات الإلكترونية.';
  if (offer.eligiblePrices) return en ? 'Choose 6 donuts; one priced at ₪6 or ₪7 is free. Repeats with each complete bundle.' : 'اختر 6 حبات؛ واحدة من أصناف 6 أو 7 شيكل مجانًا. يتكرر مع كل مجموعة مكتملة.';
  return en ? `Choose ${offer.buy + offer.free} donuts at any price; the ${offer.free} lowest-priced are free. Repeats with each complete bundle.${offer.tuesdayOnly && !offer.weekdays ? ' Tuesdays only.' : ''}` : `اختر ${offer.buy + offer.free} ${offer.buy + offer.free <= 10 ? 'حبات' : 'حبة'} من أي سعر؛ ${offer.free} من الحبات الأقل سعرًا مجانًا. يتكرر مع كل مجموعة مكتملة.${offer.tuesdayOnly && !offer.weekdays ? ' كل ثلاثاء فقط.' : ''}`;
}
export function offerAvailability(offer, en = false) {
  return offer.includesDrinks
    ? (en ? 'Available at all branches except Icon Mall.' : 'متوفر في جميع الفروع ما عدا Icon Mall.')
    : (en ? 'Available at all branches.' : 'متوفر في جميع الفروع.');
}
export const offerDays = [
  ['Monday', 'الإثنين'], ['Tuesday', 'الثلاثاء'], ['Wednesday', 'الأربعاء'],
  ['Thursday', 'الخميس'], ['Friday', 'الجمعة'], ['Saturday', 'السبت'], ['Sunday', 'الأحد'],
];
export function offerSchedule(offer, en = false) {
  const days = offer.weekdays || (offer.tuesdayOnly ? [2] : [1,2,3,4,5,6,7]);
  const labels = [days.length === 7 ? (en ? 'Every day' : 'كل يوم') : days.map(day => offerDays[day - 1][en ? 0 : 1]).join(en ? ', ' : '، ')];
  const start = offer.weekdays ? offer.start_time : (offer.displayOnly ? '07:30' : null);
  const end = offer.weekdays ? offer.end_time : (offer.displayOnly ? '11:00' : null);
  labels.push(start ? `${start.slice(0,5)}–${end.slice(0,5)}${start > end ? (en ? ' (next day)' : ' (اليوم التالي)') : ''}` : (en ? 'All day' : 'طوال اليوم'));
  if (offer.starts_on) labels.push(`${en ? 'From' : 'من'} ${offer.starts_on}`);
  if (offer.ends_on) labels.push(`${en ? 'Through' : 'حتى'} ${offer.ends_on}`);
  return labels.join(' · ');
}
