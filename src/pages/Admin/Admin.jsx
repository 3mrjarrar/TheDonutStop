import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import './Admin.css';
import Orders from './Orders';
import InventoryEditor from './InventoryEditor';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import AdminOffers from './AdminOffers';
import AdminFeatured from './AdminFeatured';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { drinkTypes, inventoryGroup, inventoryPrice, byInventoryPrice, inventoryProductImage } from './inventory';
import { isAvailable, tracksQuantity } from '../../lib/availability';
import StaffLogin from './StaffLogin';
import { useLanguage } from '../../i18n/LanguageContext';
import AddProduct from './AddProduct';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

const actions = { restock: 'إضافة مخزون', waste: 'تسجيل تالف', count: 'تصحيح الجرد', unavailable: 'إيقاف البيع', available: 'إعادة إتاحة البيع' };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };

export default function Admin() {
  const { language } = useLanguage();
  const authCopy = (ar, en) => language === 'en' ? en : ar;
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);
  const [revision, setRevision] = useState(0);
  const [recovery, setRecovery] = useState(false);
  const [section, setSection] = useState('orders');
  const [requestedInventoryType, setInventoryType] = useState('donuts');
  const selected = branches.find(item => item.id === branch);
  const inventoryTypes = selected?.code === 'ICON' ? [['donuts', 'الدونات']] : [['donuts', 'الدونات'], ['drinks', 'المشروبات']];
  const inventoryType = selected?.code === 'ICON' ? 'donuts' : requestedInventoryType;
  const [drinkType, setDrinkType] = useState('mojito');
  const [newCount, setNewCount] = useState(0);
  const [notice, setNotice] = useState(null);
  const saving = useRef(false);
  const editPanel = useRef(null);
  useEffect(() => { if (edit) { editPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); editPanel.current?.focus(); } }, [edit?.row.variant_id]);

  useEffect(() => {
    if (!supabase) { setError('إعداد اتصال قاعدة البيانات غير مكتمل.'); setReady(true); return; }
    let live = true;
    supabase.auth.getSession().then(({ data, error: problem }) => {
      if (live) { if (problem) setError('تعذّر قراءة جلسة الدخول.'); setSession(data.session); setReady(true); }
    }).catch(() => {
      if (live) { setError('تعذّر قراءة جلسة الدخول. / Unable to check your session.'); setReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, current) => {
      if (!live) return;
      setSession(current); setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let live = true;
    setSection('orders'); setNotice(null); setNewCount(0); setProfile(null); setBranches([]); setBranch(''); setRows([]); setEvents([]); setEdit(null);
    if (!session?.user.id) return;
    setLoading(true); setError('');
    async function load() {
      const person = unwrap(await supabase.from('staff_profiles').select('*').eq('user_id', session.user.id).maybeSingle());
      if (!person?.active || !['owner', 'manager', 'order_staff'].includes(person.role)) throw new Error('هذا الحساب لا يملك صلاحية لوحة الإدارة. راجع المالك.');
      let list = unwrap(await supabase.from('branches').select('*').eq('active', true).order('sort_order'));
      if (person.role !== 'owner') {
        const assigned = unwrap(await supabase.from('staff_branches').select('branch_id').eq('user_id', person.user_id));
        list = list.filter(item => assigned.some(value => value.branch_id === item.id));
      }
      if (live) { setProfile(person); setBranches(list); setBranch(list[0]?.id || ''); }
    }
    load().catch(problem => { if (live) setError(problem.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session?.user.id]);

  useEffect(() => {
    let live = true;
    setRows([]); setEvents([]); setEdit(null);
    if (!branch || profile?.role === 'order_staff') { setLoading(false); return; }
    setLoading(true); setError('');
    Promise.all([
      supabase.from('branch_inventory').select('*, product_variants!inner(id,size,price,products!inner(id,name,slug,category,image_path))').eq('branch_id', branch).eq('product_variants.products.active', true).then(unwrap),
      supabase.from('inventory_events').select('*').eq('branch_id', branch).order('created_at', { ascending: false }).limit(30).then(unwrap),
    ]).then(([inventory, history]) => { if (live) { setRows(inventory); setEvents(history); } })
      .catch(() => { if (live) setError('تعذّر تحميل المخزون والسجل. تحقق من تطبيق ملف إعداد لوحة الإدارة ثم أعد المحاولة.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [branch, revision, profile?.role]);

  async function login(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const { error: problem } = await supabase.auth.signInWithPassword({ email: form.get('email').trim(), password: form.get('password') });
      if (problem) throw problem;
    } catch {
      setError(authCopy('تعذّر تسجيل الدخول. تحقق من الإيميل وكلمة المرور وحاول مجددًا.', 'Unable to sign in. Check your email and password and try again.'));
    } finally { setBusy(false); }
  }
  async function reset(event) {
    const email = event.currentTarget.form.elements.email.value.trim();
    if (!event.currentTarget.form.elements.email.reportValidity()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: problem } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin` });
      if (problem) throw problem;
      setMessage(authCopy('إذا كان الإيميل مسجلًا، سيصلك رابط لاستعادة كلمة المرور.', 'If this email is registered, you’ll receive a password reset link.'));
    } catch {
      setError(authCopy('تعذّر إرسال رابط الاستعادة. حاول لاحقًا.', 'Unable to send a reset link. Please try again later.'));
    } finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    const password = new FormData(event.currentTarget).get('password');
    try {
      const { error: problem } = await supabase.auth.updateUser({ password });
      if (problem) throw problem;
      setRecovery(false); setMessage(authCopy('تم حفظ كلمة المرور.', 'Your password has been saved.'));
    } catch {
      setError(authCopy('تعذّر تحديث كلمة المرور. جرّب كلمة أقوى أو اطلب رابطًا جديدًا.', 'Unable to update your password. Try a stronger password or request a new link.'));
    } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      if (edit.action === 'price') {
        unwrap(await supabase.rpc('set_branch_price', {
          p_branch: branch, p_variant: edit.row.variant_id,
          p_price: Number(data.get('price')), p_expected_price: inventoryPrice(edit.row),
          p_reason: data.get('reason'), p_request_id: edit.requestId,
        }));
      } else unwrap(await supabase.rpc('adjust_inventory', {
        p_branch: branch, p_variant: edit.row.variant_id, p_action: edit.action,
        p_amount: Number(data.get('amount') || 0), p_reason: data.get('reason') || '',
        p_expected_quantity: edit.row.quantity, p_expected_unavailable: edit.row.manual_unavailable,
        p_request_id: edit.requestId,
      }));
      setMessage('تم حفظ التعديل وتسجيله.'); setEdit(null); setRevision(value => value + 1);
    } catch (problem) {
      setError(problem.code === '22023' ? (edit.action === 'price' ? 'أدخل سعرًا صالحًا بمنزلتين عشريتين كحد أقصى وسببًا للتعديل (حرفان على الأقل).' : 'بعد أول إضافة يجب كتابة سبب التعديل (حرفان على الأقل).') : problem.code === '40001' ? 'تغيّرت بيانات الصنف منذ فتح النموذج. أغلقه واضغط تحديث قبل التعديل.' : 'تعذّر الحفظ. تحقق من الكمية والصلاحيات والاتصال، ثم حاول مجددًا.');
    } finally { saving.current = false; setBusy(false); }
  }
  async function deleteProduct(product) {
    if (saving.current) return;
    if (!window.confirm(`حذف المنتج «${product.name}» وجميع أحجامه من جميع الفروع؟ ستبقى الطلبات السابقة محفوظة.`)) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    try {
      unwrap(await supabase.rpc('delete_catalog_product', { p_product: product.id }));
      const remaining = unwrap(await supabase.from('products').select('id').eq('id', product.id).eq('active', true));
      if (remaining.length) throw new Error('DELETE_NOT_APPLIED');
      setRows(current => current.filter(row => row.product_variants.products.id !== product.id));
      setEdit(null);
      setRevision(value => value + 1);
      setMessage(`تم حذف المنتج «${product.name}» من جميع الفروع.`);
    } catch (problem) {
      setError(problem.code === '42501' ? 'ليس لديك صلاحية حذف المنتجات.' : problem.code === 'PGRST202' || problem.message === 'DELETE_NOT_APPLIED' ? 'لم يتم حذف المنتج. طبّق ملف 202609230005_delete_products.sql في Supabase لتحديث وظيفة الحذف ثم أعد المحاولة.' : 'تعذّر تأكيد حذف المنتج. حدّث المخزون وتحقق من الاتصال قبل إعادة المحاولة.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { saving.current = false; setBusy(false); }
  }
  function deleteProductButton(product) {
    return <button type="button" className="admin-offer-delete admin-product-delete" disabled={busy} onClick={() => deleteProduct(product)} aria-label={`حذف المنتج ${product.name}`}><DeleteOutlinedIcon aria-hidden="true" />حذف المنتج</button>;
  }
  async function logout() {
    setBusy(true);
    try {
      const { error: problem } = await supabase.auth.signOut();
      if (problem) throw problem;
      setRecovery(false); setMessage(''); setError('');
    } catch {
      setError(authCopy('تعذّر تسجيل الخروج. حاول مجددًا.', 'Unable to sign out. Please try again.'));
    } finally { setBusy(false); }
  }
  function handleOrders(data, incoming) {
    setNewCount(data.filter(order => order.status === 'new').length);
    if (incoming.length) setNotice({ count: incoming.length, number: incoming[0].order_number });
  }
  const visibleRows = rows.filter(row => inventoryGroup(row.product_variants.products) === (inventoryType === 'donuts' ? 'donuts' : drinkType) && row.product_variants.products.name.toLowerCase().includes(search.toLowerCase())).sort(byInventoryPrice);
  const productSection = inventoryType === 'donuts' ? { category: 'donuts', subgroup: 'donuts', title: 'دونات' }
    : drinkType === 'hot' ? { category: 'hot', subgroup: 'hot', title: 'مشروب ساخن' }
      : drinkType === 'mojito' ? { category: 'cold', subgroup: 'mojito', title: 'موهيتو' }
        : drinkType === 'cold' ? { category: 'cold', subgroup: 'cold', title: 'مشروب بارد' }
          : drinkType === 'frappe' ? { category: 'blends', subgroup: 'frappe', title: 'فرابيه' }
            : { category: 'blends', subgroup: 'smoothies', title: 'سموذي' };
  const visibleEvents = events.filter(item => visibleRows.some(row => row.variant_id === item.variant_id));
  const sectionTitle = { orders: 'الطلبات', inventory: 'المخزون', offers: 'العروض', featured: 'الصفحة الرئيسية' }[section];
  function openInventory(row, action = 'restock') { setEdit({ row, action, requestId: crypto.randomUUID() }); }
  if (!ready || !session || recovery) return <StaffLogin ready={ready} recovery={recovery} busy={busy} error={!supabase ? authCopy('إعداد اتصال قاعدة البيانات غير مكتمل.', 'Staff sign-in is not configured yet.') : error} message={message} configured={!!supabase} onLogin={login} onReset={reset} onChangePassword={changePassword} />;
  return <main className={`admin-shell${session && profile && !recovery ? ' admin-dashboard' : ''}`} dir="rtl">
    <title>لوحة الإدارة | The Donut Stop</title><meta name="robots" content="noindex,nofollow" />
    {session && profile && !recovery && <aside className="admin-sidebar"><Link className="admin-brand" to="/"><img src="/assets/logo.jpg" alt="" /><span>The Donut Stop<small>لوحة الإدارة</small></span></Link><nav aria-label="أقسام لوحة الإدارة">{[['orders','الطلبات',ReceiptLongIcon],['inventory','المخزون',Inventory2OutlinedIcon],['offers','العروض',LocalOfferOutlinedIcon],['featured','الصفحة الرئيسية',StorefrontOutlinedIcon]].map(([key,label,Icon]) => <button type="button" key={key} disabled={busy || (key === 'inventory' && profile.role === 'order_staff')} className={section === key ? 'is-active' : ''} aria-current={section === key ? 'page' : undefined} onClick={() => { setSection(key); setEdit(null); }}><Icon /><span>{label}</span>{key === 'orders' && newCount > 0 && <b className="admin-count">{newCount}</b>}</button>)}</nav><div className="admin-sidebar-footer"><span>{profile.name}</span><small>{selected?.name_ar}</small><Link to="/">العودة للموقع ↗</Link></div></aside>}
    <div className="admin-workspace">
    <header className="admin-header"><div><Link to="/">The Donut Stop</Link><h1>{session && profile ? sectionTitle : 'لوحة الإدارة'}</h1></div><div className="admin-mode-actions"><Link className="admin-store-link" to="/"><StorefrontOutlinedIcon />{authCopy('عرض المتجر', 'View store')}</Link>{session && <button disabled={busy} onClick={logout}>{authCopy('تسجيل الخروج', 'Sign out')}</button>}</div></header>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
    <>
      {profile && <section className="admin-branch-bar"><div><strong>مرحبًا، {profile.name}</strong><p>إدارة يومك، من الطلب إلى التسليم.</p></div>{!['offers', 'featured'].includes(section) && <label>الفرع<select value={branch} disabled={busy} onChange={event => { setBranch(event.target.value); setEdit(null); setRows([]); setSearch(''); setMessage(''); setNotice(null); setNewCount(0); }}>{branches.map(item => <option value={item.id} key={item.id}>{item.name_ar}</option>)}</select></label>}{!branches.length && <p>لا يوجد فرع مخصص لهذا الحساب.</p>}</section>}
      {notice && <div className="admin-notification" role="alert"><NotificationsActiveOutlinedIcon /><div><strong>وصل طلب جديد!</strong><p>{notice.count > 1 ? `${notice.count} طلبات جديدة` : notice.number}</p></div><button onClick={() => { setSection('orders'); setNotice(null); }}>عرض الطلبات</button><button className="secondary" aria-label="إغلاق الإشعار" onClick={() => setNotice(null)}>إغلاق</button></div>}
      {profile && branch && <div hidden={section !== 'orders'}><Orders key={branch} branch={branch} branches={branches} role={profile.role} onOrders={handleOrders} onChange={() => setRevision(value => value + 1)} /></div>}
      {profile && section === 'featured' && <AdminFeatured role={profile.role} />}
      {profile && section === 'offers' && <AdminOffers role={profile.role} />}
      {section === 'inventory' && <>
      <div className="admin-inventory-tabs" role="group" aria-label="نوع المخزون">{inventoryTypes.map(([key,label]) => <button key={key} aria-pressed={inventoryType === key} className={inventoryType === key ? 'is-active' : 'secondary'} disabled={busy} onClick={() => { setInventoryType(key); setSearch(''); setEdit(null); }}>{label}</button>)}</div>
      {inventoryType === 'drinks' && <div className="admin-drink-tabs" role="group" aria-label="أنواع المشروبات">{drinkTypes.map(([key,label]) => <button type="button" key={key} aria-pressed={drinkType === key} className={drinkType === key ? 'is-active' : 'secondary'} disabled={busy} onClick={() => { setDrinkType(key); setSearch(''); setEdit(null); }}>{label}</button>)}</div>}
      <div className="admin-toolbar inventory-toolbar"><label>بحث عن صنف<input type="search" placeholder={inventoryType === 'donuts' ? 'ابحث في الدونات…' : 'ابحث في المشروبات…'} value={search} onChange={event => setSearch(event.target.value)} /></label><button disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>تحديث المخزون</button></div>
      {loading ? <p role="status">جارٍ تحميل المخزون…</p> : profile && profile.role !== 'order_staff' && branch && <>
        <section className="admin-panel"><h2>{inventoryType === 'donuts' ? 'مخزون الدونات' : drinkTypes.find(([key]) => key === drinkType)?.[1]} — {selected?.name_ar}</h2>{inventoryType === 'donuts' ? <div className="admin-stock-grid">{visibleRows.map(row => <article className="admin-stock-card" key={row.variant_id}>
          <img className="admin-stock-image" src={inventoryProductImage(row.product_variants.products)} alt={row.product_variants.products.name} loading="lazy" decoding="async" />
          <div className="admin-stock-heading"><h3>{row.product_variants.products.name}</h3><span><bdi>{inventoryPrice(row).toFixed(2)} ₪</bdi></span></div>
          <div className="admin-stock-level"><strong>{row.quantity}</strong><span>حبة في المخزون</span><small>{!row.carried ? 'غير مدرج' : isAvailable('donuts', row) ? 'متوفر للبيع' : 'غير متوفر للبيع'}</small></div>
          {edit?.row.variant_id === row.variant_id ? <div ref={editPanel} tabIndex={-1}><InventoryEditor key={edit.requestId} edit={edit} busy={busy} onSave={save} onCancel={() => setEdit(null)} /></div> : <div className="admin-stock-actions"><button disabled={busy} onClick={() => openInventory(row)}>+ إضافة كمية</button><button className="secondary" disabled={busy} onClick={() => openInventory(row, 'price')}>تعديل السعر</button><button className="secondary" disabled={busy} onClick={() => openInventory(row, 'count')}>تصحيح العدد</button><button className="secondary" disabled={busy} onClick={() => openInventory(row, 'waste')}>تسجيل تالف</button><button className="secondary" disabled={busy} onClick={() => openInventory(row, row.manual_unavailable ? 'available' : 'unavailable')}>{row.manual_unavailable ? 'إتاحة البيع' : 'إيقاف البيع'}</button></div>}
          {deleteProductButton(row.product_variants.products)}
        </article>)}<AddProduct {...productSection} onSaved={() => { setSearch(''); setMessage('تمت إضافة المنتج إلى قائمة الطعام.'); setRevision(value => value + 1); }} /></div> : <><div className="admin-table-wrap"><table><thead><tr><th>الصنف</th><th aria-sort="ascending">السعر ↑</th><th>الكمية</th><th>التوفر</th><th>تعديل</th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.variant_id}><td><div className="admin-product-cell"><img src={inventoryProductImage(row.product_variants.products)} alt="" loading="lazy" decoding="async" /><span>{row.product_variants.products.name} {row.product_variants.size !== 'standard' && `(${row.product_variants.size})`}</span></div></td><td><bdi>{inventoryPrice(row).toFixed(2)} ₪</bdi></td><td>{tracksQuantity(row.product_variants.products.category) ? row.quantity : 'لا يُقاس بالكمية'}</td><td>{!row.carried ? 'غير مدرج' : isAvailable(row.product_variants.products.category, row) ? 'متوفر' : 'غير متوفر'}</td><td><button disabled={busy} onClick={() => setEdit({ row, action: tracksQuantity(row.product_variants.products.category) ? 'restock' : row.manual_unavailable ? 'available' : 'unavailable', requestId: crypto.randomUUID() })}>{tracksQuantity(row.product_variants.products.category) ? 'تعديل المخزون' : 'تغيير الحالة'}</button><button className="secondary" disabled={busy} onClick={() => openInventory(row, 'price')}>تعديل السعر</button>{deleteProductButton(row.product_variants.products)}</td></tr>)}</tbody></table></div><AddProduct {...productSection} onSaved={() => { setSearch(''); setMessage('تمت إضافة المنتج إلى قائمة الطعام.'); setRevision(value => value + 1); }} /></>}{inventoryType !== 'donuts' && edit && <div ref={editPanel} tabIndex={-1}><InventoryEditor key={edit.requestId} edit={edit} busy={busy} onSave={save} onCancel={() => setEdit(null)} /></div>}{!visibleRows.length && <p>لا توجد أصناف مطابقة في هذا القسم.</p>}</section>

        <section className="admin-panel"><h2>آخر 30 تعديلًا</h2>{visibleEvents.length ? <ul className="admin-history">{visibleEvents.map(item => <li key={item.id}><strong>{rows.find(row => row.variant_id === item.variant_id)?.product_variants.products.name || 'صنف'}</strong> — {actions[item.action] || item.action}: {!['available', 'unavailable'].includes(item.action) && <b dir="ltr">{item.delta > 0 ? '+' : ''}{item.delta}</b>} — {item.reason}<small>{new Date(item.created_at).toLocaleString('ar')} · بواسطة {item.actor_id === session.user.id ? profile.name : item.actor_id}</small></li>)}</ul> : <p>لم تُسجّل تعديلات بعد.</p>}</section>
      </>}
      </>}
    </>
    </div>
  </main>;
}
