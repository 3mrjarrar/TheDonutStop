import './Marquee.css';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Marquee() {
  const { t } = useLanguage();
  return (<div className="marquee" aria-hidden="true"><span>{t("THE DONUT STOP ✦ لحظات أحلى ✦ DONUTS & COFFEE ✦ THE DONUT STOP ✦ لحظات أحلى ✦ DONUTS & COFFEE ✦")}</span></div>);
}
