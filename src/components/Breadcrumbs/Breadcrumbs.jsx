import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import './breadcrumbs.css';
export default function Breadcrumbs({ current }) {
  const { language } = useLanguage();
  return <nav className="breadcrumbs" aria-label={language === 'ar' ? 'مسار التنقل' : 'Breadcrumb'}><ol><li><Link to="/">{language === 'ar' ? 'الرئيسية' : 'Home'}</Link></li><li aria-hidden="true">{language === 'ar' ? '‹' : '›'}</li><li aria-current="page">{current}</li></ol></nav>;
}
