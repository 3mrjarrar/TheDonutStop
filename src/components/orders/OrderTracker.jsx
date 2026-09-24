import { useEffect, useRef, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../i18n/LanguageContext';
import { useOrderTracking } from './OrderTrackingContext';
import './orders.css';

function OrderStatus({ order }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const { updateOrder, dismissOrder } = useOrderTracking();
  const update = useRef(updateOrder);
  update.current = updateOrder;
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const final = ['completed', 'cancelled'].includes(order.status);
  useEffect(() => {
    let active = true;
    let running = false;
    async function refresh() {
      if (running) return;
      running = true;
      try {
        if (!supabase) throw new Error('unavailable');
        const { data, error: problem } = await supabase.rpc('get_guest_order_status', { p_request_id: order.requestId });
        if (problem) throw problem;
        if (active) {
          if (!data) setError('missing');
          else { update.current(order.requestId, data); setError(''); }
        }
      } catch { if (active) setError('connection'); }
      finally { running = false; }
    }
    refresh();
    const timer = final ? null : setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [order.requestId, final, revision]);
  const delivery = order.fulfillment === 'delivery';
  const messages = {
    new: en ? 'Your order was sent successfully. Waiting for the branch to accept it.' : 'تم إرسال طلبك بنجاح. بانتظار قبول الطلب من الفرع.',
    preparing: en ? 'Your order has been accepted and is being prepared.' : 'تم قبول طلبك ويتم تحضيره.',
    ready: en ? `Your order is prepared and ready for ${delivery ? 'delivery' : 'pickup'}.` : `تم تجهيز طلبك وهو جاهز ${delivery ? 'للتوصيل' : 'للاستلام من الفرع'}.`,
    completed: en ? `Your order has been completed (${delivery ? 'delivery' : 'pickup'}). Thank you!` : `تم إكمال طلبك (${delivery ? 'توصيل' : 'استلام من الفرع'}). شكرًا لك!`,
    cancelled: en ? 'Your order has been cancelled.' : 'تم إلغاء طلبك.',
  };
  const steps = en ? ['Sent', 'Preparing', delivery ? 'Ready for delivery' : 'Ready for pickup', 'Completed'] : ['تم الإرسال', 'قيد التحضير', delivery ? 'جاهز للتوصيل' : 'جاهز للاستلام', 'مكتمل'];
  const stepIndex = ['new', 'preparing', 'ready', 'completed'].indexOf(order.status);
  const Icon = order.status === 'cancelled' ? CancelOutlinedIcon : ['ready', 'completed'].includes(order.status) ? CheckCircleOutlineIcon : AccessTimeIcon;
  return <article className={`order-status order-status-${order.status}`} aria-label={`${en ? 'Order' : 'الطلب'} ${order.order_number}`}>
    <div className="order-status-symbol"><Icon className="order-status-icon" /></div>
    <div className="order-status-content">
      <span className="tracking-eyebrow">{en ? "A little happiness is on its way" : "طلبك الحلو… خطوة بخطوة"}</span>
      <h2>{en ? 'Track your order' : 'متابعة طلبك'} <bdi>{order.order_number}</bdi></h2>
      <p role="status" aria-live="polite" aria-atomic="true">{messages[order.status]}</p>
      <small>{en ? order.branch_name_en : order.branch_name_ar} · {order.total} ₪ · {delivery ? (en ? 'Delivery' : 'توصيل') : (en ? 'Pickup' : 'استلام من الفرع')}</small>
      {order.status !== 'cancelled' && <ol className="tracking-steps" aria-label={en ? 'Order progress' : 'مراحل الطلب'}>{steps.map((label, index) => <li key={label} className={index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''} aria-current={index === stepIndex ? 'step' : undefined}><span className="tracking-step-dot" aria-hidden="true">{index < stepIndex ? '✓' : index + 1}</span><span>{label}</span></li>)}</ol>}
      {!final && <small className="tracking-hint">{en ? 'We’ll keep you updated automatically.' : 'خليك معنا، حالة طلبك بتتحدّث تلقائيًا.'}</small>}
      {error && <div className="tracking-error" role="alert"><p>{error === 'missing' ? (en ? 'This order could not be found. Contact the branch with your order number.' : 'تعذّر العثور على الطلب. تواصل مع الفرع مع ذكر رقم طلبك.') : (en ? 'Unable to refresh the status. Showing the last known update; reconnecting automatically.' : 'تعذّر تحديث الحالة. نعرض آخر حالة معروفة ونحاول الاتصال مجددًا.')}</p><button type="button" onClick={() => setRevision(value => value + 1)}>{en ? 'Retry' : 'إعادة المحاولة'}</button></div>}
    </div>
    {final && <button type="button" className="tracking-dismiss" onClick={() => dismissOrder(order.requestId)}>{en ? 'Dismiss' : 'إخفاء'}</button>}
  </article>;
}
export default function OrderTracker() {
  const { orders } = useOrderTracking();
  if (!orders.length) return null;
  return <div className="order-tracking">{orders.map(order => <OrderStatus key={order.requestId} order={order} />)}</div>;
}
