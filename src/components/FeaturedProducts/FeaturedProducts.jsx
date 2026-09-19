import './FeaturedProducts.css';
import { useFeaturedProducts } from '../../lib/useFeaturedProducts';
import { featuredItems } from '../../lib/featuredProducts';
import { donutDescriptions } from '../menu/menuData';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function FeaturedProducts() {
  const { t, language } = useLanguage();
  const photos = useFeaturedProducts();
  return (<section className="section favorites" id="favorites" aria-labelledby="favorites-title">
<div className="section-heading"><div><span className="eyebrow">{t("جرّب نكهاتنا")}</span><h2 id="favorites-title">{t("اختيارات بتشهّي")} <span>{t("♡")}</span></h2></div><Link className="text-link" to="/menu">{t("كل الأصناف")} <span aria-hidden="true">{t("←")}</span></Link></div>
<div className="featured-grid">
{featuredItems(photos).map(([name, price, photo], index) => <article className="feature-card" key={photo}>
  <div className={`feature-image ${['coral', 'lemon', 'pink', 'mint'][index]}`}><img src={`/assets/donuts/${photo}`} alt={name} loading="lazy" decoding="async" /></div>
  <div className="feature-info"><div><h3>{name}</h3><p>{donutDescriptions[name][language]}</p></div><strong dir="ltr">{price} ₪</strong></div>
</article>)}
</div>
</section>);
}
