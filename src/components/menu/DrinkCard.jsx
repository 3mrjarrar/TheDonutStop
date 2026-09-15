import { useLanguage } from '../../i18n/LanguageContext';
import { coldDrinkDescriptions, smallCoffeeDescriptions } from './menuData';
export default function DrinkCard({ item: [name, price], category, selectedSize = 'small', onSizeChange }) {
  const { language } = useLanguage();
  const english = language === 'en';
  const isHot = category === 'hot';
  const espresso = isHot && name === 'Espresso';
  const prices = typeof price === 'string' ? price.match(/^S (\d+) \/ L (\d+)$/) : null;
  const description = isHot ? smallCoffeeDescriptions[name] : null;
  const size = prices ? selectedSize : description ? 'small' : 'large';
  const labels = espresso ? { small: 'Single', large: 'Double' } : english ? { small: 'Small', large: 'Large' } : { small: 'صغير', large: 'كبير' };
  const amount = prices ? prices[size === 'small' ? 1 : 2] : price;
  return <article className="feature-card hot-drink-card">
    <div className="hot-drink-image" data-size={espresso ? 'small' : size}><img src={`/assets/${isHot ? 'hot-drinks' : 'cold-drinks'}/${encodeURIComponent(name)}.png`} alt={`${name} — ${labels[size]}`} loading="lazy" decoding="async" width="1774" height="887" /></div>
    <div className="feature-info"><div><h3>{name}</h3>{!isHot && <p className="drink-description">{coldDrinkDescriptions[name][language]}</p>}</div><strong dir="ltr">{amount} ₪</strong></div>
    {prices ? <div className="drink-sizes" role="group" aria-label={`${name} — ${espresso ? (english ? 'Shots' : 'عدد الشوتات') : (english ? 'Size' : 'الحجم')}`}>
      {['small', 'large'].map(value => <button type="button" key={value} data-size={value} aria-pressed={size === value} onClick={() => onSizeChange(name, value)}>{labels[value]}</button>)}
    </div> : <p className="drink-size-label">{description ? description[language] : english ? 'Large size' : 'حجم كبير'}</p>}
  </article>;
}
