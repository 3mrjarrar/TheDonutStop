import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getBranches, getBranchMenu } from '../../lib/supabase';
import { useLanguage } from '../../i18n/LanguageContext';
import './menu.css';

const categories = [['donuts', 'دونات', 'Donuts'], ['hot', 'مشروبات ساخنة', 'Hot drinks'], ['cold', 'مشروبات باردة', 'Cold drinks'], ['blends', 'سموذي وفرابيه', 'Smoothies & frappes']];
const storageKey = 'donut-stop-branch';

export default function BranchMenu() {
  const { language } = useLanguage();
  const en = language === 'en';
  const [params, setParams] = useSearchParams();
  const requested = params.get('branch');
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(null);
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState('donuts');
  const [sizes, setSizes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false); setBranch(null); setRows([]);
    getBranches().then(list => {
      if (cancelled) return;
      setBranches(list);
      let saved;
      try { saved = localStorage.getItem(storageKey); } catch {}
      const chosen = list.find(item => item.code === (requested || saved));
      setBranch(chosen || null);
      if (chosen) { try { localStorage.setItem(storageKey, chosen.code); } catch {} }
      setLoading(false);
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [requested, retry]);

  useEffect(() => {
    if (!branch) return;
    let cancelled = false;
    setLoading(true); setError(false); setRows([]);
    const refresh = () => getBranchMenu(branch.id).then(data => {
      if (!cancelled) { setRows(data); setLoading(false); setError(false); }
    }).catch(() => { if (!cancelled) { setRows([]); setError(true); setLoading(false); } });
    refresh();
    const timer = setInterval(refresh, 30000);
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [branch]);

  function choose(code) {
    const next = new URLSearchParams(params);
    next.set('branch', code);
    setParams(next, { replace: true });
  }
  const products = new Map();
  for (const row of rows) {
    const product = row.product_variants.products;
    if (product.category !== category) continue;
    if (!products.has(product.id)) products.set(product.id, { ...product, variants: [] });
    products.get(product.id).variants.push(row);
  }
  return <>
    <div className="branch-picker">
      <h2>{en ? 'Choose the branch you want to order from' : 'اختر الفرع الذي تريد الطلب منه'}</h2>
      <div className="tabs" role="group" aria-label={en ? 'Branch' : 'الفرع'}>
        {branches.map(item => <button type="button" key={item.id} className={`tab${branch?.id === item.id ? ' active' : ''}`} aria-pressed={branch?.id === item.id} onClick={() => choose(item.code)}>{en ? item.name_en : item.name_ar}</button>)}
      </div>
      {branch && <p>{en ? 'Menu for: ' : 'منيو فرع: '}<strong>{en ? branch.name_en : branch.name_ar}</strong></p>}
    </div>
    {error ? <div role="alert"><p>{en ? 'We could not load availability. Please try again.' : 'تعذّر تحميل التوفر. يرجى المحاولة مجددًا.'}</p><button className="tab" onClick={() => setRetry(value => value + 1)}>{en ? 'Retry' : 'إعادة المحاولة'}</button></div> : loading ? <p role="status">{en ? 'Loading…' : 'جارٍ التحميل…'}</p> : branch ? <>
      <div className="tabs" role="group" aria-label={en ? 'Menu categories' : 'فئات المنيو'}>{categories.map(([key, ar, english]) => <button type="button" className={`tab${category === key ? ' active' : ''}`} aria-pressed={category === key} key={key} onClick={() => setCategory(key)}>{en ? english : ar}</button>)}</div>
      <div id="menu-list" className={`menu-grid ${category === 'donuts' ? 'donut-grid' : 'hot-drink-grid'}`}>
        {[...products.values()].sort((a, b) => a.sort_order - b.sort_order).map((product, index) => {
          const variants = product.variants.sort((a, b) => ({ S: 0, L: 1 }[a.product_variants.size] ?? 0) - ({ S: 0, L: 1 }[b.product_variants.size] ?? 0));
          const row = variants.find(item => item.product_variants.id === sizes[product.id]) || variants[0];
          const variant = row.product_variants;
          const available = row.quantity > 0 && !row.manual_unavailable;
          const donut = category === 'donuts';
          const image = product.image_path || (donut ? null : `/assets/${category === 'hot' ? 'hot-drinks' : 'cold-drinks'}/${encodeURIComponent(product.name)}.png`);
          return <article className={`feature-card ${donut ? 'donut-card' : 'hot-drink-card'}`} key={product.id}>
            {image && <div className={donut ? `feature-image ${['coral', 'lemon', 'pink', 'mint'][index % 4]}` : 'hot-drink-image'} data-size={variant.size === 'S' || ['Espresso', 'Ristretto', 'Lungo', 'Doppio'].includes(product.name) ? 'small' : 'large'}><img src={image} alt="" loading="lazy" /></div>}
            <div className="feature-info"><div><h3>{product.name}</h3><p>{en ? product.description_en : product.description_ar}</p></div><strong dir="ltr">{row.price_override ?? variant.price} ₪</strong></div>
            {variants.length > 1 && <div className="drink-sizes" role="group" aria-label={`${product.name} — ${en ? 'Size' : 'الحجم'}`}>{variants.map(item => <button type="button" key={item.product_variants.id} aria-pressed={variant.id === item.product_variants.id} onClick={() => setSizes(current => ({ ...current, [product.id]: item.product_variants.id }))}>{item.product_variants.size === 'S' ? (en ? 'Small' : 'صغير') : (en ? 'Large' : 'كبير')}</button>)}</div>}
            <p className={`stock-status ${available ? 'available' : 'unavailable'}`}>{available ? (en ? 'Available' : 'متوفر') : (en ? 'Unavailable' : 'غير متوفر')}</p>
          </article>;
        })}
      </div>
      {!products.size && <p>{en ? 'No products in this category at this branch.' : 'لا توجد أصناف في هذه الفئة لهذا الفرع.'}</p>}
    </> : !branches.length && <p>{en ? 'No branches available.' : 'لا توجد فروع متاحة حاليًا.'}</p>}
  </>;
}
