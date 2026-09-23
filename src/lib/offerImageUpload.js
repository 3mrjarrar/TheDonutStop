export const offerImageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const offerImageMaxBytes = 5 * 1024 * 1024;

export function offerUploadError(problem) {
  const details = `${problem?.code || ''} ${problem?.error || ''} ${problem?.message || ''}`;
  if (/NoSuchBucket|bucket.*not found/i.test(details)) return 'مساحة صور العروض غير مهيأة. طبّق ملف 202609230002_offer_image_uploads.sql في محرر SQL في Supabase، ثم أعد الحفظ. اختياراتك محفوظة هنا.';
  if (/row.level security|unauthorized|permission|access denied|jwt|token.*expired/i.test(details) || ['401','403'].includes(String(problem?.statusCode))) return 'لا توجد صلاحية لرفع الصورة. أعد تسجيل الدخول بحساب مالك أو مدير، وتحقق من تطبيق إعدادات تخزين صور العروض.';
  if (/mime|content.type|invalid.*type/i.test(details)) return 'صيغة الصورة غير مدعومة. اختر JPG أو PNG أو WebP أو GIF.';
  if (/too large|size|payload/i.test(details) || String(problem?.statusCode) === '413') return 'حجم الصورة أكبر من المسموح. اختر صورة لا تتجاوز 5 ميغابايت.';
  return 'تعذّر رفع الصورة. تحقق من الاتصال ثم أعد المحاولة. لم يتم حفظ العرض، واختياراتك محفوظة هنا.';
}

export function validateOfferImage(file) {
  if (!file || !offerImageTypes[file.type]) throw new Error('اختر صورة بصيغة JPG أو PNG أو WebP أو GIF.');
  if (!file.size || file.size > offerImageMaxBytes) throw new Error('يجب ألا يتجاوز حجم الصورة 5 ميغابايت وألا تكون فارغة.');
}

export async function uploadOfferImage(client, file) {
  validateOfferImage(file);
  const path = `${crypto.randomUUID()}.${offerImageTypes[file.type]}`;
  const bucket = client.storage.from('offer-images');
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}
