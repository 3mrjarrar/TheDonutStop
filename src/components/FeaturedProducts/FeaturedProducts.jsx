import './FeaturedProducts.css';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function FeaturedProducts() {
  const { t } = useLanguage();
  return (<section className="section favorites" id="favorites" aria-labelledby="favorites-title">
<div className="section-heading"><div><span className="eyebrow">{t("جرّب نكهاتنا")}</span><h2 id="favorites-title">{t("اختيارات بتشهّي")} <span>{t("♡")}</span></h2></div><Link className="text-link" to="/menu">{t("كل الأصناف")} <span aria-hidden="true">{t("←")}</span></Link></div>
<div className="featured-grid">
<article className="feature-card"><div className="feature-image coral"><img src="/assets/donuts/10-dubai-donut.png?v=transparent-2" alt={t("دونات دبي")} /></div><div className="feature-info"><div><h3>{t("Dubai Donut")}</h3><p>{t("دونات دبي")}</p></div><strong>{t("10 ₪")}</strong></div></article>
<article className="feature-card"><div className="feature-image lemon"><img src="/assets/donuts/13-pistachio-filling.png?v=transparent-2" alt={t("دونات بحشوة الفستق")} /></div><div className="feature-info"><div><h3>{t("Pistachio Filling")}</h3><p>{t("بحشوة الفستق")}</p></div><strong>{t("8 ₪")}</strong></div></article>
<article className="feature-card"><div className="feature-image pink"><img src="/assets/donuts/16-lotus-filling.png?v=transparent-2" alt={t("دونات بحشوة اللوتس")} /></div><div className="feature-info"><div><h3>{t("Lotus Filling")}</h3><p>{t("بحشوة اللوتس")}</p></div><strong>{t("7 ₪")}</strong></div></article>
<article className="feature-card"><div className="feature-image mint"><img src="/assets/donuts/01-original-glaze.png?v=transparent-2" alt={t("دونات أوريجينال جليز")} /></div><div className="feature-info"><div><h3>{t("Original Glaze")}</h3><p>{t("النكهة الأصلية")}</p></div><strong>{t("6 ₪")}</strong></div></article>
</div>
</section>);
}
