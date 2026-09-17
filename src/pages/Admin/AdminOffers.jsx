const offers = [
  { image: 'morning', title: 'دونات + قهوة', detail: 'بـ12 شيكل', schedule: 'من 7:30 حتى 11 صباحًا' },
  { image: 'tuesday', title: '7 عليك، و5 علينا!', detail: 'اختر 12 حبة من أي سعر، وادفع ثمن أغلى 7 حبات فقط', schedule: 'كل ثلاثاء' },
  { image: 'daily', title: 'اختار 5، والسادسة علينا!', detail: 'مع كل 5 حبات، اختر السادسة مجانًا من أصناف 6 أو 7 شيكل', schedule: 'كل يوم' },
];
export default function AdminOffers() {
  return <section className="admin-panel"><div className="admin-toolbar"><h2>العروض المعروضة على الموقع</h2><a href="/#offers" target="_blank" rel="noreferrer">معاينة في الموقع ↗</a></div><p>العرضان 5 + 1 و7 + 5 يُحسبان تلقائيًا عند إتمام الطلب. يوم الثلاثاء يُطبّق الخصم الأكبر فقط دون جمع العرضين. يتكرر العرض مع كل مجموعة مكتملة، والمشروبات لا تُحتسب ضمن عدد الدونات.</p><div className="admin-offers-grid">{offers.map(offer => <article className="admin-offer" key={offer.image}><img src={`/assets/offers/${offer.image}.png`} alt={offer.title} /><div><span>{offer.schedule}</span><h3>{offer.title}</h3><p>{offer.detail}</p>{offer.image === 'morning' && <small>للعرض فقط — غير مطبق تلقائيًا في الطلبات الإلكترونية.</small>}</div></article>)}</div></section>;
}
