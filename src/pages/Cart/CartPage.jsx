import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '../../components/cart/CartContext';
import Cart from '../../components/cart/Cart';
import EmptyCart from '../../components/cart/EmptyCart';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import { useLanguage } from '../../i18n/LanguageContext';
import { getBranchMenu } from '../../lib/supabase';
import '../../components/menu/menu.css';

export default function CartPage() {
  const { cart, setCart, branch, locked, setLocked } = useCart();
  const { language } = useLanguage();
  const en = language === 'en';
  const [rows, setRows] = useState([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!branch) return;
    let cancelled = false;
    const refresh = () => getBranchMenu(branch.id).then(data => { if (!cancelled) { setRows(data); setError(false); } }).catch(() => { if (!cancelled) { setRows([]); setError(true); } });
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [branch, revision]);
  return <section className="section cart-page">
    <Breadcrumbs current={en ? 'Cart' : 'السلة'} />
    <div className="section-heading"><div><span className="cart-page-eyebrow">{en ? "YOUR SWEET PICKS" : "اختياراتك الحلوة"}</span><h1>{en ? 'Your cart' : 'سلة الطلب'}</h1><p className="cart-page-intro">{en ? 'Every sweet moment starts with a donut.' : 'كل لحظة حلوة، بتبدأ بحبة دونات.'}</p></div><Link className="tab" to={branch ? `/menu?branch=${branch.code}` : '/menu'}>{en ? 'Continue shopping' : 'متابعة التسوق'}</Link></div>
    {error && <p role="alert">{en ? 'Unable to refresh availability. Please try again.' : 'تعذّر تحديث التوفر. يرجى المحاولة مجددًا.'} <button className="tab" onClick={() => setRevision(value => value + 1)}>{en ? 'Retry' : 'إعادة المحاولة'}</button></p>}
    {branch ? <Cart branch={branch} cart={cart} setCart={setCart} rows={rows} en={en} locked={locked} setLocked={setLocked} refresh={() => setRevision(value => value + 1)} /> : <div className="cart-panel cart-panel-empty"><EmptyCart en={en} /></div>}
  </section>;
}
