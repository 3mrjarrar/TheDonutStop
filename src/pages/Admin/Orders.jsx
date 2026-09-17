import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
const labels = { new: 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' };
const next = { new: ['preparing','cancelled'], preparing: ['ready','cancelled'], ready: ['completed','cancelled'] };
export default function Orders({ branch, onChange }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    let running = false;
    setOrders([]); setLoading(true);
    async function load() {
      if (running) return;
      running = true;
      const { data, error: problem } = await supabase.from('orders').select('id,branch_id,order_number,customer_name,phone,fulfillment,address,notes,payment_method,delivery_fee,total,status,created_at,order_items(name,size,quantity,unit_price)').eq('branch_id', branch).order('created_at', { ascending: false }).limit(100);
      running = false;
      if (!active) return;
      if (problem) { setOrders([]); setError('تعذّر تحميل الطلبات. تحقق من تشغيل ملف إعداد الطلبات.'); }
      else { setOrders(data); setError(''); }
      setLoading(false);
    }
    load(); const timer = setInterval(load, 10000); window.addEventListener('focus',load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus',load); };
  }, [branch, revision]);
  async function update(order, status) {
    if (lock.current) return;
    if (status === 'cancelled' && !window.confirm(`إلغاء الطلب ${order.order_number} وإرجاع مخزون الدونات؟`)) return;
    lock.current = true; setBusy(true); setError('');
    const { error: problem } = await supabase.rpc('set_order_status', { p_order: order.id, p_status: status });
    if (problem) setError('تعذّر تغيير الحالة. قد تكون تغيّرت بواسطة موظف آخر؛ حدّث الطلبات وحاول مجددًا.');
    else { setRevision(value => value + 1); onChange(); }
    lock.current = false; setBusy(false);
  }
  return <section className="admin-panel"><div className="admin-toolbar"><h2>الطلبات ({orders.filter(order => order.status === 'new').length} جديدة)</h2><button disabled={busy} onClick={() => setRevision(value => value + 1)}>تحديث الطلبات</button></div><p>آخر 100 طلب — تحديث تلقائي كل 10 ثوانٍ.</p>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {loading ? <p role="status">جارٍ تحميل الطلبات…</p> : !orders.length && !error ? <p>لا توجد طلبات بعد.</p> : orders.map(order => <article className="admin-order" key={order.id}><h3>{order.order_number} — {labels[order.status]}</h3><p>{order.customer_name} — <a href={`tel:${order.phone}`} dir="ltr">{order.phone}</a></p><p>{order.fulfillment === 'delivery' ? `توصيل: ${order.address}` : 'استلام من الفرع'}</p><ul>{order.order_items.map((item,index) => <li key={index}>{item.quantity} × {item.name} {item.size !== 'standard' && `(${item.size})`} — {item.unit_price} ₪</li>)}</ul>{order.notes && <p>ملاحظات: {order.notes}</p>}<p>الإجمالي: {order.total} ₪ — نقدًا عند الاستلام {order.fulfillment === 'delivery' && `(التوصيل: ${order.delivery_fee} ₪)`}</p><p>{new Date(order.created_at).toLocaleString('ar')}</p><div className="admin-order-actions">{(next[order.status] || []).map(status => <button disabled={busy} key={status} onClick={() => update(order,status)}>{status === 'preparing' ? 'قبول وبدء التحضير' : status === 'ready' ? (order.fulfillment === 'delivery' ? 'تم التجهيز — جاهز للتوصيل' : 'تم التجهيز — جاهز للاستلام') : status === 'completed' ? 'إكمال الطلب' : 'رفض / إلغاء'}</button>)}</div></article>)}
  </section>;
}
