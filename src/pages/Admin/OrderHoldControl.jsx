import { useRef, useState } from 'react';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../i18n/LanguageContext';
import useOrderHold from '../../lib/useOrderHold';
import './order-hold.css';

export default function OrderHoldControl({ branch, branches, role }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const text = (ar, english) => en ? english : ar;
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState(branch);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const lock = useRef(false);
  const { data, error, refresh } = useOrderHold(target);
  const canManage = role === 'owner' || role === 'manager';
  const selected = branches.find(item => item.id === target);
  const name = selected ? (en ? selected.name_en : selected.name_ar) : '';

  async function save(event) {
    event.preventDefault();
    if (lock.current || !data || !canManage) return;
    const paused = !data.paused;
    if (paused && reason.trim().length < 2) { setFailure(text('يرجى كتابة سبب واضح للإيقاف.', 'Please enter a reason for pausing orders.')); return; }
    lock.current = true; setBusy(true); setFailure(''); setMessage('');
    try {
      const { error: problem } = await supabase.rpc('set_branch_order_hold', {
        p_branch: target, p_paused: paused, p_reason: paused ? reason.trim() : '', p_expected_version: data.version,
      });
      if (problem) throw problem;
      setReason('');
      setMessage(paused ? text(`تم إيقاف استقبال الطلبات مؤقتًا في ${name}.`, `New orders are now paused at ${name}.`) : text(`تم استئناف استقبال الطلبات في ${name}.`, `New orders have resumed at ${name}.`));
    } catch (problem) {
      setFailure(problem.code === '40001' ? text('تغيّرت الحالة بواسطة مسؤول آخر. راجع الحالة المحدّثة ثم حاول مجددًا.', 'Another admin changed this setting. Review the refreshed status before trying again.') : text('تعذّر تأكيد التغيير. راجع الحالة المحدّثة واتصالك وصلاحياتك قبل المحاولة مجددًا.', 'Could not confirm the change. Check the refreshed status, connection, and permissions before retrying.'));
    } finally { await refresh(); lock.current = false; setBusy(false); }
  }

  return <div className="order-hold-control" dir={en ? 'ltr' : 'rtl'}>
    <div className={`order-hold-strip${data?.paused ? ' is-paused' : ''}`}>
      <div className="order-hold-summary"><PauseCircleOutlineIcon /><div><strong>{text('استقبال الطلبات', 'Order reception')}</strong><span>{name} · {data ? (data.paused ? text('متوقف مؤقتًا', 'Temporarily paused') : text('متاح', 'Accepting orders')) : error ? text('الحالة غير متاحة', 'Status unavailable') : text('جارٍ التحقق…', 'Checking…')}</span></div></div>
      {canManage && <button className="order-hold-toggle" type="button" aria-expanded={expanded} aria-controls="order-hold-form" onClick={() => setExpanded(value => !value)}>{data?.paused ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />}{data?.paused ? text('استئناف الطلبات / اختيار الفرع', 'Resume orders / choose branch') : text('إيقاف الطلبات مؤقتًا', 'Pause orders')}</button>}
    </div>
    {data?.paused && <p className="order-hold-reason"><strong>{text('السبب:', 'Reason:')}</strong> {data.reason}</p>}
    {error && <div className="admin-error" role="alert"><p>{error === 'setup' ? text('ميزة إيقاف الطلبات تحتاج تحديث قاعدة البيانات. شغّل الملف التالي في محرر SQL في Supabase ثم اضغط إعادة المحاولة.', 'Order holds need a database update. Run the following file in the Supabase SQL Editor, then click Retry.') : text('تعذّر تحميل حالة الاستقبال. تحقق من الاتصال ثم حاول مجددًا.', 'Unable to load order reception status. Check your connection and retry.')}</p>{error === 'setup' && <code dir="ltr">202609190011_order_holds.sql</code>} <button type="button" className="secondary" disabled={busy} onClick={refresh}>{text('إعادة المحاولة', 'Retry')}</button></div>}
    {expanded && canManage && <form id="order-hold-form" className="order-hold-form" onSubmit={save}>
      <label>{text('الفرع المطلوب', 'Choose branch')}<select value={target} disabled={busy} onChange={event => { setTarget(event.target.value); setReason(''); setMessage(''); setFailure(''); }}>{branches.map(item => <option key={item.id} value={item.id}>{en ? item.name_en : item.name_ar}</option>)}</select></label>
      <p>{text('يؤثر هذا الإجراء على الطلبات الجديدة في الفرع المحدد فقط. يمكنك متابعة تجهيز الطلبات الحالية.', 'This affects new orders at the selected branch only. Existing orders can still be processed.')}</p>
      {!data?.paused && <label>{text('سبب الإيقاف — سيظهر للعملاء', 'Reason for pausing — shown to customers')}<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={2} maxLength={500} rows={3} disabled={busy} placeholder={text('مثلًا: ضغط طلبات، سنعود لاستقبال طلباتكم قريبًا.', 'For example: We’re catching up on orders. Please check back soon.')} /></label>}
      <div className="order-hold-actions"><button disabled={busy || !data || (!data.paused && reason.trim().length < 2)}>{busy ? text('جارٍ الحفظ…', 'Saving…') : data?.paused ? text(`استئناف الطلبات — ${name}`, `Resume orders — ${name}`) : text(`تأكيد الإيقاف — ${name}`, `Confirm pause — ${name}`)}</button><button className="secondary" type="button" disabled={busy} onClick={() => setExpanded(false)}>{text('إغلاق', 'Close')}</button></div>
    </form>}
    {failure && <p role="alert" className="admin-error">{failure}</p>}
    {message && <p role="status" className="admin-success">{message}</p>}
  </div>;
}
