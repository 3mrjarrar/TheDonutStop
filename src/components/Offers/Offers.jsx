import './Offers.css';
import { useLanguage } from '../../i18n/LanguageContext';
import { useOffers } from '../../lib/useOffers';
import { visibleOffers, isOfferEnabled, offerTitle, offerDetails } from '../../lib/offerCatalog';

export default function Offers() {
  const { t, language } = useLanguage();
  const en = language === 'en';
  const { rows, loading, error, refresh } = useOffers();
  const visible = visibleOffers(rows);
  return <section className="offers" id="offers" aria-labelledby="offers-title"><div className="offers-showcase">
    <header className="offers-heading"><span className="eyebrow">{t('شارك الحلو مع الكل')}</span><h2 id="offers-title">{t('عروض بتحلّي يومك')}</h2></header>
    {loading ? <p role="status">{en ? 'Loading current offers…' : 'جارٍ تحميل العروض الحالية…'}</p> : error ? <div role="status"><p>{en ? 'Current offers could not be loaded.' : 'تعذّر تحميل العروض الحالية.'}</p><button className="tab" onClick={refresh}>{en ? 'Retry' : 'إعادة المحاولة'}</button></div> : !visible.length ? <p className="offers-empty" role="status">{en ? 'No offers for now. Check back later!' : 'ما في عروض حاليًا، ارجع شوفنا قريبًا!'}</p> : <>
      <p className="offers-policy">{en ? 'Available at the listed branches. The best eligible discount applies automatically; offers cannot be combined.' : 'العروض متاحة في الفروع المذكورة. يُطبّق أكبر خصم مستحق تلقائيًا دون جمع العروض.'}</p>
      {visible.map(offer => <article className="offer-row" key={offer.code} aria-labelledby={`${offer.code}-offer-title`}>
        <img className="offer-poster" src={`/assets/offers/${offer.image}.png`} loading="lazy" decoding="async" alt={offerTitle(offer.code, en)} />
        <div className="offer-copy"><span className="eyebrow">{offer.displayOnly ? (en ? 'Morning offer' : 'عرض الصباح') : offer.tuesdayOnly ? (en ? 'Tuesdays' : 'كل ثلاثاء') : (en ? 'Active offer' : 'عرض مفعّل')}</span><h3 id={`${offer.code}-offer-title`}>{offerTitle(offer.code, en)}</h3><p>{offerDetails(offer, en)}</p><p className="offer-branches">{en ? 'At: ' : 'في فروع: '}{offer.code === 'morning' ? (en ? 'Nablus · Tireh' : 'نابلس · الطيرة') : rows.filter(row => row.code === offer.code && isOfferEnabled(row)).map(row => en ? row.branches.name_en : row.branches.name_ar).join(' · ')}</p></div>
      </article>)}
    </>}
  </div></section>;
}
