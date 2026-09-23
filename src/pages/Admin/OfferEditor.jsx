import { useEffect, useRef, useState } from 'react';
import { validateOfferImage } from '../../lib/offerImageUpload';
import { offerDays, offerDefinition, offerTitle, offerSchedule } from '../../lib/offerCatalog';
import OfferPoster from '../../components/Offers/OfferPoster';

export default function OfferEditor({ current, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    buy_quantity: current?.buy_quantity ?? 6, free_quantity: current?.free_quantity ?? 2,
    weekdays: current?.weekdays || [1,2,3,4,5,6,7],
    start_time: current?.start_time?.slice(0,5) || '', end_time: current?.end_time?.slice(0,5) || '',
    starts_on: current?.starts_on || '', ends_on: current?.ends_on || '', image_url: current?.image_url || '',
  });
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInput = useRef(null);
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validateOfferImage(file);
      setImageFile(file); setError('');
    } catch (problem) {
      event.target.value = '';
      setImageFile(null); setError(problem.message);
    }
  }
  const update = (name, value) => setDraft(previous => ({ ...previous, [name]: value }));
  const preview = offerDefinition({ ...current, ...draft, code: current?.code || 'preview' });
  function submit(event) {
    event.preventDefault();
    if (!draft.weekdays.length) return setError('اختر يومًا واحدًا على الأقل.');
    if (!!draft.start_time !== !!draft.end_time || (draft.start_time && draft.start_time === draft.end_time)) return setError('اختر وقت بداية ونهاية مختلفين، أو اتركهما فارغين لعرض طوال اليوم.');
    if (draft.starts_on && draft.ends_on && draft.starts_on > draft.ends_on) return setError('يجب ألا يسبق تاريخ النهاية تاريخ البداية.');
    if (Number(draft.buy_quantity) + Number(draft.free_quantity) > 99) return setError('الحد الأعلى للمجموعة هو 99 حبة.');
    setError('');
    onSave({ ...draft, buy_quantity: current?.code === 'morning' ? null : Number(draft.buy_quantity), free_quantity: current?.code === 'morning' ? null : Number(draft.free_quantity) }, imageFile);
  }
  return <form className="admin-offer-editor" onSubmit={submit}>
    <h3>{current ? 'تعديل العرض ومواعيده' : 'إضافة عرض جديد'}</h3>
    <p>إذا كانت النهاية قبل البداية، يستمر العرض حتى اليوم التالي. العرض الجديد يُحفظ مخفيًا حتى تفعّله.</p>
    <fieldset disabled={busy}>
      {current?.code !== 'morning' && <div className="admin-offer-fields">
        <label>عدد الحبات المدفوعة<input type="number" min="1" max="98" step="1" required disabled={current && !current.custom} value={draft.buy_quantity} onChange={event => update('buy_quantity', event.target.value)} /></label>
        <label>عدد الحبات المجانية<input type="number" min="1" max="98" step="1" required disabled={current && !current.custom} value={draft.free_quantity} onChange={event => update('free_quantity', event.target.value)} /></label>
      </div>}
      <fieldset className="admin-offer-days"><legend>أيام توفر العرض</legend>{offerDays.map(([, label], index) => <label key={label}><input type="checkbox" checked={draft.weekdays.includes(index + 1)} onChange={event => update('weekdays', event.target.checked ? [...draft.weekdays, index + 1].sort((a,b)=>a-b) : draft.weekdays.filter(day => day !== index + 1))} />{label}</label>)}</fieldset>
      <div className="admin-offer-fields">
        <label>من الساعة (اختياري)<input type="time" value={draft.start_time} onChange={event => update('start_time', event.target.value)} /></label>
        <label>حتى الساعة (اختياري)<input type="time" value={draft.end_time} onChange={event => update('end_time', event.target.value)} /></label>
        <label>تاريخ البداية (اختياري)<input type="date" value={draft.starts_on} onChange={event => update('starts_on', event.target.value)} /></label>
        <label>تاريخ النهاية (اختياري)<input type="date" min={draft.starts_on || undefined} value={draft.ends_on} onChange={event => update('ends_on', event.target.value)} /></label>
      </div>
      <label>صورة العرض من الجهاز (اختياري)<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} /><small>JPG، PNG، WebP أو GIF — حتى 5 ميغابايت. يمكنك حفظ العرض بدون صورة.</small></label>
      {(imageFile || draft.image_url) && <button type="button" className="secondary" onClick={() => { setImageFile(null); update('image_url', ''); fileInput.current.value = ''; }}>إزالة الصورة</button>}
      <div className="admin-offer-preview"><strong>{offerTitle(preview)}</strong><p>{offerSchedule(preview)}</p>{(imagePreview || draft.image_url) && <OfferPoster imageUrl={imagePreview || draft.image_url} alt={offerTitle(preview)} />}</div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-order-actions"><button type="submit">{busy ? 'جارٍ الحفظ…' : current ? 'حفظ التعديلات' : 'حفظ العرض'}</button><button type="button" className="secondary" onClick={onCancel}>إلغاء</button></div>
    </fieldset>
  </form>;
}
