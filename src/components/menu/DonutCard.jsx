import { useLanguage } from '../../i18n/LanguageContext';
import { donutDescriptions } from './menuData';
export default function DonutCard({ item: [name, price, photo], index }) {
  const { language } = useLanguage();
  return <article className="feature-card donut-card">
    <div className={`feature-image ${['coral', 'lemon', 'pink', 'mint'][index % 4]}`}><img src={`/assets/donuts/${photo}`} alt="" loading="lazy" decoding="async" width="1254" height="1254" /></div>
    <div className="feature-info"><div><h3>{name}</h3><p>{donutDescriptions[name][language]}</p></div><strong dir="ltr">{price} ₪</strong></div>
  </article>;
}
