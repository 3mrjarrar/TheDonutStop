import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { offerCatalog, offerAvailability, offerTitle, offerDetails } from '../../lib/offerCatalog';
import { useOffers } from '../../lib/useOffers';

export default function AdminOffers({ role }) {
  const { rows, loading, error, refresh } = useOffers(null, true);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const saving = useRef(false);
  async function toggle(offer, current) {
    if (saving.current) return;
    saving.current = true; setBusy(offer.code); setMessage(''); setFailure('');
    try {
      const enabled = current.enabled === true;
      const { error: problem } = await supabase.rpc('set_shared_offer', { p_code: offer.code, p_enabled: !enabled, p_expected_enabled: current.enabled });
      if (problem) throw problem;
      setMessage(`${enabled ? 'تم تعطيل وإخفاء' : 'تم تفعيل وإظهار'} عرض ${offerTitle(offer.code)} في جميع الفروع${offer.includesDrinks ? ' ما عدا الطيرة' : ''}.`);
      window.dispatchEvent(new Event('donut-offers-changed'));
      refresh();
    } catch (problem) {
      setFailure(problem.code === '42501' ? 'ليس لديك صلاحية تغيير هذا العرض.' : problem.code === '40001' ? 'تغيّرت حالة العرض. راجع الحالة المحدّثة وأعد المحاولة.' : 'تعذّر تأكيد الحفظ. تم طلب الحالة الحالية؛ تحقق منها قبل المحاولة مجددًا.');
      refresh();
    } finally { saving.current = false; setBusy(null); }
  }
  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>العروض — جميع الفروع</h2><a href="/#offers" target="_blank" rel="noreferrer">معاينة في الموقع ↗</a></div>
    <p>العروض مشتركة بين جميع الفروع. تفعيل أو إخفاء أي عرض يطبّق على الكل. عروض المشروبات لا تشمل الطيرة لأنها تقدّم الدونات فقط. يُطبّق أكبر خصم مستحق دون جمع العروض.</p>
    <p>{role === 'owner' || role === 'manager' ? 'يمكنك التحكم بالعروض المشتركة من هنا، دون الحاجة لتغيير الفرع.' : 'يمكنك الاطلاع على حالة العروض. تعديلها متاح للمدير والمالك.'}</p>
    {message && <p className="admin-success" role="status">{message}</p>}{failure && <p className="admin-error" role="alert">{failure}</p>}
    {loading ? <p role="status">جارٍ تحميل العروض…</p> : error ? <div role="alert"><p>تعذّر تحميل إعدادات العروض. تحقق من الاتصال وتطبيق تحديث قاعدة البيانات.</p><button onClick={refresh}>إعادة المحاولة</button></div> : <div className="admin-offers-grid">{offerCatalog.map(offer => {
      const current = rows.find(row => row.code === offer.code);
      const enabled = current?.enabled === true;
      const allowed = role === 'owner' || role === 'manager';
      return <article className="admin-offer" key={offer.code}>
        <img src={`/assets/offers/${offer.image}.png`} alt={offerTitle(offer.code)} loading="lazy" />
        <div><span className={enabled ? 'offer-enabled' : 'offer-disabled'}>{enabled ? 'مفعّل · ظاهر للزبائن' : 'معطّل · مخفي'}</span><h3>{offerTitle(offer.code)}</h3><p>{offerDetails(offer)}</p><p>{offerAvailability(offer)}</p>
          {offer.displayOnly && <p><strong>للعرض فقط — لا يغيّر حساب السلة.</strong></p>}
          <button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled ? 'تعطيل' : 'تفعيل'} ${offerTitle(offer.code)}`} disabled={!!busy || !allowed || !current} onClick={() => toggle(offer, current)}>{busy === offer.code ? 'جارٍ الحفظ…' : enabled ? 'تعطيل وإخفاء' : 'تفعيل وإظهار'}</button>
          {!allowed && <small>{'للمدير والمالك فقط'}</small>}
          {!current && <small>إعدادات هذا العرض غير متاحة.</small>}
        </div>
      </article>;
    })}</div>}
  </section>;
}
