import './Hours.css';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Hours() {
  const { t } = useLanguage();
  return (<section className="section hours-section" id="hours" aria-labelledby="hours-title">
<div className="section-heading"><div><span className="eyebrow">{t("خطّط لوقفتك الحلوة")}</span><h2 id="hours-title">{t("أوقات الدوام")} <span aria-hidden="true">{t("✳")}</span></h2></div><p>{t("أوقات الدوام في فروعنا الثلاثة.")}</p></div>
<div className="hours-grid">
<img src="/assets/hours/ramallah-tireh.png" width="1024" height="1536" loading="lazy" decoding="async" alt={t("رام الله، الطيرة: أيام الأسبوع من 7:30 صباحًا حتى منتصف الليل. الجمعة من 9 صباحًا حتى منتصف الليل.")} />
<img src="/assets/hours/nablus.png" width="1024" height="1536" loading="lazy" decoding="async" alt={t("نابلس: أيام الأسبوع من 11 صباحًا حتى منتصف الليل. نهاية الأسبوع من 11 صباحًا حتى 1 صباحًا.")} />
<img src="/assets/hours/icon-mall.png" width="1024" height="1536" loading="lazy" decoding="async" alt={t("ايكون مول: أيام الأسبوع من 10 صباحًا حتى 11 مساءً. نهاية الأسبوع من 10 صباحًا حتى منتصف الليل.")} />
</div>
</section>);
}
