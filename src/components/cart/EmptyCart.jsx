import { Link } from 'react-router';
import { useOrderTracking } from '../orders/OrderTrackingContext';

export default function EmptyCart({ en, branch }) {
  const { orders } = useOrderTracking();
  const active = orders.some(order => !['completed', 'cancelled'].includes(order.status));
  return <div className="cart-empty">
    <div className="cart-empty-art" aria-hidden="true"><img src="/assets/donuts/19-strawberry-filling.png" alt="" /><span className="cart-empty-spark">✦</span></div>
    <div className="cart-empty-copy"><span className="cart-empty-eyebrow">{en ? 'A BOX FULL OF HAPPY' : 'علبة مليانة سعادة'}</span>
      <h2>{active ? (en ? 'Your sweet order is on its way!' : 'طلبك الحلو صار عندنا!') : (en ? 'A little sweetness is missing' : 'ناقصها شوية حلاوة')}</h2>
      <p>{active ? (en ? 'Follow your order above. There’s always room for another sweet moment.' : 'تابع حالة طلبك بالأعلى، وإذا نفسك بحلا زيادة… المنيو بانتظارك.') : (en ? 'Your cart is empty. Pick your favorite donuts and make your day a little sweeter.' : 'سلتك لسه فاضية. اختار الدونات اللي بتحبها وخلّي يومك أحلى.')}</p>
      <Link className="button button-dark" to={branch ? `/menu?branch=${branch.code}` : '/menu'}>{en ? 'Explore the menu' : 'اختار حلاوتك من المنيو'}<span aria-hidden="true">{en ? '→' : '←'}</span></Link>
    </div>
  </div>;
}
