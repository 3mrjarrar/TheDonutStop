import { useRef, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { supabase } from '../../lib/supabase';
import { uploadOfferImage, offerUploadError } from '../../lib/offerImageUpload';
import { hasDynamicOfferSetup, dynamicOfferSetupMessage, offerSaveError } from '../../lib/offerSetup';
import { offerDefinition, offerAvailability, offerTitle, offerDetails, offerSchedule } from '../../lib/offerCatalog';
import { useOffers } from '../../lib/useOffers';
import OfferEditor from './OfferEditor';
import OfferPoster from '../../components/Offers/OfferPoster';

export default function AdminOffers({ role }) {
  const { rows, loading, error, refresh } = useOffers(null, true);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const saving = useRef(false);
  const uploadedImage = useRef(null);
  const [editor, setEditor] = useState(null);
  const allowed = role === 'owner' || role === 'manager';
  const setupReady = hasDynamicOfferSetup(rows);
  async function save(definition, imageFile) {
    if (saving.current) return;
    if (!setupReady) { setFailure(dynamicOfferSetupMessage); return; }
    saving.current = true; setBusy('save'); setFailure(''); setMessage('');
    let uploading = false;
    try {
      if (imageFile) {
        uploading = true;
        if (uploadedImage.current?.file !== imageFile) {
          const url = await uploadOfferImage(supabase, imageFile);
          uploadedImage.current = { file: imageFile, url };
        }
        definition = { ...definition, image_url: uploadedImage.current.url };
        uploading = false;
      }
      const { error: problem } = await supabase.rpc('save_shared_offer', {
        p_code: editor.code || null, p_definition: definition, p_expected_updated_at: editor.updated_at || null,
      });
      if (problem) throw problem;
      setMessage(editor.code ? 'تم حفظ العرض ومواعيده.' : 'تم إنشاء العرض مخفيًا. فعّله عندما يصبح جاهزًا للزبائن.');
      setEditor(null);
      uploadedImage.current = null;
      window.dispatchEvent(new Event('donut-offers-changed'));
      refresh();
    } catch (problem) {
      setFailure(uploading ? offerUploadError(problem) : offerSaveError(problem));
      refresh();
    } finally { saving.current = false; setBusy(null); }
  }
  async function toggle(offer, current) {
    if (saving.current) return;
    saving.current = true; setBusy(offer.code); setMessage(''); setFailure('');
    try {
      const enabled = current.enabled === true;
      const { error: problem } = await supabase.rpc('set_shared_offer', { p_code: offer.code, p_enabled: !enabled, p_expected_enabled: current.enabled });
      if (problem) throw problem;
      setMessage(`${enabled ? 'تم تعطيل وإخفاء' : 'تم تفعيل وإظهار'} عرض ${offerTitle(offer)} في جميع الفروع${offer.includesDrinks ? ' ما عدا Icon Mall' : ''}.`);
      window.dispatchEvent(new Event('donut-offers-changed'));
      refresh();
    } catch (problem) {
      setFailure(problem.code === '42501' ? 'ليس لديك صلاحية تغيير هذا العرض.' : problem.code === '40001' ? 'تغيّرت حالة العرض. راجع الحالة المحدّثة وأعد المحاولة.' : 'تعذّر تأكيد الحفظ. تم طلب الحالة الحالية؛ تحقق منها قبل المحاولة مجددًا.');
      refresh();
    } finally { saving.current = false; setBusy(null); }
  }
  async function removeOffer(offer, current) {
    if (saving.current || !setupReady) return;
    if (!window.confirm(`حذف عرض «${offerTitle(offer)}» نهائيًا من جميع الفروع؟ لا يؤثر ذلك في الطلبات السابقة.`)) return;
    saving.current = true; setBusy(`delete:${offer.code}`); setFailure(''); setMessage('');
    try {
      const { error: problem } = await supabase.rpc('delete_shared_offer', {
        p_code: offer.code, p_expected_updated_at: current.updated_at,
      });
      if (problem) throw problem;
      setMessage(`تم حذف عرض ${offerTitle(offer)} من جميع الفروع.`);
      window.dispatchEvent(new Event('donut-offers-changed'));
      refresh();
    } catch (problem) {
      setFailure(offerSaveError(problem));
      refresh();
    } finally { saving.current = false; setBusy(null); }
  }
  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>العروض — جميع الفروع</h2><a href="/#offers" target="_blank" rel="noreferrer">معاينة في الموقع ↗</a></div>
    <p>العروض مشتركة بين جميع الفروع. تفعيل أو إخفاء أي عرض يطبّق على الكل. عروض المشروبات لا تشمل Icon Mall. يُطبّق أكبر خصم مستحق دون جمع العروض.</p>
    <p>{role === 'owner' || role === 'manager' ? 'يمكنك التحكم بالعروض المشتركة من هنا، دون الحاجة لتغيير الفرع.' : 'يمكنك الاطلاع على حالة العروض. تعديلها متاح للمدير والمالك.'}</p>
    {!loading && !error && !setupReady && <div className="admin-error" role="alert"><p>{dynamicOfferSetupMessage}</p><button type="button" onClick={refresh}>إعادة التحقق</button></div>}
    {allowed && !editor && <button type="button" disabled={!!busy || loading || error || !setupReady} onClick={() => setEditor({})}>إضافة عرض جديد</button>}
    {editor && <OfferEditor key={editor.code || 'new'} current={editor.code ? editor : null} busy={!!busy} onSave={save} onCancel={() => setEditor(null)} />}
    {message && <p className="admin-success" role="status">{message}</p>}{failure && <p className="admin-error" role="alert">{failure}</p>}
    {loading ? <p role="status">جارٍ تحميل العروض…</p> : error ? <div role="alert"><p>تعذّر تحميل إعدادات العروض. تحقق من الاتصال وتطبيق تحديث قاعدة البيانات.</p><button onClick={refresh}>إعادة المحاولة</button></div> : <div className="admin-offers-grid">{rows.map(current => {
      const offer = offerDefinition(current);
      if (!offer) return null;
      const enabled = current?.enabled === true;
      const allowed = role === 'owner' || role === 'manager';
      return <article className={`admin-offer${!offer.image && !offer.imageUrl ? " admin-offer-text" : ""}`} key={offer.code}>
        <OfferPoster image={offer.image} imageUrl={offer.imageUrl} alt={offerTitle(offer)} />
        <div><span className={enabled ? 'offer-enabled' : 'offer-disabled'}>{enabled ? 'مفعّل · ظاهر للزبائن' : 'معطّل · مخفي'}</span><h3>{offerTitle(offer)}</h3><p>{offerDetails(offer)}</p><p>{offerAvailability(offer)}</p><p>{offerSchedule(offer)}</p>
          {offer.displayOnly && <p><strong>للعرض فقط — لا يغيّر حساب السلة.</strong></p>}
          <div className="admin-offer-actions">
            <button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled ? 'تعطيل' : 'تفعيل'} ${offerTitle(offer)}`} disabled={!!busy || !!editor || !allowed || !current} onClick={() => toggle(offer, current)}>{busy === offer.code ? 'جارٍ الحفظ…' : enabled ? 'تعطيل وإخفاء' : 'تفعيل وإظهار'}</button>
            {allowed && <button type="button" className="secondary" disabled={!!busy || !!editor || !setupReady} onClick={() => setEditor(current)}>تعديل العرض والمواعيد</button>}
            {allowed && <button type="button" className="admin-offer-delete" disabled={!!busy || !!editor || !setupReady} onClick={() => removeOffer(offer, current)} aria-label={`حذف عرض ${offerTitle(offer)}`}>
              <DeleteOutlineIcon aria-hidden="true" />{busy === `delete:${offer.code}` ? 'جارٍ الحذف…' : 'حذف العرض'}
            </button>}
          </div>
          {!allowed && <small>{'للمدير والمالك فقط'}</small>}
          {!current && <small>إعدادات هذا العرض غير متاحة.</small>}
        </div>
      </article>;
    })}{!rows.length && <p role="status">لا توجد عروض حاليًا. يمكنك إضافة عرض جديد.</p>}</div>}
  </section>;
}
