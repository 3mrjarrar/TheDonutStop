import { useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCart } from './CartContext';
import { orderItems } from '../../lib/offers';
import { supabase } from '../../lib/supabase';
import { isAvailable, tracksQuantity } from '../../lib/availability';
import './cart.css';
import { useOrderTracking } from '../orders/OrderTrackingContext';

export default function Cart({ branch, cart, setCart, rows, en, locked, setLocked, refresh }) {
  const { quote, quoteError, refreshQuote } = useCart();
  const [checkout, setCheckout] = useState(false);
  const [delivery, setDelivery] = useState('pickup');
  const [error, setError] = useState('');
  const { trackOrder } = useOrderTracking();
  const [sending, setSending] = useState(false);
  const pending = useRef(null);
  const sendingRef = useRef(false);
  const total = quote ? Number(quote.total) + (delivery === 'delivery' ? Number(quote.delivery_fee) : 0) : null;
  const change = (id, delta) => setCart(previous => previous.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));
  const canIncrease = item => {
    const row = rows.find(row => row.product_variants.id === item.id);
    return row && isAvailable(item.category, row) && item.quantity < 99 && (!tracksQuantity(item.category) || item.quantity < row.quantity);
  };
  async function place(event) {
    event.preventDefault();
    if (sendingRef.current) return;
    if (!pending.current) {
      if (!quote || quoteError) return;
      const data = new FormData(event.currentTarget);
      pending.current = {
        p_request_id: crypto.randomUUID(), p_branch: branch.id,
        p_items: orderItems(cart),
        p_customer: { name: data.get('name'), phone: data.get('phone'), fulfillment: delivery, address: data.get('address') || '', notes: data.get('notes') || '', payment_method: 'cash' },
        p_expected_total: Number(total.toFixed(2)),
      };
    }
    sendingRef.current = true; setSending(true); setLocked(true); setError('');
    try {
      const { data, error: problem } = await supabase.rpc('place_guest_order', pending.current);
      if (problem) throw problem;
      trackOrder({ ...data, requestId: pending.current.p_request_id, status: 'new', fulfillment: pending.current.p_customer.fulfillment, branch_name_ar: branch.name_ar, branch_name_en: branch.name_en });
      setCart([]); setCheckout(false); pending.current = null; setLocked(false); refresh(); refreshQuote();
      requestAnimationFrame(() => document.querySelector('.order-tracking')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    } catch (problem) {
      // Explicit database errors mean the transaction rolled back; a transport failure is ambiguous.
      const known = problem.code && /^P\d{4}$|^22\w{3}$|^23\w{3}$|^42501$|^40001$/.test(problem.code);
      if (known) {
        pending.current = null; setLocked(false); refresh(); refreshQuote();
        if (problem.message?.includes('PRICE_CHANGED')) setError(en ? 'Prices or offers changed. Review the updated total and confirm again.' : 'تغيّرت الأسعار أو العروض. راجع الإجمالي المحدّث ثم أكّد الطلب مجددًا.');
        else if (problem.message?.includes('ITEM_UNAVAILABLE')) setError(en ? 'An item is no longer available in the requested quantity. Update your cart.' : 'أحد الأصناف لم يعد متوفرًا بالكمية المطلوبة. عدّل السلة وحاول مجددًا.');
        else if (problem.message?.includes('TOO_MANY_ORDERS')) setError(en ? 'Too many recent orders. Please try later.' : 'وصلت للحد المسموح من الطلبات المتتالية. حاول لاحقًا.');
        else setError(en ? 'Order was not saved. Check your details and branch availability.' : 'لم يُحفظ الطلب. تحقق من بياناتك وتوفر الخدمة في الفرع.');
      } else {
        setError(en ? 'Confirmation could not be retrieved. Keep this page open and retry the same order to avoid duplicates.' : 'تعذّر استلام التأكيد. أبقِ الصفحة مفتوحة واضغط إعادة المحاولة لنفس الطلب، لتجنب تكراره.');
      }
    } finally { sendingRef.current = false; setSending(false); }
  }
  return <section className="cart-panel" aria-labelledby="cart-title"><h2 id="cart-title">{en ? 'Your cart' : 'سلة الطلب'}</h2><p>{en ? 'Your order is from ' : 'طلبك من فرع '}<strong>{en ? branch.name_en : branch.name_ar}</strong></p>
    {!cart.length ? <p>{en ? 'Your cart is empty.' : 'السلة فارغة.'}</p> : <>
      <ul className="cart-lines">{cart.map(item => <li key={item.id}><div><strong>{item.name}</strong> {item.size !== 'standard' && `(${item.size})`}<p>{quote?.lines.find(line => line.variant_id === item.id)?.unit_price ?? item.price} ₪ × {item.quantity}</p>{Number(quote?.lines.find(line => line.variant_id === item.id)?.free_quantity) > 0 && <small className="cart-free">{en ? 'Free donuts: ' : 'حبات مجانية: '}{quote.lines.find(line => line.variant_id === item.id).free_quantity}</small>}</div><div className="quantity-controls"><button type="button" disabled={locked} aria-label={`${en ? 'Decrease' : 'تقليل'} ${item.name}`} onClick={() => change(item.id,-1)}><RemoveIcon /></button><span>{item.quantity}</span><button type="button" disabled={locked || !canIncrease(item)} aria-label={`${en ? 'Increase' : 'زيادة'} ${item.name}`} onClick={() => change(item.id,1)}><AddIcon /></button><button type="button" disabled={locked} onClick={() => setCart(current => current.filter(value => value.id !== item.id))}>{en ? 'Remove' : 'حذف'}</button></div></li>)}</ul>
      {quote && Number(quote.discount) > 0 && <div className="cart-offer-summary" role="status"><strong>{quote.offer_code === 'tuesday' ? (en ? 'Tuesday offer: 7 + 5 free' : 'عرض الثلاثاء: 7 + 5 مجانًا') : (en ? 'Buy 5, get 1 free' : 'عرض 5 + 1 مجانًا')}</strong><p>{en ? 'Subtotal' : 'قبل الخصم'}: {Number(quote.subtotal).toFixed(2)} ₪ · {en ? 'Discount' : 'الخصم'}: {Number(quote.discount).toFixed(2)} ₪</p>{quote.is_tuesday && <small>{en ? 'The better offer is applied. Offers cannot be combined.' : 'تم تطبيق العرض الأفضل لك دون جمع العرضين.'}</small>}</div>}
      <p><strong>{en ? 'Total' : 'الإجمالي'}: {total === null ? '—' : `${total.toFixed(2)} ₪`}</strong></p>
      {!quote && <p role="status">{quoteError ? (en ? 'Unable to confirm prices, offers or availability. Retry before checkout.' : 'تعذّر تأكيد الأسعار والعروض أو التوفر. أعد المحاولة قبل إتمام الطلب.') : (en ? 'Checking prices and offers…' : 'جارٍ التحقق من الأسعار والعروض…')}</p>}
      {quoteError && <button className="tab" type="button" onClick={refreshQuote}>{en ? 'Retry' : 'إعادة المحاولة'}</button>}
      {delivery === 'delivery' && <p>{en ? 'Delivery fee included' : 'يشمل رسوم التوصيل'}: {quote?.delivery_fee ?? branch.delivery_fee} ₪</p>}
      {error && <p className="cart-error" role="alert">{error}</p>}
      {!checkout ? <button className="tab active" disabled={!quote || quoteError} onClick={() => setCheckout(true)}>{en ? 'Checkout' : 'إتمام الطلب'}</button> : <form onSubmit={place}>
        <fieldset disabled={locked}><legend>{en ? 'Guest order details' : 'بيانات الطلب — بدون حساب'}</legend>
          <label>{en ? 'Name' : 'الاسم'}<input name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label>{en ? 'Phone' : 'رقم الهاتف'}<input name="phone" type="tel" autoComplete="tel" dir="ltr" pattern="[+]?[0-9]{8,15}" maxLength={25} required /></label>
          <label>{en ? 'Order type' : 'طريقة الاستلام'}<select value={delivery} onChange={event => setDelivery(event.target.value)}><option value="pickup">{en ? 'Pickup' : 'استلام من الفرع'}</option><option value="delivery" disabled={!quote?.delivery_enabled}>{en ? 'Delivery' : 'توصيل'}</option></select></label>
          {!branch.delivery_enabled && <p>{en ? 'Delivery is not enabled for this branch yet.' : 'التوصيل غير مفعّل لهذا الفرع حاليًا.'}</p>}
          {delivery === 'delivery' && <label>{en ? 'Delivery address' : 'عنوان التوصيل'}<textarea name="address" autoComplete="street-address" minLength={5} maxLength={500} required /></label>}
          <label>{en ? 'Notes (optional)' : 'ملاحظات (اختياري)'}<textarea name="notes" maxLength={1000} /></label>
          <label>{en ? 'Payment method' : 'طريقة الدفع'}<select name="payment"><option>{en ? 'Cash on receipt' : 'نقدًا عند الاستلام'}</option></select></label>
        </fieldset>
        <button className="tab active" disabled={sending || (!locked && (!quote || quoteError))}>{sending ? (en ? 'Sending…' : 'جارٍ الإرسال…') : locked ? (en ? 'Retry same order' : 'إعادة المحاولة لنفس الطلب') : (en ? 'Place order' : 'تأكيد الطلب')}</button>
        {!locked && <button className="tab" type="button" onClick={() => setCheckout(false)}>{en ? 'Back to cart' : 'العودة للسلة'}</button>}
      </form>}
    </>}
  </section>;
}
