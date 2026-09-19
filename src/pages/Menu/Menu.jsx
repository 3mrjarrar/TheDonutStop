import { useLanguage } from '../../i18n/LanguageContext';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import BranchMenu from '../../components/menu/BranchMenu';
export default function Menu() {
  const { t } = useLanguage();
  return <section className="section menu-section" aria-labelledby="menu-title">
    <Breadcrumbs current={t('المنيو')} />
    <div className="section-heading"><div><span className="eyebrow">{t('كل شي بتحبّه بمكان واحد')}</span><h1 id="menu-title">{t('المنيو')} <svg className="menu-title-donut" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="33" r="27" fill="#efbf78" />
      <path d="M32 7C17 7 6 18 6 32c0 5 5 5 7 9 2 5 5 2 9 6 4 4 7 0 12 3 4 3 7-3 12-3 5 0 5-6 9-9 4-3 3-7 2-12C54 14 44 7 32 7Z" fill="#e9819a" />
      <ellipse cx="32" cy="33" rx="10" ry="11" fill="#d69b58" />
      <circle cx="32" cy="31" r="9" fill="var(--cream, #fff9ee)" />
      <g fill="none" strokeLinecap="round" strokeWidth="3">
        <path d="m21 16 4 2m19 19 4 2M20 39l-3 3" stroke="#fff9ee" />
        <path d="m38 15 2 4m-9 25 4 2M13 27l4-1" stroke="#ffdb84" />
        <path d="m47 24 3 3M25 49l-3 2" stroke="#196e73" />
      </g>
    </svg></h1></div><p>{t('اختار فئتك وتصفّح الأصناف والأسعار.')}</p></div>
    <BranchMenu />
  </section>;
}
