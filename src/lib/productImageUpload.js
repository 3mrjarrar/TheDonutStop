const imageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const maxBytes = 5 * 1024 * 1024;

export function validateProductImage(file) {
  if (!file || !imageTypes[file.type]) throw new Error('اختر صورة بصيغة JPG أو PNG أو WebP أو GIF.');
  if (!file.size || file.size > maxBytes) throw new Error('يجب ألا يتجاوز حجم الصورة 5 ميغابايت وألا تكون فارغة.');
}

export async function uploadProductImage(client, file) {
  validateProductImage(file);
  const path = `${crypto.randomUUID()}.${imageTypes[file.type]}`;
  const bucket = client.storage.from('product-images');
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) {
    const details = `${error.code || ''} ${error.message || ''}`;
    if (/NoSuchBucket|bucket.*not found/i.test(details)) throw new Error('تخزين صور المنتجات غير مهيأ. طبّق ملف 202609230004_admin_add_products.sql في Supabase ثم أعد المحاولة.');
    if (/row.level security|unauthorized|permission|access denied|jwt|token.*expired/i.test(details)) throw new Error('لا توجد صلاحية لرفع الصورة. سجّل الدخول بحساب مالك أو مدير وتحقق من إعداد تخزين صور المنتجات.');
    throw new Error('تعذّر رفع الصورة. تحقق من الاتصال وحاول مجددًا.');
  }
  return bucket.getPublicUrl(path).data.publicUrl;
}
