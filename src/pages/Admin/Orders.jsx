import { offerTitle } from '../../lib/offerCatalog';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import OrderHoldControl from './OrderHoldControl';
import { activeOrder, orderDay, dayWindow, dashboardSummary, filterOrders, waitingMinutes, fetchOrderPages, incomingOrders } from './orderDashboard';
const labels = { new: 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' };
const next = { new: ['preparing','cancelled'], preparing: ['ready','cancelled'], ready: ['completed','cancelled'] };
export default function Orders({ branch, branches, role, onChange, onOrders, sound }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [fulfillment, setFulfillment] = useState('all');
  const [now, setNow] = useState(Date.now());
  const [threshold, setThreshold] = useState(15);
  const today = orderDay(now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const alertSound = useRef(sound.notify);
  alertSound.current = sound.notify;
  const lock = useRef(false);
  const seen = useRef(null);
  const report = useRef(onOrders);
  report.current = onOrders;
  useEffect(() => {
    let active = true;
    let running = false;
    setLoading(true);
    async function load() {
      if (running) return;
      running = true;
      try {
        const windows = [...new Set([today, date].filter(Boolean))].map(day => {
          const [start, end] = dayWindow(day);
          return `and(created_at.gte.${start},created_at.lt.${end})`;
        });
        const data = await fetchOrderPages(() => supabase.from('orders').select('id,branch_id,order_number,customer_name,phone,fulfillment,address,notes,payment_method,delivery_fee,total,discount,offer_code,status,created_at,order_items(name,size,quantity,unit_price,free_quantity)')
          .eq('branch_id', branch).or(`status.in.(new,preparing,ready),${windows.join(',')}`)
          .order('created_at', { ascending: false }).order('id'));
        if (!active) return;
        const incoming = incomingOrders(data, seen.current);
        seen.current = new Set(data.map(order => order.id));
        setOrders(data); setError(''); report.current?.(data, incoming);
        if (incoming.length) void alertSound.current();
      } catch {
        if (active) setError('تعذّر تحديث الطلبات. البيانات المعروضة قديمة؛ تحقق من الاتصال وأعد المحاولة.');
      } finally { running = false; }
      if (!active) return;
      setLoading(false);
    }
    load(); const timer = setInterval(load, 10000); window.addEventListener('focus',load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus',load); };
  }, [branch, revision, today, date]);
  async function update(order, status) {
    if (lock.current) return;
    if (status === 'cancelled' && !window.confirm(`إلغاء الطلب ${order.order_number} وإرجاع مخزون الدونات؟`)) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { error: problem } = await supabase.rpc('set_order_status', { p_order: order.id, p_status: status });
      if (problem) throw problem;
      setRevision(value => value + 1); onChange();
    } catch { setError('تعذّر تأكيد تغيير الحالة. حدّث الطلبات وتحقق من الحالة قبل المحاولة مجددًا.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const summary = dashboardSummary(orders, today);
  const filter = { date, today, status: statusFilter, fulfillment, search };
  const visible = filterOrders(orders, filter);
  const scoped = filterOrders(orders, { ...filter, status: 'all' });

  return <section className="admin-panel"><div className="admin-toolbar"><h2>الطلبات ({orders.filter(order => order.status === 'new').length} جديدة)</h2><button disabled={busy} onClick={() => setRevision(value => value + 1)}>تحديث الطلبات</button></div><p className="admin-order-hint">تحديث تلقائي كل 10 ثوانٍ · توقيت فلسطين</p>
    <section className="admin-daily-summary" aria-label="ملخص اليوم">
      <h3>ملخص اليوم <small>{today}</small></h3>
      <div className="admin-metrics" aria-busy={loading}>
        {[["قيمة الطلبات المكتملة", `${summary.revenue.toFixed(2)} ₪`], ["طلبات اليوم", summary.total], ["مكتملة", summary.completed], ["ملغاة", summary.cancelled]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{loading || error ? '—' : value}</strong></div>)}
      </div>
      <p>طلبات الموقع المنشأة اليوم في هذا الفرع. القيمة تشمل التوصيل وبعد الخصم، حسب حالة الطلب الحالية.</p>
      {!loading && !error && <p><strong>الأكثر طلبًا في الطلبات المكتملة: </strong>{summary.top.length ? summary.top.map(([name, quantity]) => `${name} (${quantity})`).join(' · ') : 'لا توجد طلبات مكتملة اليوم بعد.'}</p>}
    </section>
    <div className="admin-order-alert-settings">
      <button type="button" className="secondary" aria-pressed={sound.enabled} onClick={sound.enabled ? sound.mute : sound.enable}>{sound.enabled ? 'كتم التنبيه الصوتي' : 'تفعيل التنبيه الصوتي'}</button>
      <button type="button" className="secondary" onClick={sound.enable}>تجربة الصوت</button>
      <span role="status">{sound.blocked ? 'تعذّر تشغيل الصوت — اضغط تجربة الصوت وأعد المحاولة' : sound.enabled ? 'التنبيه الصوتي مفعّل' : 'التنبيه الصوتي مكتوم'}</span>
      <label>تنبيه التأخير بعد<select value={threshold} onChange={event => setThreshold(Number(event.target.value))}>{[5, 10, 15, 20, 30, 45, 60].map(value => <option key={value} value={value}>{value} دقيقة</option>)}</select></label>
      <small>الصوت مفعّل تلقائيًا عند الدخول ويبقى مفعّلًا عند تغيير الفرع. إذا منعه المتصفح، اضغط أي مكان داخل اللوحة للسماح بتشغيله. يصل التنبيه مع التحديث خلال نحو 10 ثوانٍ؛ قد يؤخره المتصفح إذا كانت الصفحة بالخلفية أو الجهاز مقفلًا. إذا لم تسمع التجربة، تحقق من صوت الوسائط وكتم التبويب ومخرج الصوت. الانتظار محسوب من إنشاء الطلب.</small>
    </div>
    <div className="admin-order-filters">
      <label>بحث عن طلب<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="رقم الطلب، اسم الزبون أو الهاتف" /></label>
      <label>تاريخ الطلب<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>طريقة الاستلام<select value={fulfillment} onChange={event => setFulfillment(event.target.value)}><option value="all">الكل</option><option value="delivery">توصيل</option><option value="pickup">استلام من الفرع</option></select></label>
      <button type="button" className="secondary" onClick={() => { setDate(''); setSearch(''); setFulfillment('all'); setStatusFilter('all'); }}>إعادة ضبط</button>
    </div>
    <p className="admin-order-hint">{date ? `طلبات تاريخ ${date}` : 'طلبات اليوم وجميع الطلبات المفتوحة من الأيام السابقة'}</p>
    <div className="admin-order-tabs" role="group" aria-label="فلترة حالة الطلب">{[['all', 'الكل'], ...Object.entries(labels)].map(([key, label]) => <button key={key} type="button" aria-pressed={statusFilter === key} className={statusFilter === key ? '' : 'secondary'} onClick={() => setStatusFilter(key)}>{label} <span>{scoped.filter(order => key === 'all' || order.status === key).length}</span></button>)}</div>
    <OrderHoldControl branch={branch} branches={branches} role={role} />
    {error && <p role="alert" className="admin-error">{error}</p>}
    {loading ? <p role="status">جارٍ تحميل الطلبات…</p> : !visible.length ? <p role="status">لا توجد طلبات مطابقة للفلاتر المحددة.</p> : visible.map(order => <article className={`admin-order${activeOrder(order) && waitingMinutes(order, now) >= threshold ? ' is-overdue' : ''}`} key={order.id}><h3>{order.order_number} — {labels[order.status]}</h3>{activeOrder(order) && <p className="admin-wait-time">{waitingMinutes(order, now) >= threshold ? 'تجاوز وقت الانتظار المحدد · ' : ''}منذ إنشاء الطلب: {waitingMinutes(order, now)} دقيقة</p>}<p>{order.customer_name} — <a href={`tel:${order.phone}`} dir="ltr">{order.phone}</a></p><p>{order.fulfillment === 'delivery' ? `توصيل: ${order.address}` : 'استلام من الفرع'}</p><ul>{[...order.order_items].sort((a,b) => Number(a.unit_price) - Number(b.unit_price) || a.name.localeCompare(b.name)).map((item,index) => <li key={index}>{item.quantity} × {item.name} {item.size !== 'standard' && `(${item.size})`} — {item.unit_price} ₪{item.free_quantity > 0 && <strong> — {item.free_quantity} مجانًا</strong>}</li>)}</ul>{order.notes && <p>ملاحظات: {order.notes}</p>}{Number(order.discount) > 0 && <p className="admin-success">{offerTitle(order.offer_code)} — الخصم: {order.discount} ₪</p>}<p>الإجمالي: {order.total} ₪ — نقدًا عند الاستلام {order.fulfillment === 'delivery' && `(التوصيل: ${order.delivery_fee} ₪)`}</p><p>{new Date(order.created_at).toLocaleString('ar', { timeZone: 'Asia/Hebron' })}</p><div className="admin-order-actions">{(next[order.status] || []).map(status => <button disabled={busy} key={status} onClick={() => update(order,status)}>{status === 'preparing' ? 'قبول وبدء التحضير' : status === 'ready' ? (order.fulfillment === 'delivery' ? 'تم التجهيز — جاهز للتوصيل' : 'تم التجهيز — جاهز للاستلام') : status === 'completed' ? 'إكمال الطلب' : 'رفض / إلغاء'}</button>)}</div></article>)}
  </section>;
}
