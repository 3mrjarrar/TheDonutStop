import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { useCart } from './CartContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getBranchMenu } from '../../lib/supabase';
import { offerCapacity, addOfferSelection } from '../../lib/offerSelection';
import { offerPrompt } from '../../lib/offers';
import { findOffer, offerTitle } from '../../lib/offerCatalog';
import './cart.css';

function OfferDialog({ definition, offer, branch, cart, setCart, en, onClose }) {
  const dialog = useRef(null);
  const submittingRef = useRef(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const total = Object.values(selection).reduce((sum, quantity) => sum + quantity, 0);
  const newLines = Object.entries(selection).filter(([id, quantity]) => quantity > 0 && !cart.some(item => item.id === id)).length;
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
  const options = rows.filter(row => offerCapacity(row, cart, offer.type) > 0 || selection[row.product_variants.id])
    .sort((a,b) => Number(a.price_override ?? a.product_variants.price) - Number(b.price_override ?? b.product_variants.price));
  function maximum(row) {
    const id = row.product_variants.id;
    const quantity = selection[id] || 0;
    if (!quantity && !cart.some(item => item.id === id) && cart.length + newLines >= 50) return 0;
    return Math.min(offerCapacity(row, cart, offer.type), offer.remaining - total + quantity);
  }
  function choose(row, value) {
    setError('');
    setSelection(current => ({ ...current, [row.product_variants.id]: Math.max(0, Math.min(maximum(row), Math.trunc(Number(value) || 0))) }));
  }
  async function add() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true); setError('');
    try {
      const freshRows = await getBranchMenu(branch.id);
      setRows(freshRows);
      if (!addOfferSelection(cart, freshRows, selection, offer)) {
        setSelection({});
        setError(en ? 'Availability changed. Please choose your donuts again.' : 'تغيّر المخزون المتوفر. يرجى اختيار الدونات مجددًا.');
        return;
      }
      setCart(current => addOfferSelection(current, freshRows, selection, offer) || current);
      onClose();
    } catch {
      setError(en ? 'Unable to check availability. Please try again.' : 'تعذّر التحقق من المخزون. يرجى المحاولة مجددًا.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  return <dialog ref={dialog} className="quantity-dialog offer-dialog" aria-labelledby="offer-dialog-title" onCancel={event => { if (submitting) event.preventDefault(); else onClose(); }} onClick={event => { if (!submitting && event.target === dialog.current) onClose(); }}>
    <button className="dialog-close" type="button" aria-label={en ? 'Close' : 'إغلاق'} disabled={submitting} onClick={onClose}><CloseIcon /></button>
    <h2 id="offer-dialog-title">{offerTitle(definition, en)}</h2>
    <p>{en ? `Choose ${offer.remaining} more donuts to complete this offer, then add your selection to cart. The best eligible discount is calculated automatically.` : `اختر ${offer.remaining} حبات لإكمال مجموعة العرض، ثم أضف اختياراتك إلى السلة. يُحسب أكبر خصم مستحق تلقائيًا.`}{definition?.eligiblePrices && (en ? ' Choose the free donut from the ₪6 and ₪7 varieties.' : 'اختر الحبة المجانية من أصناف 6 أو 7 شيكل.')}</p>
    {loading ? <p role="status">{en ? 'Loading available donuts…' : 'جارٍ تحميل الدونات المتوفرة…'}</p> : failed ? <div role="alert"><p>{en ? 'Unable to load donuts.' : 'تعذّر تحميل الأصناف.'}</p><button className="tab" onClick={() => setRevision(value=>value+1)}>{en ? 'Retry' : 'إعادة المحاولة'}</button></div> : <div className="offer-options">{options.map(row => {
      const id = row.product_variants.id;
      const name = row.product_variants.products.name;
      const quantity = selection[id] || 0;
      return <div className="offer-option" key={id}>
        <span className="offer-option-product"><img src={row.product_variants.products.image_path} alt="" loading="lazy" decoding="async" /><span>{name}</span></span>
        <bdi>{row.price_override ?? row.product_variants.price} ₪</bdi>
        <div className="quantity-controls">
          <button type="button" disabled={submitting || quantity === 0} aria-label={en ? `Remove one ${name}` : `تقليل ${name}`} onClick={() => choose(row, quantity - 1)}>−</button>
          <input type="number" inputMode="numeric" min="0" max={maximum(row)} step="1" value={quantity} disabled={submitting} aria-label={en ? `Quantity of ${name}` : `كمية ${name}`} onChange={event => choose(row, event.target.value)} />
          <button type="button" disabled={submitting || quantity >= maximum(row)} aria-label={en ? `Add one ${name}` : `زيادة ${name}`} onClick={() => choose(row, quantity + 1)}>+</button>
        </div>
      </div>;
    })}{!options.length && <p>{en ? 'No eligible donuts are available at this branch right now.' : 'لا توجد أصناف متوفرة لهذا العرض في الفرع حاليًا.'}</p>}</div>}
    <div className="offer-actions">
      <p role="status" aria-live="polite">{en ? `${total} of ${offer.remaining} selected` : `تم اختيار ${total} من ${offer.remaining}`}</p>
      {error && <p role="alert" className="cart-error">{error}</p>}
      <button className="tab quantity-confirm" type="button" disabled={loading || failed || submitting || !total} onClick={add}>{submitting ? (en ? 'Checking availability…' : 'جارٍ التحقق من المخزون…') : (en ? `Add ${total} to cart` : `إضافة ${total} إلى السلة`)}</button>
      <button className="tab quantity-confirm" type="button" disabled={submitting} onClick={onClose}>{en ? 'Continue without adding' : 'متابعة بدون إضافة'}</button>
    </div>
  </dialog>;
}
export default function OfferPrompt() {
  const { cart, setCart, branch, quote, locked } = useCart();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState('');
  const offer = quote && offerPrompt(cart, quote.is_tuesday, quote.enabled_offers || [], quote.offer_rules);
  const key = offer ? `${branch?.id}:${offer.type}:${offer.count}` : '';
  if (!offer || !branch || locked || key === dismissed) return null;
  return <OfferDialog definition={quote.offer_rules?.find(rule => rule.code === offer.type) || findOffer(offer.type)} key={key} offer={offer} branch={branch} cart={cart} setCart={setCart} en={language === 'en'} onClose={() => setDismissed(key)} />;
}
