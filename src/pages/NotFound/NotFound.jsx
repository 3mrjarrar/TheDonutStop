import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
export default function NotFound() {
  const { language } = useLanguage();
  return <section className="section"><h1>404</h1><p>{language === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}</p><Link to="/">{language === 'ar' ? 'الرئيسية' : 'Home'}</Link></section>;
}
