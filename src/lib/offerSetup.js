export const dynamicOfferSetupMessage = 'إعداد العروض الجديدة غير مكتمل. شغّل ملف 202609230001_dynamic_offers.sql كاملًا في محرر SQL في Supabase، ثم اضغط إعادة التحقق. ملف رفع الصور وحده لا يكفي.';

export function hasDynamicOfferSetup(rows) {
  return rows.length > 0 && rows.every(row => ['buy_quantity', 'free_quantity', 'custom', 'weekdays', 'image_url', 'start_time', 'end_time', 'starts_on', 'ends_on'].every(key => Object.hasOwn(row, key)));
}

export function offerSaveError(problem) {
  if (['42703', '42883', 'PGRST202', 'PGRST204'].includes(problem?.code)) return dynamicOfferSetupMessage;
  if (problem?.code === '40001') return 'تغيّر العرض أثناء التعديل. ألغِ التعديل وافتحه مجددًا لتحميل آخر نسخة.';
  if (problem?.code === '42501') return 'ليس لديك صلاحية حفظ العرض. سجّل الدخول بحساب مالك أو مدير.';
  if (['23514', '22P02', '22007', '22008'].includes(problem?.code)) return 'بيانات العرض غير صالحة. راجع الكميات والأيام والتواريخ والأوقات.';
  return `تعذّر تأكيد حفظ العرض. راجع قائمة العروض قبل إعادة المحاولة.${problem?.code ? ` رمز الخطأ: ${problem.code}` : ' تحقق من الاتصال.'}`;
}
