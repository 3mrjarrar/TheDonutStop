import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import './Admin.css';
import { isAvailable, tracksQuantity } from '../../lib/availability';

const actions = { restock: 'إضافة مخزون', waste: 'تسجيل تالف', count: 'تصحيح الجرد', unavailable: 'إيقاف البيع', available: 'إعادة إتاحة البيع' };
const unwrap = ({ data, error }) => { if (error) throw error; return data; };

export default function Admin() {
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
  const saving = useRef(false);
  const editPanel = useRef(null);
  useEffect(() => { if (edit) { editPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); editPanel.current?.focus(); } }, [edit?.row.variant_id]);

  useEffect(() => {
    if (!supabase) { setError('إعداد اتصال قاعدة البيانات غير مكتمل.'); setReady(true); return; }
    let live = true;
    supabase.auth.getSession().then(({ data, error: problem }) => {
      if (live) { if (problem) setError('تعذّر قراءة جلسة الدخول.'); setSession(data.session); setReady(true); }
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
    setProfile(null); setBranches([]); setBranch(''); setRows([]); setEvents([]); setEdit(null);
    if (!session?.user.id) return;
    setLoading(true); setError('');
    async function load() {
      const person = unwrap(await supabase.from('staff_profiles').select('*').eq('user_id', session.user.id).maybeSingle());
      if (!person?.active || !['owner', 'manager'].includes(person.role)) throw new Error('هذا الحساب لا يملك صلاحية إدارة المخزون. راجع المالك.');
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
    if (!branch) return;
    setLoading(true); setError('');
    Promise.all([
      supabase.from('branch_inventory').select('*, product_variants!inner(id,size,products!inner(name,category))').eq('branch_id', branch).then(unwrap),
      supabase.from('inventory_events').select('*').eq('branch_id', branch).order('created_at', { ascending: false }).limit(30).then(unwrap),
    ]).then(([inventory, history]) => { if (live) { setRows(inventory); setEvents(history); } })
      .catch(() => { if (live) setError('تعذّر تحميل المخزون والسجل. تحقق من تطبيق ملف إعداد لوحة الإدارة ثم أعد المحاولة.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [branch, revision]);

  async function login(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const { error: problem } = await supabase.auth.signInWithPassword({ email: form.get('email').trim(), password: form.get('password') });
    if (problem) setError('تعذّر تسجيل الدخول. تحقق من الإيميل وكلمة المرور.');
    setBusy(false);
  }
  async function reset(event) {
    const email = event.currentTarget.form.elements.email.value.trim();
    if (!email) { setError('أدخل إيميلك أولًا.'); return; }
    setBusy(true); setError('');
    const { error: problem } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin` });
    if (problem) setError('تعذّر إرسال رابط الاستعادة. حاول لاحقًا.');
    else setMessage('إذا كان الإيميل مسجلًا، سيصلك رابط لاستعادة كلمة المرور.');
    setBusy(false);
  }
  async function changePassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { error: problem } = await supabase.auth.updateUser({ password: new FormData(event.currentTarget).get('password') });
    if (problem) setError('تعذّر تحديث كلمة المرور. جرّب كلمة أقوى أو اطلب رابطًا جديدًا.');
    else { setRecovery(false); setMessage('تم حفظ كلمة المرور.'); }
    setBusy(false);
  }
  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      unwrap(await supabase.rpc('adjust_inventory', {
        p_branch: branch, p_variant: edit.row.variant_id, p_action: edit.action,
        p_amount: Number(data.get('amount') || 0), p_reason: data.get('reason'),
        p_expected_quantity: edit.row.quantity, p_expected_unavailable: edit.row.manual_unavailable,
        p_request_id: edit.requestId,
      }));
      setMessage('تم حفظ التعديل وتسجيله.'); setEdit(null); setRevision(value => value + 1);
    } catch (problem) {
      setError(problem.code === '40001' ? 'تغيّر المخزون منذ فتح النموذج. أغلقه واضغط تحديث قبل التعديل.' : 'تعذّر الحفظ. تحقق من الكمية والصلاحيات والاتصال، ثم حاول مجددًا.');
    } finally { saving.current = false; setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    const { error: problem } = await supabase.auth.signOut();
    if (problem) setError('تعذّر تسجيل الخروج. حاول مجددًا.');
    else { setRecovery(false); setMessage(''); setError(''); }
    setBusy(false);
  }
  const selected = branches.find(item => item.id === branch);
  return <main className="admin-shell" dir="rtl">
    <title>لوحة الإدارة | The Donut Stop</title><meta name="robots" content="noindex,nofollow" />
    <header className="admin-header"><div><Link to="/">The Donut Stop</Link><h1>إدارة المخزون</h1></div>{session && <button disabled={busy} onClick={logout}>تسجيل الخروج</button>}</header>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
    {!ready ? <p role="status">جارٍ التحميل…</p> : recovery ? <form className="admin-panel admin-login" onSubmit={changePassword}><h2>تعيين كلمة مرور جديدة</h2><label>كلمة المرور الجديدة<input name="password" type="password" autoComplete="new-password" required minLength={12} /></label><button disabled={busy}>حفظ كلمة المرور</button></form> : !session ? <form className="admin-panel admin-login" onSubmit={login}>
      <h2>تسجيل دخول الموظفين</h2><p>استخدم حسابك الشخصي المخصص لإدارة المحل.</p>
      <label>الإيميل<input name="email" type="email" autoComplete="username" dir="ltr" required /></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" dir="ltr" required /></label>
      <button disabled={busy || !supabase}>{busy ? 'جارٍ التنفيذ…' : 'تسجيل الدخول'}</button><button type="button" className="secondary" disabled={busy || !supabase} onClick={reset}>نسيت كلمة المرور</button>
    </form> : <>
      {profile && <section className="admin-panel"><h2>مرحبًا، {profile.name}</h2><div className="admin-toolbar"><label>الفرع<select value={branch} disabled={busy} onChange={event => { setBranch(event.target.value); setMessage(''); }}>{branches.map(item => <option value={item.id} key={item.id}>{item.name_ar}</option>)}</select></label><label>بحث عن صنف<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><button disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>تحديث</button></div>{!branches.length && <p>لا يوجد فرع مخصص لهذا الحساب.</p>}</section>}
      {loading ? <p role="status">جارٍ تحميل المخزون…</p> : profile && branch && <>
        <section className="admin-panel"><h2>مخزون {selected?.name_ar}</h2><div className="admin-table-wrap"><table><thead><tr><th>الصنف</th><th>الكمية</th><th>التوفر</th><th>تعديل</th></tr></thead><tbody>{rows.filter(row => row.product_variants.products.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => a.product_variants.products.name.localeCompare(b.product_variants.products.name)).map(row => <tr key={row.variant_id}><td>{row.product_variants.products.name} {row.product_variants.size !== 'standard' && `(${row.product_variants.size})`}</td><td>{tracksQuantity(row.product_variants.products.category) ? row.quantity : 'لا يُقاس بالكمية'}</td><td>{!row.carried ? 'غير مدرج' : isAvailable(row.product_variants.products.category, row) ? 'متوفر' : 'غير متوفر'}</td><td><button disabled={busy} onClick={() => setEdit({ row, action: tracksQuantity(row.product_variants.products.category) ? 'restock' : row.manual_unavailable ? 'available' : 'unavailable', requestId: crypto.randomUUID() })}>{tracksQuantity(row.product_variants.products.category) ? 'تعديل المخزون' : 'تغيير الحالة'}</button></td></tr>)}</tbody></table></div>{!rows.length && <p>لا توجد أصناف. تحقق من تشغيل ملف المنيو.</p>}</section>
        {edit && <section ref={editPanel} tabIndex={-1} className="admin-panel" aria-label="تعديل المخزون"><form onSubmit={save} key={edit.requestId}><h2>{edit.row.product_variants.products.name} — {selected?.name_ar}</h2>{tracksQuantity(edit.row.product_variants.products.category) && <p>الكمية الحالية: {edit.row.quantity}</p>}<fieldset disabled={busy}><label>نوع التعديل<select value={edit.action} onChange={event => setEdit(current => ({ ...current, action: event.target.value, requestId: crypto.randomUUID() }))}>{Object.entries(actions).filter(([key]) => tracksQuantity(edit.row.product_variants.products.category) || ['available', 'unavailable'].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{['restock','waste','count'].includes(edit.action) && <label>{edit.action === 'count' ? 'العدد الفعلي بعد الجرد' : 'الكمية'}<input name="amount" type="number" min={edit.action === 'count' ? 0 : 1} max={1000000} step="1" required /></label>}<label>سبب التعديل<input name="reason" minLength={2} maxLength={500} required /></label><p>{tracksQuantity(edit.row.product_variants.products.category) ? 'إضافة المخزون تعيد إتاحة الصنف تلقائيًا.' : 'المشروبات متوفرة دائمًا ما لم توقف بيعها يدويًا.'}</p><button>حفظ</button> <button type="button" className="secondary" onClick={() => setEdit(null)}>إلغاء</button></fieldset></form></section>}
        <section className="admin-panel"><h2>آخر 30 تعديلًا</h2>{events.length ? <ul className="admin-history">{events.map(item => <li key={item.id}><strong>{rows.find(row => row.variant_id === item.variant_id)?.product_variants.products.name || 'صنف'}</strong> — {actions[item.action] || item.action}: {!['available', 'unavailable'].includes(item.action) && <b dir="ltr">{item.delta > 0 ? '+' : ''}{item.delta}</b>} — {item.reason}<small>{new Date(item.created_at).toLocaleString('ar')} · بواسطة {item.actor_id === session.user.id ? profile.name : item.actor_id}</small></li>)}</ul> : <p>لم تُسجّل تعديلات بعد.</p>}</section>
      </>}
    </>}
  </main>;
}
