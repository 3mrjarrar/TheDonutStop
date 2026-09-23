import { useState } from 'react';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../../lib/productImageUpload';

const unwrap = ({ data, error }) => { if (error) throw error; return data; };

export default function AddProduct({ category, subgroup, title, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get('image');
    setBusy(true); setError('');
    try {
      const imagePath = await uploadProductImage(supabase, image);
      unwrap(await supabase.rpc('create_catalog_product', {
        p_name: String(data.get('name')).trim(),
        p_category: category,
        p_subgroup: subgroup,
        p_description_ar: String(data.get('description_ar')).trim(),
        p_description_en: String(data.get('description_en')).trim(),
        p_image_path: imagePath,
        p_price: Number(data.get('price')),
      }));
      form.reset(); setPreview(''); setOpen(false); onSaved();
    } catch (problem) {
      if (problem.code === '42501') setError('هذا الحساب لا يملك صلاحية إضافة المنتجات.');
      else if (problem.code === '22023') setError('تحقق من اسم المنتج والسعر، ثم أعد المحاولة.');
      else if (/create_catalog_product|function.*not found|schema cache/i.test(problem.message || '')) setError('قاعدة البيانات تحتاج إلى الإعداد. طبّق ملف 202609230004_admin_add_products.sql في Supabase ثم أعد المحاولة.');
      else setError(problem.message || 'تعذّر حفظ المنتج. تحقق من الاتصال ثم حاول مجددًا.');
    } finally { setBusy(false); }
  }

  function close() {
    if (busy) return;
    setOpen(false); setError(''); setPreview('');
  }

  return <>
    <button type="button" className="admin-add-product-tile" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <AddCircleOutlineIcon aria-hidden="true" />
      <span>إضافة منتج جديد · {title}</span>
      <small>أضف صورة واسمًا وسعرًا ليظهر الصنف في القائمة</small>
    </button>
    {open && <form className="admin-add-product-form" onSubmit={submit}>
      <div className="admin-add-product-heading"><div><h3>منتج جديد — {title}</h3><p>سيظهر المنتج في قائمة الطعام بعد الحفظ.</p></div><button type="button" className="secondary admin-add-product-close" disabled={busy} aria-label="إغلاق النموذج" onClick={close}><CloseIcon /></button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <label>اسم المنتج<input name="name" required minLength={2} maxLength={100} autoComplete="off" placeholder="مثال: دونات الفستق" /></label>
      <div className="admin-add-product-fields">
        <label>الوصف بالعربية<input name="description_ar" required maxLength={500} placeholder="وصف قصير للمنتج" /></label>
        <label>الوصف بالإنجليزية<input name="description_en" required maxLength={500} dir="ltr" placeholder="A short product description" /></label>
        <label>السعر (₪)<input name="price" required type="number" inputMode="decimal" min="0" max="9999.99" step="0.01" placeholder="0.00" dir="ltr" /></label>
      </div>
      <label className="admin-product-upload"><span><AddPhotoAlternateOutlinedIcon /> صورة المنتج (JPG, PNG, WebP أو GIF — حتى 5 MB)</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required onChange={event => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')} /></label>
      {preview && <img className="admin-product-upload-preview" src={preview} alt="معاينة صورة المنتج" />}
      <div className="admin-add-product-actions"><button type="submit" disabled={busy}>{busy ? 'جارٍ إضافة المنتج…' : 'إضافة إلى قائمة الطعام'}</button><button type="button" className="secondary" disabled={busy} onClick={close}>إلغاء</button></div>
    </form>}
  </>;
}
