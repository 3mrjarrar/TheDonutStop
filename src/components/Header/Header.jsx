import './Header.css';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Header() {
  const { t, language, toggleLanguage } = useLanguage();
  return (<header className="site-header">
<Link className="brand" aria-label={t("ذا دونات ستوب - الرئيسية")} to="/#top"><img src="/assets/logo.jpg" alt={t("شعار ذا دونات ستوب")} /><span>{t("THE DONUT STOP")}</span></Link>
<nav aria-label={t("القائمة الرئيسية")}><Link to="/#favorites">{t("المفضّلة")}</Link><Link to="/menu">{t("المنيو")}</Link><Link to="/#offers">{t("العروض")}</Link></nav>
<div className="header-actions"><button className="language-switch" type="button" onClick={toggleLanguage} lang={language === "ar" ? "en" : "ar"} aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}>{language === "ar" ? "English" : "العربية"}</button><Link className="header-cta" to="/menu">{t("شوف المنيو")} <span aria-hidden="true">{t("↗")}</span></Link></div>
</header>);
}
