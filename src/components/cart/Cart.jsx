import { useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCart } from './CartContext';
import { orderItems } from '../../lib/offers';
import { offerTitle } from '../../lib/offerCatalog';
import { supabase } from '../../lib/supabase';
import { isAvailable, tracksQuantity } from '../../lib/availability';
import './cart.css';
import { useOrderTracking } from '../orders/OrderTrackingContext';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import useOrderHold from '../../lib/useOrderHold';
import './order-hold-notice.css';
import { Link } from 'react-router';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import useOrderingHours from '../../lib/useOrderingHours';
import './ordering-hours.css';

export default function Cart({ branch, cart, setCart, rows, en, locked, setLocked, refresh }) {
  const { quote, quoteError, refreshQuote } = useCart();
  const { data: hold, error: holdError, refresh: refreshHold } = useOrderHold(branch.id);
  const pauseMessage = en ? 'This branch has temporarily paused new orders. You can keep adding to your cart. Please come back when orders resume.' : 'أوقف هذا الفرع استقبال الطلبات مؤقتًا. يمكنك متابعة إضافة المنتجات إلى السلة. يرجى العودة لتأكيد طلبك عند استئناف استقبال الطلبات.';

  const { status: hours, refresh: refreshHours } = useOrderingHours(branch.id);
  const closedMessage = en ? 'This branch is closed right now. You can keep adding to your cart, but please come back during opening hours to confirm your order.' : 'هذا الفرع مغلق حاليًا. يمكنك متابعة إضافة المنتجات إلى السلة، لكن يرجى العودة خلال أوقات الدوام لتأكيد طلبك.';
  const hoursError = en ? 'Unable to check opening hours. Please retry before confirming your order.' : 'تعذّر التحقق من أوقات الدوام. يرجى إعادة المحاولة قبل تأكيد الطلب.';
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
  const productImage = item => {
    const product = rows.find(row => row.product_variants.id === item.id)?.product_variants.products;
    if (!product) return null;
    return product.image_path || `/assets/${product.category === 'hot' ? 'hot-drinks' : 'cold-drinks'}/${encodeURIComponent(product.name)}.png`;
  };
  async function place(event) {
    event.preventDefault();
    if (sendingRef.current) return;
    if (!pending.current && (!quote || quoteError)) return;
    // Retrying an ambiguous request must still retrieve a previously accepted order,
    // even after closing. The database rejects any NEW order outside opening hours.
    const formData = new FormData(event.currentTarget);
    sendingRef.current = true; setSending(true); setLocked(true); setError('');
    try {
    if (!pending.current) {
      const [open, latestHold] = await Promise.all([refreshHours(), refreshHold()]);
      if (!latestHold || latestHold.paused) {
        setError(latestHold?.paused ? `${pauseMessage} ${latestHold.reason}` : (en ? 'Unable to verify branch availability. Please retry.' : 'تعذّر التحقق من استقبال الطلبات. يرجى إعادة المحاولة.'));
        return;
      }
      if (open !== true) {
        setError(open === false ? closedMessage : hoursError);
        return;
      }
      const data = formData;
      pending.current = {
        p_request_id: crypto.randomUUID(), p_branch: branch.id,
        p_items: orderItems(cart),
        p_customer: { name: data.get('name'), phone: data.get('phone'), fulfillment: delivery, address: data.get('address') || '', notes: data.get('notes') || '', payment_method: 'cash' },
        p_expected_total: Number(total.toFixed(2)),
      };
    }
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
        if (problem.message?.includes('ORDERS_PAUSED')) { setError(`${pauseMessage} ${problem.details || ''}`); refreshHold(); }
        else if (problem.message?.includes('BRANCH_CLOSED')) { setError(closedMessage); refreshHours(); }
        else if (problem.message?.includes('PRICE_CHANGED')) setError(en ? 'Prices or offers changed. Review the updated total and confirm again.' : 'تغيّرت الأسعار أو العروض. راجع الإجمالي المحدّث ثم أكّد الطلب مجددًا.');
        else if (problem.message?.includes('ITEM_UNAVAILABLE')) setError(en ? 'An item is no longer available in the requested quantity. Update your cart.' : 'أحد الأصناف لم يعد متوفرًا بالكمية المطلوبة. عدّل السلة وحاول مجددًا.');
        else if (problem.message?.includes('TOO_MANY_ORDERS')) setError(en ? 'Too many recent orders. Please try later.' : 'وصلت للحد المسموح من الطلبات المتتالية. حاول لاحقًا.');
        else setError(en ? 'Order was not saved. Check your details and branch availability.' : 'لم يُحفظ الطلب. تحقق من بياناتك وتوفر الخدمة في الفرع.');
      } else {
        setError(en ? 'Confirmation could not be retrieved. Keep this page open and retry the same order to avoid duplicates.' : 'تعذّر استلام التأكيد. أبقِ الصفحة مفتوحة واضغط إعادة المحاولة لنفس الطلب، لتجنب تكراره.');
      }
    } finally { sendingRef.current = false; setSending(false); if (!pending.current) setLocked(false); }
  }
  return <section className="cart-panel" aria-labelledby="cart-title"><h2 id="cart-title">{en ? 'Your cart' : 'سلة الطلب'}</h2><p>{en ? 'Your order is from ' : 'طلبك من فرع '}<strong>{en ? branch.name_en : branch.name_ar}</strong></p>
    {!cart.length ? <p>{en ? 'Your cart is empty.' : 'السلة فارغة.'}</p> : <>
      <ul className="cart-lines">{cart.map(item => <li key={item.id}><div className="cart-product">{productImage(item) && <img src={productImage(item)} alt="" loading="lazy" decoding="async" />}<div><strong>{item.name}</strong> {item.size !== 'standard' && `(${item.size})`}<p>{quote?.lines.find(line => line.variant_id === item.id)?.unit_price ?? item.price} ₪ × {item.quantity}</p>{Number(quote?.lines.find(line => line.variant_id === item.id)?.free_quantity) > 0 && <small className="cart-free">{en ? 'Free donuts: ' : 'حبات مجانية: '}{quote.lines.find(line => line.variant_id === item.id).free_quantity}</small>}</div></div><div className="quantity-controls"><button type="button" disabled={locked} aria-label={`${en ? 'Decrease' : 'تقليل'} ${item.name}`} onClick={() => change(item.id,-1)}><RemoveIcon /></button><span>{item.quantity}</span><button type="button" disabled={locked || !canIncrease(item)} aria-label={`${en ? 'Increase' : 'زيادة'} ${item.name}`} onClick={() => change(item.id,1)}><AddIcon /></button><button type="button" disabled={locked} onClick={() => setCart(current => current.filter(value => value.id !== item.id))}>{en ? 'Remove' : 'حذف'}</button></div></li>)}</ul>
      {quote && Number(quote.discount) > 0 && <div className="cart-offer-summary" role="status"><strong>{offerTitle(quote.offer_code, en)}</strong><p>{en ? 'Subtotal' : 'قبل الخصم'}: {Number(quote.subtotal).toFixed(2)} ₪ · {en ? 'Discount' : 'الخصم'}: {Number(quote.discount).toFixed(2)} ₪</p>{<small>{en ? 'The better offer is applied. Offers cannot be combined.' : 'تم تطبيق العرض الأفضل لك دون جمع العروض.'}</small>}</div>}
      <p><strong>{en ? 'Total' : 'الإجمالي'}: {total === null ? '—' : `${total.toFixed(2)} ₪`}</strong></p>
      {!quote && <p role="status">{quoteError ? (en ? 'Unable to confirm prices, offers or availability. Retry before checkout.' : 'تعذّر تأكيد الأسعار والعروض أو التوفر. أعد المحاولة قبل إتمام الطلب.') : (en ? 'Checking prices and offers…' : 'جارٍ التحقق من الأسعار والعروض…')}</p>}
      {quoteError && <button className="tab" type="button" onClick={refreshQuote}>{en ? 'Retry' : 'إعادة المحاولة'}</button>}
      {delivery === 'delivery' && <p>{en ? 'Delivery fee included' : 'يشمل رسوم التوصيل'}: {quote?.delivery_fee ?? branch.delivery_fee} ₪</p>}
      {error && <p className="cart-error" role="alert">{error}</p>}
      {(!hold || hold.paused) && <div className="order-hold-notice" id="order-hold-notice" role="status"><PauseCircleOutlineIcon aria-hidden="true" /><div><strong>{hold?.paused ? (en ? 'Orders temporarily paused' : 'استقبال الطلبات متوقف مؤقتًا') : holdError ? (en ? 'Unable to check branch availability' : 'تعذّر التحقق من استقبال الطلبات') : (en ? 'Checking branch availability…' : 'جارٍ التحقق من استقبال الطلبات…')}</strong>{hold?.paused && <><p>{pauseMessage}</p><p className="order-hold-public-reason"><strong>{en ? 'Reason: ' : 'السبب: '}</strong>{hold.reason}</p></>}{holdError && <><p>{en ? 'You can keep shopping. Please retry before confirming your order.' : 'يمكنك متابعة التسوق. يرجى إعادة المحاولة قبل تأكيد طلبك.'}</p><button type="button" className="tab" onClick={refreshHold}>{en ? 'Retry' : 'إعادة المحاولة'}</button></>}</div></div>}
      {(!hours || !hours.open) && <div className="cart-hours-notice" role="status" id="cart-hours-notice"><AccessTimeIcon aria-hidden="true" /><div><strong>{!hours ? (en ? 'Checking opening hours…' : 'جارٍ التحقق من أوقات الدوام…') : hours.failed ? (en ? 'Opening hours unavailable' : 'تعذّر التحقق من الدوام') : (en ? 'A little pause for something sweet' : 'وقفة صغيرة، ومنرجع نحلّي يومك')}</strong><p>{!hours ? (en ? 'Your cart is still available while we check.' : 'يمكنك متابعة تعديل سلتك أثناء التحقق.') : hours.failed ? hoursError : closedMessage}</p><Link to="/#hours">{en ? 'View branch hours' : 'عرض أوقات دوام الفروع'}</Link>{hours?.failed && <button type="button" className="tab" onClick={refreshHours}>{en ? 'Retry' : 'إعادة المحاولة'}</button>}</div></div>}
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
        <button className="tab active" aria-describedby={[(!hold || hold.paused) && 'order-hold-notice', !hours?.open && 'cart-hours-notice'].filter(Boolean).join(' ') || undefined} disabled={sending || (!locked && (!quote || quoteError || !hold || hold.paused || !hours?.open))}>{sending ? (en ? 'Sending…' : 'جارٍ الإرسال…') : locked ? (en ? 'Retry same order' : 'إعادة المحاولة لنفس الطلب') : (en ? 'Place order' : 'تأكيد الطلب')}</button>
        {!locked && <button className="tab" type="button" onClick={() => setCheckout(false)}>{en ? 'Back to cart' : 'العودة للسلة'}</button>}
      </form>}
    </>}
  </section>;
}
