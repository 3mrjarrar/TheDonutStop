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
  const heading = index => category === 'cold' ? ({ 0: 'مشروبات باردة', 10: 'نكهات الموهيتو', 21: 'خلطات الموهيتو' })[index] : category === 'blends' ? ({ 0: 'سموذي', 7: 'فرابيه' })[index] : null;
  return <>
    <div className="tabs" role="tablist" aria-label={t('فئات المنيو')}>
      {categories.map(([key, label], index) => <button key={key} id={`tab-${key}`} type="button" className={`tab${category === key ? ' active' : ''}`} role="tab" aria-selected={category === key} aria-controls="menu-list" tabIndex={category === key ? 0 : -1} onKeyDown={event => moveTab(event, index)} onClick={() => setCategory(key)}>{t(label)}</button>)}
    </div>
    <div id="menu-list" className={`menu-grid ${category === 'donuts' ? 'donut-grid' : 'hot-drink-grid'}`} role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}>
      {menu[category].map((item, index) => <Fragment key={item[0]}>{heading(index) && <h2 className="menu-group-heading">{t(heading(index))}</h2>}{category === 'donuts' ? <DonutCard item={item} index={index} /> : <DrinkCard item={item} category={category} selectedSize={sizes[item[0]]} onSizeChange={selectSize} />}</Fragment>)}
    </div>
  </>;
}
