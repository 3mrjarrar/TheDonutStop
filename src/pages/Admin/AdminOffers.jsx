import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { offerCatalog, offerTitle, offerDetails } from '../../lib/offerCatalog';
import { useOffers } from '../../lib/useOffers';

export default function AdminOffers({ branch, branchName, role }) {
  const { rows, loading, error, refresh } = useOffers(branch);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const saving = useRef(false);
  async function toggle(offer, current) {
    if (saving.current) return;
    saving.current = true; setBusy(offer.code); setMessage(''); setFailure('');
    try {
      const { error: problem } = await supabase.rpc('set_branch_offer', { p_branch: branch, p_code: offer.code, p_enabled: !current.enabled, p_expected_enabled: current.enabled });
      if (problem) throw problem;
      setMessage(`${current.enabled ? 'تم تعطيل وإخفاء' : 'تم تفعيل وإظهار'} عرض ${offerTitle(offer.code)} في ${branchName}.`);
      window.dispatchEvent(new Event('donut-offers-changed'));
      refresh();
    } catch (problem) {
      setFailure(problem.code === '42501' ? 'ليس لديك صلاحية تغيير هذا العرض.' : problem.code === '40001' ? 'تغيّرت حالة العرض. راجع الحالة المحدّثة وأعد المحاولة.' : 'تعذّر تأكيد الحفظ. تم طلب الحالة الحالية؛ تحقق منها قبل المحاولة مجددًا.');
      refresh();
    } finally { saving.current = false; setBusy(null); }
  }
  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>العروض — {branchName}</h2><a href="/#offers" target="_blank" rel="noreferrer">معاينة في الموقع ↗</a></div>
    <p>تفعيل العرض يُظهره للزبائن ويطبّق خصمه على طلبات هذا الفرع فورًا. تعطيله يُخفيه ويوقف الخصم للطلبات الجديدة. يُطبّق أكبر خصم فقط، دون جمع العروض، ويتكرر مع كل مجموعة مكتملة.</p>
    <p>{role === 'owner' ? 'يمكنك التحكم بكل العروض؛ غيّر الفرع من أعلى الصفحة لإدارة عروض أي فرع.' : role === 'manager' ? 'يمكنك إظهار وإخفاء جميع العروض السبعة لفروعك.' : 'يمكنك الاطلاع على حالة العروض. تعديلها متاح للمدير والمالك.'}</p>
    {message && <p className="admin-success" role="status">{message}</p>}{failure && <p className="admin-error" role="alert">{failure}</p>}
    {loading ? <p role="status">جارٍ تحميل العروض…</p> : error ? <div role="alert"><p>تعذّر تحميل إعدادات العروض. تحقق من الاتصال وتطبيق تحديث قاعدة البيانات.</p><button onClick={refresh}>إعادة المحاولة</button></div> : <div className="admin-offers-grid">{offerCatalog.map(offer => {
      const current = rows.find(row => row.code === offer.code);
      const allowed = role === 'owner' || role === 'manager';
      return <article className="admin-offer" key={offer.code}>
        <img src={`/assets/offers/${offer.image}.png`} alt={offerTitle(offer.code)} loading="lazy" />
        <div><span className={current?.enabled ? 'offer-enabled' : 'offer-disabled'}>{current?.enabled ? 'مفعّل · ظاهر للزبائن' : 'معطّل · مخفي'}</span><h3>{offerTitle(offer.code)}</h3><p>{offerDetails(offer)}</p>
          {offer.displayOnly && <p><strong>للعرض فقط — لا يغيّر حساب السلة.</strong></p>}
          <button type="button" role="switch" aria-checked={!!current?.enabled} aria-label={`${current?.enabled ? 'تعطيل' : 'تفعيل'} ${offerTitle(offer.code)}`} disabled={!!busy || !allowed || !current} onClick={() => toggle(offer, current)}>{busy === offer.code ? 'جارٍ الحفظ…' : current?.enabled ? 'تعطيل وإخفاء' : 'تفعيل وإظهار'}</button>
          {!allowed && <small>{'للمدير والمالك فقط'}</small>}
          {!current && <small>إعدادات هذا العرض غير متاحة لهذا الفرع.</small>}
        </div>
      </article>;
    })}</div>}
  </section>;
}
