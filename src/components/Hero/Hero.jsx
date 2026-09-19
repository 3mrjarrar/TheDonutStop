import './Hero.css';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Hero() {
  const { t } = useLanguage();
  return (<section className="hero" aria-labelledby="hero-title">
<div className="hero-copy">
<h1 id="hero-title">{t("وقفة صغيرة.")}<br /><em>{t("فرحة كبيرة.")}</em></h1>
<p>{t("دونات طازة بنكهات بتحبها، ومعها قهوتك المفضّلة. اختار اللي على مزاجك من ذا دونات ستوب.")}</p>
<div className="hero-actions"><Link className="button button-dark" to="/menu">{t("اكتشف المنيو")} <span aria-hidden="true">{t("↖")}</span></Link><Link className="text-link" to="/#offers">{t("شوف العروض")} <span aria-hidden="true">{t("←")}</span></Link></div>
</div>
<div className="hero-visual" aria-label={t("مجموعة من أصناف الدونات")}>
<div className="hero-blob"></div>
<img className="hero-donut hero-donut-main" src="/assets/donuts/36-strawberry-jam-cream.png?v=transparent-2" alt={t("دونات ستروبيري مع كريم")} />
<img className="hero-donut hero-donut-side" src="/assets/donuts/18-oreo-filling.png?v=transparent-2" alt={t("دونات بحشوة الأوريو")} />
<img className="hero-donut hero-donut-small" src="/assets/donuts/01-original-glaze.png?v=transparent-2" alt={t("دونات أوريجينال جليز")} />
<span className="orbit-label orbit-top">{t("DONUT")}<br />{t("TIME!")}</span><span className="orbit-label orbit-bottom">{t("♡")}</span>
</div>
</section>);
}
