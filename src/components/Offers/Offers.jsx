import './Offers.css';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Offers() {
  const { t } = useLanguage();
  return (<section className="offers" id="offers" aria-labelledby="offers-title">
<div className="offers-showcase">
<header className="offers-heading"><span className="eyebrow">{t("شارك الحلو مع الكل")}</span><h2 id="offers-title">{t("عروض بتحلّي يومك")}</h2></header>
<article className="offer-row" aria-labelledby="morning-offer-title">
<img className="offer-poster" src="/assets/offers/morning.png" width="1086" height="1448" loading="lazy" decoding="async" alt={t("عرض دونات وقهوة بـ12 شيكل، من 7:30 حتى 11 صباحًا.")} />
<div className="offer-copy"><span className="eyebrow">{t("صباحك أحلى")}</span><h3 id="morning-offer-title">{t("دونات + قهوة")}<br /><em>{t("بـ12 شيكل")}</em></h3><p>{t("ابدأ يومك بوقفة حلوة: دونات وقهوة من 7:30 حتى 11 صباحًا.")}</p></div>
</article>
<article className="offer-row" aria-labelledby="tuesday-offer-title">
<img className="offer-poster" src="/assets/offers/tuesday.png" width="1086" height="1448" loading="lazy" decoding="async" alt={t("كل ثلاثاء: 7 عليك و5 علينا.")} />
<div className="offer-copy"><span className="eyebrow">{t("كل ثلاثاء")}</span><h3 id="tuesday-offer-title">{t("7 عليك،")}<br /><em>{t("و5 علينا!")}</em></h3><p>{t("لمّة الثلاثاء بدها حلو. خذ 7 دونات، وخلّي الـ5 الزيادة علينا.")}</p></div>
</article>
<article className="offer-row" aria-labelledby="daily-offer-title">
<img className="offer-poster" src="/assets/offers/daily.png" width="1086" height="1448" loading="lazy" decoding="async" alt={t("اشترِ 5 دونات واحصل على واحدة مجانًا.")} />
<div className="offer-copy"><span className="eyebrow">{t("كل يوم")}</span><h3 id="daily-offer-title">{t("اختار 5،")}<br /><em>{t("والسادسة علينا!")}</em></h3><p>{t("نكهاتك المفضّلة، ومعها حبّة هدية. حلو أكثر للمشاركة.")}</p></div>
</article>
</div>
</section>);
}
