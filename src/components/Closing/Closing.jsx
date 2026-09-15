import './Closing.css';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Closing() {
  const { t } = useLanguage();
  return (<section className="closing"><span className="eyebrow">{t("THE DONUT STOP")}</span><h2>{t("في كل لقمة،")}<br /><em>{t("لحظة بتستاهل.")}</em></h2><Link className="button button-light" to="/#top">{t("ارجع لفوق ↑")}</Link></section>);
}
