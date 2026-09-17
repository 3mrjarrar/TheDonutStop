import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isAvailable, tracksQuantity } from '../../lib/availability';
import './cart.css';

export default function Cart({ branch, cart, setCart, rows, en, locked, setLocked, refresh }) {
  const [checkout, setCheckout] = useState(false);
  const [delivery, setDelivery] = useState('pickup');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [sending, setSending] = useState(false);
  const pending = useRef(null);
  const sendingRef = useRef(false);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + (delivery === 'delivery' ? Number(branch.delivery_fee) : 0);
  const change = (id, delta) => setCart(previous => previous.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));
  const canIncrease = item => {
    const row = rows.find(row => row.product_variants.id === item.id);
    return row && isAvailable(item.category, row) && item.quantity < 99 && (!tracksQuantity(item.category) || item.quantity < row.quantity);
  };
  async function place(event) {
    event.preventDefault();
    if (sendingRef.current) return;
    if (!pending.current) {
      const data = new FormData(event.currentTarget);
      pending.current = {
        p_request_id: crypto.randomUUID(), p_branch: branch.id,
        p_items: cart.map(item => ({ variant_id: item.id, quantity: item.quantity })).sort((a,b) => a.variant_id.localeCompare(b.variant_id)),
        p_customer: { name: data.get('name'), phone: data.get('phone'), fulfillment: delivery, address: data.get('address') || '', notes: data.get('notes') || '', payment_method: 'cash' },
        p_expected_total: Number(total.toFixed(2)),
      };
    }
    sendingRef.current = true; setSending(true); setLocked(true); setError('');
    try {
      const { data, error: problem } = await supabase.rpc('place_guest_order', pending.current);
      if (problem) throw problem;
      setReceipt(data); setCart([]); setCheckout(false); pending.current = null; setLocked(false); refresh();
    } catch (problem) {
      // Explicit database errors mean the transaction rolled back; a transport failure is ambiguous.
      const known = problem.code && /^P\d{4}$|^22\w{3}$|^23\w{3}$|^42501$|^40001$/.test(problem.code);
      if (known) {
        pending.current = null; setLocked(false); refresh();
        if (problem.message?.includes('PRICE_CHANGED')) setError(en ? 'Prices changed. Remove the items and add them again to review current prices.' : 'تغيّرت الأسعار. احذف الأصناف وأضفها مجددًا لمراجعة الأسعار الحالية.');
        else if (problem.message?.includes('ITEM_UNAVAILABLE')) setError(en ? 'An item is no longer available in the requested quantity. Update your cart.' : 'أحد الأصناف لم يعد متوفرًا بالكمية المطلوبة. عدّل السلة وحاول مجددًا.');
        else if (problem.message?.includes('TOO_MANY_ORDERS')) setError(en ? 'Too many recent orders. Please try later.' : 'وصلت للحد المسموح من الطلبات المتتالية. حاول لاحقًا.');
        else setError(en ? 'Order was not saved. Check your details and branch availability.' : 'لم يُحفظ الطلب. تحقق من بياناتك وتوفر الخدمة في الفرع.');
      } else {
        setError(en ? 'Confirmation could not be retrieved. Keep this page open and retry the same order to avoid duplicates.' : 'تعذّر استلام التأكيد. أبقِ الصفحة مفتوحة واضغط إعادة المحاولة لنفس الطلب، لتجنب تكراره.');
      }
    } finally { sendingRef.current = false; setSending(false); }
  }
  if (receipt) return <section className="cart-panel" role="status"><h2>{en ? 'Order received' : 'تم استلام طلبك'}</h2><p><strong dir="ltr">{receipt.order_number}</strong> — {en ? 'We will prepare it shortly.' : 'سنقوم بتحضيره قريبًا.'}</p><p>{en ? 'From: ' : 'من فرع: '}{en ? branch.name_en : branch.name_ar}</p><p>{en ? 'Cash on receipt: ' : 'الدفع نقدًا عند الاستلام: '}{receipt.total} ₪</p><button className="tab" onClick={() => setReceipt(null)}>{en ? 'Continue browsing' : 'متابعة التصفح'}</button></section>;
  return <section className="cart-panel" aria-labelledby="cart-title"><h2 id="cart-title">{en ? 'Your cart' : 'سلة الطلب'}</h2><p>{en ? 'Your order is from ' : 'طلبك من فرع '}<strong>{en ? branch.name_en : branch.name_ar}</strong></p>
    {!cart.length ? <p>{en ? 'Your cart is empty.' : 'السلة فارغة.'}</p> : <>
      <ul className="cart-lines">{cart.map(item => <li key={item.id}><div><strong>{item.name}</strong> {item.size !== 'standard' && `(${item.size})`}<p>{item.price} ₪ × {item.quantity}</p></div><div className="quantity-controls"><button type="button" disabled={locked} aria-label={`${en ? 'Decrease' : 'تقليل'} ${item.name}`} onClick={() => change(item.id,-1)}>−</button><span>{item.quantity}</span><button type="button" disabled={locked || !canIncrease(item)} aria-label={`${en ? 'Increase' : 'زيادة'} ${item.name}`} onClick={() => change(item.id,1)}>+</button><button type="button" disabled={locked} onClick={() => setCart(current => current.filter(value => value.id !== item.id))}>{en ? 'Remove' : 'حذف'}</button></div></li>)}</ul>
      <p><strong>{en ? 'Total' : 'الإجمالي'}: {total.toFixed(2)} ₪</strong></p>
      {delivery === 'delivery' && <p>{en ? 'Delivery fee included' : 'يشمل رسوم التوصيل'}: {branch.delivery_fee} ₪</p>}
      {error && <p className="cart-error" role="alert">{error}</p>}
      {!checkout ? <button className="tab active" onClick={() => setCheckout(true)}>{en ? 'Checkout' : 'إتمام الطلب'}</button> : <form onSubmit={place}>
        <fieldset disabled={locked}><legend>{en ? 'Guest order details' : 'بيانات الطلب — بدون حساب'}</legend>
          <label>{en ? 'Name' : 'الاسم'}<input name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label>{en ? 'Phone' : 'رقم الهاتف'}<input name="phone" type="tel" autoComplete="tel" dir="ltr" pattern="[+]?[0-9]{8,15}" maxLength={25} required /></label>
          <label>{en ? 'Order type' : 'طريقة الاستلام'}<select value={delivery} onChange={event => setDelivery(event.target.value)}><option value="pickup">{en ? 'Pickup' : 'استلام من الفرع'}</option><option value="delivery" disabled={!branch.delivery_enabled}>{en ? 'Delivery' : 'توصيل'}</option></select></label>
          {!branch.delivery_enabled && <p>{en ? 'Delivery is not enabled for this branch yet.' : 'التوصيل غير مفعّل لهذا الفرع حاليًا.'}</p>}
          {delivery === 'delivery' && <label>{en ? 'Delivery address' : 'عنوان التوصيل'}<textarea name="address" autoComplete="street-address" minLength={5} maxLength={500} required /></label>}
          <label>{en ? 'Notes (optional)' : 'ملاحظات (اختياري)'}<textarea name="notes" maxLength={1000} /></label>
          <label>{en ? 'Payment method' : 'طريقة الدفع'}<select name="payment"><option>{en ? 'Cash on receipt' : 'نقدًا عند الاستلام'}</option></select></label>
        </fieldset>
        <button className="tab active" disabled={sending}>{sending ? (en ? 'Sending…' : 'جارٍ الإرسال…') : locked ? (en ? 'Retry same order' : 'إعادة المحاولة لنفس الطلب') : (en ? 'Place order' : 'تأكيد الطلب')}</button>
        {!locked && <button className="tab" type="button" onClick={() => setCheckout(false)}>{en ? 'Back to cart' : 'العودة للسلة'}</button>}
      </form>}
    </>}
  </section>;
}
