import { Fragment, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { menu } from './menuData';
import DonutCard from './DonutCard';
import DrinkCard from './DrinkCard';
import './menu.css';
const categories = [['donuts', 'دونات'], ['hot', 'مشروبات ساخنة'], ['cold', 'مشروبات باردة'], ['blends', 'سموذي وفرابيه']];
export default function MenuCatalog() {
  const { t, language } = useLanguage();
  const [category, setCategory] = useState('donuts');
  const [sizes, setSizes] = useState({});
  const selectSize = (name, size) => setSizes(previous => ({ ...previous, [name]: size }));
  function moveTab(event, index) {
    const step = language === 'ar' ? -1 : 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : event.key === 'ArrowRight' ? (index + step + categories.length) % categories.length : event.key === 'ArrowLeft' ? (index - step + categories.length) % categories.length : null;
    if (next === null) return;
    event.preventDefault();
    setCategory(categories[next][0]);
    document.getElementById(`tab-${categories[next][0]}`)?.focus();
  }
  const priceFor = ([, price]) => {
    if (typeof price === 'number') return price;
    const prices = price.match(/^S (\d+) \/ L (\d+)$/);
    return Number(prices[1]);
  };
  const groups = category === 'cold'
    ? [['مشروبات باردة', menu.cold.filter(([name]) => !name.includes('Mojito'))], ['نكهات الموهيتو', menu.cold.filter(([name]) => name.includes('Mojito'))]]
    : category === 'blends'
      ? [['سموذي', menu.blends.filter(([name]) => name.includes('Smoothie'))], ['فرابيه', menu.blends.filter(([name]) => name.includes('Frappe'))]]
      : [[null, menu[category]]];
  return <>
    <div className="tabs" role="tablist" aria-label={t('فئات المنيو')}>
      {categories.map(([key, label], index) => <button key={key} id={`tab-${key}`} type="button" className={`tab${category === key ? ' active' : ''}`} role="tab" aria-selected={category === key} aria-controls="menu-list" tabIndex={category === key ? 0 : -1} onKeyDown={event => moveTab(event, index)} onClick={() => setCategory(key)}>{t(label)}</button>)}
    </div>
    <div id="menu-list" className={`menu-grid ${category === 'donuts' ? 'donut-grid' : 'hot-drink-grid'}`} role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}>
      {groups.map(([heading, items]) => <Fragment key={heading || category}>{heading && <h2 className="menu-group-heading">{t(heading)}</h2>}{[...items].sort((a, b) => priceFor(a) - priceFor(b)).map((item, index) => category === 'donuts' ? <DonutCard key={item[0]} item={item} index={index} /> : <DrinkCard key={item[0]} item={item} category={category} selectedSize={sizes[item[0]]} onSizeChange={selectSize} />)}</Fragment>)}
    </div>
  </>;
}
