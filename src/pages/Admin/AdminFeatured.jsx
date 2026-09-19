import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { menu } from '../../components/menu/menuData';
import { validFeatured } from '../../lib/featuredProducts';

export default function AdminFeatured({ role }) {
  const [saved, setSaved] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const saving = useRef(false);
  const allowed = role === 'owner' || role === 'manager';
  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setSaved(null);
    async function load() {
      try {
        const { data, error: problem } = await supabase.from('homepage_featured').select('*').eq('id', 1).single();
        if (problem || !validFeatured(data?.photos)) throw problem || new Error();
        if (live) { setSaved(data); setPhotos(data.photos); }
      } catch { if (live) setError('تعذّر تحميل اختيارات الصفحة الرئيسية. تحقق من الاتصال وتطبيق تحديث قاعدة البيانات.'); }
      finally { if (live) setLoading(false); }
    }
    load();
    return () => { live = false; };
  }, [reload]);
  async function save(event) {
    event.preventDefault();
    if (saving.current || !allowed || !saved || !validFeatured(photos)) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: problem } = await supabase.rpc('set_homepage_featured', { p_photos: photos, p_expected_revision: saved.revision });
      if (problem) throw problem;
      setSaved({ photos: [...photos], revision: data });
      setMessage('تم حفظ الأصناف الأربعة وترتيبها في الصفحة الرئيسية.');
      window.dispatchEvent(new Event('donut-featured-changed'));
    } catch (problem) {
      setError(problem.code === '40001' ? 'عدّل مستخدم آخر الاختيارات. اضغط إعادة التحميل لمراجعتها قبل الحفظ.' : 'تعذّر تأكيد الحفظ. أعد تحميل الاختيارات للتحقق قبل المحاولة مجددًا.');
      setSaved(null);
    } finally { saving.current = false; setBusy(false); }
  }
  const changed = saved && JSON.stringify(photos) !== JSON.stringify(saved.photos);
  return <section className="admin-panel">
    <div className="admin-toolbar"><h2>اختيارات الصفحة الرئيسية</h2><a href="/#favorites" target="_blank" rel="noreferrer">معاينة في الموقع ↗</a></div>
    <p>اختر أربعة أصناف مختلفة. ترتيب البطاقات من اليمين إلى اليسار في الموقع العربي، ومن اليسار إلى اليمين في الإنجليزي. تظهر الصورة والوصف والسعر الأساسي للصنف تلقائيًا.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
    {loading ? <p role="status">جارٍ تحميل الاختيارات…</p> : <form onSubmit={save}>
      <div className="admin-featured-grid">{photos.map((photo, index) => <label className="admin-featured-card" key={index}>
        <span>الصنف {index + 1}</span>
        <img src={`/assets/donuts/${photo}`} alt="" />
        <select value={photo} disabled={!allowed || busy || !saved} onChange={event => { setPhotos(current => current.map((value, slot) => slot === index ? event.target.value : value)); setMessage(''); }}>
          {menu.donuts.map(([name, price, image]) => <option key={image} value={image}>{name} — {price} ₪</option>)}
        </select>
      </label>)}</div>
      {photos.length > 0 && !validFeatured(photos) && <p role="alert">اختر أربعة أصناف مختلفة دون تكرار.</p>}
      <div className="admin-featured-actions"><button disabled={!allowed || busy || !changed || !validFeatured(photos)}>{busy ? 'جارٍ الحفظ…' : 'حفظ الاختيارات'}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setMessage(''); setReload(value => value + 1); }}>إعادة التحميل</button></div>
      {!allowed && <p>تعديل الاختيارات متاح للمدير والمالك فقط.</p>}
    </form>}
  </section>;
}
