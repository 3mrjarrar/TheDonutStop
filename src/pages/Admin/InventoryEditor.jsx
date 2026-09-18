import { useState } from 'react';
import { inventoryPrice } from './inventory';

export default function InventoryEditor({ edit, busy, onSave, onCancel }) {
  const [amount, setAmount] = useState(edit.action === 'count' ? String(edit.row.quantity) : '');
  const quantityAction = ['restock', 'count', 'waste'].includes(edit.action);
  const priceAction = edit.action === 'price';
  const needsReason = priceAction || edit.row.stock_initialized !== false || edit.row.product_variants.products.category !== 'donuts';
  const value = Number(amount);
  const after = edit.action === 'restock' ? edit.row.quantity + value : edit.action === 'waste' ? edit.row.quantity - value : value;
  return <form className="admin-stock-editor" onSubmit={onSave}>
    <fieldset disabled={busy}>
      <strong>{({ price: 'تعديل السعر', restock: 'إضافة دفعة جديدة', count: 'تصحيح الكمية المسجّلة', waste: 'تسجيل تالف', available: 'إعادة إتاحة البيع', unavailable: 'إيقاف البيع' })[edit.action]}</strong>
      {priceAction && <>
        <p>{edit.row.product_variants.products.name} {edit.row.product_variants.size !== 'standard' && `(${edit.row.product_variants.size})`} — السعر الحالي: {inventoryPrice(edit.row).toFixed(2)} ₪</p>
        <label>السعر الجديد بالشيكل<input name="price" type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" defaultValue={inventoryPrice(edit.row)} required /></label>
        <small>يُطبّق على هذا الصنف والحجم في الفرع المختار فقط.</small>
      </>}
      {quantityAction && <>
        <label>{edit.action === 'count' ? 'الكمية الصحيحة المتبقية' : edit.action === 'waste' ? 'عدد الحبات التالفة' : 'عدد الحبات المضافة'}<input name="amount" type="number" inputMode="numeric" min={edit.action === 'count' ? 0 : 1} max={edit.action === 'waste' ? Math.min(edit.row.quantity, 1000000) : 1000000} step="1" value={amount} onChange={event => setAmount(event.target.value)} required /></label>
        {edit.action === 'restock' && <div className="admin-stock-presets">{[6, 12, 24].map(number => <button type="button" className="secondary" key={number} onClick={() => setAmount(String(Number(amount) + number))}>+{number}</button>)}</div>}
        {amount !== '' && Number.isInteger(value) && value >= 0 && <p className="admin-stock-preview">بعد الحفظ: <strong>{after} حبة</strong></p>}
      </>}
      {needsReason && <label>سبب التعديل<input name="reason" minLength={2} maxLength={500} required placeholder={priceAction ? 'مثال: تحديث قائمة الأسعار' : 'مثال: خطأ في العد، أو حبات تالفة'} /><small>{priceAction ? 'وضّح سبب تغيير السعر.' : edit.row.product_variants.products.category === 'donuts' ? 'بعد أول إضافة، يجب توضيح سبب كل تغيير، بما فيه إضافة دفعة جديدة.' : 'وضّح سبب تغيير حالة توفر المشروب.'}</small></label>}
      <div className="admin-stock-actions"><button>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button><button type="button" className="secondary" onClick={onCancel}>إلغاء</button></div>
    </fieldset>
  </form>;
}
