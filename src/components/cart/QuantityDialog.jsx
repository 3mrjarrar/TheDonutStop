import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import './cart.css';

export default function QuantityDialog({ item, max, en, onClose, onAdd }) {
  const dialog = useRef(null);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="quantity-dialog" aria-labelledby="quantity-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); if (Number.isInteger(quantity) && quantity > 0 && quantity <= max) onAdd(quantity); }}>
      <button type="button" className="dialog-close" aria-label={en ? 'Close' : 'إغلاق'} onClick={onClose}><CloseIcon /></button>
      <h2 id="quantity-title">{en ? 'How many would you like?' : 'كم حبة تريد إضافتها؟'}</h2>
      <p>{item.name}{item.size !== 'standard' && ` (${item.size})`}</p>
      <div className="quantity-controls">
        <button type="button" aria-label={en ? 'Decrease quantity' : 'تقليل الكمية'} disabled={quantity <= 1} onClick={() => setQuantity(value => value - 1)}><RemoveIcon /></button>
        <input autoFocus type="number" aria-label={en ? 'Quantity' : 'الكمية'} min="1" max={max} step="1" required value={quantity} onChange={event => setQuantity(event.target.value === '' ? '' : Number(event.target.value))} />
        <button type="button" aria-label={en ? 'Increase quantity' : 'زيادة الكمية'} disabled={quantity >= max} onClick={() => setQuantity(value => Number(value) + 1)}><AddIcon /></button>
      </div>
      <button className="tab active quantity-confirm" disabled={!Number.isInteger(quantity) || quantity < 1 || quantity > max}>{en ? 'Add to cart' : 'أضف للسلة'}</button>
    </form>
  </dialog>;
}
