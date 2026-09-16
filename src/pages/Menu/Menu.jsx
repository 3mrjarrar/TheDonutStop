import { useLanguage } from '../../i18n/LanguageContext';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import BranchMenu from '../../components/menu/BranchMenu';
export default function Menu() {
  const { t } = useLanguage();
  return <section className="section menu-section" aria-labelledby="menu-title">
    <Breadcrumbs current={t('المنيو')} />
    <div className="section-heading"><div><span className="eyebrow">{t('كل شي بتحبّه بمكان واحد')}</span><h1 id="menu-title">{t('المنيو')} <span aria-hidden="true">✳</span></h1></div><p>{t('اختار فئتك وتصفّح الأصناف والأسعار.')}</p></div>
    <BranchMenu />
  </section>;
}
