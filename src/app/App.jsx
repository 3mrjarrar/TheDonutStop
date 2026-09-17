import { LanguageProvider } from '../i18n/LanguageContext';
import { CartProvider } from '../components/cart/CartContext';
import { OrderTrackingProvider } from '../components/orders/OrderTrackingContext';
import AppRoutes from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <CartProvider><OrderTrackingProvider><AppRoutes /></OrderTrackingProvider></CartProvider>
    </LanguageProvider>
  );
}
