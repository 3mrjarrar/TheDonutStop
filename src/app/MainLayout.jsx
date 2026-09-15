import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useLanguage } from '../i18n/LanguageContext';
export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const menu = location.pathname.replace(/\/$/, '') === '/menu';
  const missing = !['/', '/menu', '/menu/'].includes(location.pathname);
  useEffect(() => {
    if (location.hash === '#menu') { navigate('/menu', { replace: true }); return; }
    const frame = requestAnimationFrame(() => {
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : document.getElementById('top');
      target?.scrollIntoView({ block: 'start' });
      if (!location.hash) document.getElementById('top')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, navigate]);
  return <>
    <title>{missing ? '404 | The Donut Stop' : menu ? `${t('المنيو')} | The Donut Stop` : t('The Donut Stop | ذا دونات ستوب')}</title>
    <meta name="description" content={menu ? t('اختار فئتك وتصفّح الأصناف والأسعار.') : t('ذا دونات ستوب — دونات ومشروبات لكل لحظة حلوة.')} />
    {missing && <meta name="robots" content="noindex" />}
    <a className="skip-link" href="#top">{language === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
    <Header /><main id="top" tabIndex={-1}><Outlet /></main><Footer />
  </>;
}
