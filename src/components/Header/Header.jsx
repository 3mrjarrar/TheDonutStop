import './Header.css';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useCart } from '../cart/CartContext';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import useStaffAccess from './useStaffAccess';

export default function Header() {
  const { t, language, toggleLanguage } = useLanguage();
  const { count } = useCart();
  const staff = useStaffAccess();
  return (<header className="site-header">
<Link className="brand" aria-label={t("ذا دونات ستوب - الرئيسية")} to="/#top"><img src="/assets/logo.jpg" alt={t("شعار ذا دونات ستوب")} /><span>{t("THE DONUT STOP")}</span></Link>
<nav aria-label={t("القائمة الرئيسية")}><Link to="/#top">{t("الرئيسية")}</Link><Link to="/#favorites">{t("المفضّلة")}</Link><Link to="/menu">{t("المنيو")}</Link><Link to="/#offers">{t("العروض")}</Link></nav>
<div className="header-actions"><Link className="staff-link" to="/admin"><BadgeOutlinedIcon /><span>{staff ? (language === 'en' ? 'Admin dashboard' : 'لوحة الإدارة') : (language === 'en' ? 'Staff login' : 'دخول الموظفين')}</span></Link><Link className="cart-link" to="/cart" aria-label={`${language === "en" ? "Cart" : "السلة"} (${count})`}><ShoppingCartOutlinedIcon />{count > 0 && <span className="cart-badge" aria-hidden="true">{count}</span>}</Link><span className="sr-only" role="status">{count > 0 ? `${language === "en" ? "Products in cart" : "المنتجات في السلة"}: ${count}` : ""}</span><button className="language-switch" type="button" onClick={toggleLanguage} lang={language === "ar" ? "en" : "ar"} aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}>{language === "ar" ? "English" : "العربية"}</button></div>
</header>);
}
