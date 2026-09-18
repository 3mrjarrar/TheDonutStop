import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { useCart } from './CartContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getBranchMenu } from '../../lib/supabase';
import { isAvailable } from '../../lib/availability';
import { offerPrompt } from '../../lib/offers';
import './cart.css';

function OfferDialog({ offer, branch, cart, setCart, en, onClose }) {
  const dialog = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.isConnected && previous.focus();
  }, []);
  useEffect(() => {
    let live = true;
    setLoading(true); setFailed(false);
    getBranchMenu(branch.id).then(data => { if (live) setRows(data); }).catch(() => { if (live) setFailed(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [branch.id, revision]);
  const options = rows.filter(row => {
    const variant = row.product_variants;
    const existing = cart.find(item => item.id === variant.id);
    const price = Number(row.price_override ?? variant.price);
    return variant.products.category === 'donuts' && isAvailable('donuts',row)
      && (offer.type === 'tuesday' || [6,7].includes(price))
      && (existing?.quantity || 0) < Math.min(99,row.quantity) && (existing || cart.length < 50);
  }).sort((a,b) => Number(a.price_override ?? a.product_variants.price) - Number(b.price_override ?? b.product_variants.price));
  function add(row) {
    const variant = row.product_variants;
    setCart(current => current.some(item => item.id === variant.id) ? current.map(item => item.id === variant.id ? {...item,quantity:item.quantity+1} : item) : [...current,{id:variant.id,name:variant.products.name,size:variant.size,category:'donuts',price:Number(row.price_override ?? variant.price),quantity:1}]);
  }
  return <dialog ref={dialog} className="quantity-dialog offer-dialog" aria-labelledby="offer-dialog-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <button className="dialog-close" type="button" aria-label={en ? 'Close' : 'إغلاق'} onClick={onClose}><CloseIcon /></button>
    <h2 id="offer-dialog-title">{offer.type === 'daily' ? (en ? 'Your sixth donut is free!' : 'الحبة السادسة علينا!') : (en ? 'Tuesday: 7 + 5 free' : 'عرض الثلاثاء: 7 عليك و5 علينا!')}</h2>
    <p>{offer.type === 'daily' ? (en ? `You have ${offer.count} donuts. Choose a free donut priced at ₪6 or ₪7.` : `طلبت ${offer.count} حبات دونات. استغل عرض 5 + 1 واختر حبتك المجانية من أصناف 6 أو 7 شيكل.`) : (en ? `Add ${offer.remaining} more donuts to complete your dozen. Pay for the most expensive 7 of 12. The better offer applies automatically.` : `أضف ${offer.remaining === 1 ? 'حبة واحدة' : offer.remaining === 2 ? 'حبتين' : `${offer.remaining} حبات`} لإكمال الـ12. تُحسب أغلى 7 حبات فقط، ويُطبّق العرض الأفضل لك تلقائيًا.`)}</p>
    {loading ? <p role="status">{en ? 'Loading available donuts…' : 'جارٍ تحميل الدونات المتوفرة…'}</p> : failed ? <div role="alert"><p>{en ? 'Unable to load donuts.' : 'تعذّر تحميل الأصناف.'}</p><button className="tab" onClick={() => setRevision(value=>value+1)}>{en ? 'Retry' : 'إعادة المحاولة'}</button></div> : <div className="offer-options">{options.map(row => <button type="button" key={row.product_variants.id} onClick={() => add(row)}><span className="offer-option-product"><img src={row.product_variants.products.image_path} alt="" loading="lazy" decoding="async" /><span>{row.product_variants.products.name}</span></span><bdi>{row.price_override ?? row.product_variants.price} ₪</bdi></button>)}{!options.length && <p>{en ? 'No eligible donuts are available at this branch right now.' : 'لا توجد أصناف متوفرة لهذا العرض في الفرع حاليًا.'}</p>}</div>}
    <button className="tab quantity-confirm" type="button" onClick={onClose}>{en ? 'Continue without adding' : 'متابعة بدون إضافة'}</button>
  </dialog>;
}
export default function OfferPrompt() {
  const { cart, setCart, branch, quote, locked } = useCart();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState('');
  const offer = quote && offerPrompt(cart, quote.is_tuesday);
  const key = offer ? `${branch?.id}:${offer.type}:${offer.count}` : '';
  if (!offer || !branch || locked || key === dismissed) return null;
  return <OfferDialog key={key} offer={offer} branch={branch} cart={cart} setCart={setCart} en={language === 'en'} onClose={() => setDismissed(key)} />;
}
