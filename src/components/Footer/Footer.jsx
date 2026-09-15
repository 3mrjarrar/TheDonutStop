import './Footer.css';
import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return (<footer className="contact-footer" id="contact" aria-labelledby="contact-title">
<div className="contact-layout">
<div className="contact-brand">
<Link className="footer-brand" aria-label={t("ذا دونات ستوب - الرئيسية")} to="/#top"><img src="/assets/logo.jpg" alt={t("شعار ذا دونات ستوب")} /><span>{t("THE DONUT STOP")}</span></Link>
<p className="contact-tagline">{t("دونات طازجة بنكهات وأشكال متنوعة تُعد يوميًا بحب وإبداع.")}</p>
<div className="social-links" aria-label={t("تابعنا على مواقع التواصل")}>
<a href="https://www.facebook.com/TheDonutStop.Palestine" target="_blank" rel="noopener noreferrer" aria-label={t("فيسبوك — يفتح في نافذة جديدة")}>
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H8v3h2.6v8H14Z" /></svg>
</a>
<a href="https://www.instagram.com/thedonutstop.palestine/" target="_blank" rel="noopener noreferrer" aria-label={t("إنستغرام — يفتح في نافذة جديدة")}>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
</a>
</div>
</div>
<section className="contact-details" aria-labelledby="contact-title">
<span className="eyebrow">{t("خلّينا على تواصل")}</span>
<h2 id="contact-title">{t("تواصل معنا وفروعنا")}</h2>
<a className="contact-phone" href="tel:022801515">
<span className="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 3 3 5-2 2c1.2 2.6 3.4 4.8 6 6l2-2 5 3v3c0 1-1 1.5-2 1C10 20 4 14 3 5c-.1-1 .5-2 1.5-2H7Z" /></svg></span>
<span><span className="contact-label">{t("احكي معنا")}</span><bdi>{t("02-2801515")}</bdi></span>
<span className="contact-arrow" aria-hidden="true">{t("↗")}</span>
</a>
</section>
<section className="contact-locations" aria-labelledby="locations-title">
<h3 id="locations-title">{t("لاقينا قريب منك")}</h3>
<ul className="location-list">
<li><a className="location-link" href="https://maps.app.goo.gl/RvQQmULRmKSvJ8As5" target="_blank" rel="noopener noreferrer"><span className="location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span><span>{t("الطيرة، خلف سرية رام الله.")}</span></a></li>
<li><a className="location-link" href="https://maps.app.goo.gl/pF2t6QCUyPUwAabMA" target="_blank" rel="noopener noreferrer"><span className="location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span><span>{t("ايكون مول، الطابق الأرضي.")}</span></a></li>
<li><a className="location-link" href="https://maps.app.goo.gl/YCS9cMm4mrmdSMq99" target="_blank" rel="noopener noreferrer"><span className="location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span><span>{t("نابلس - شارع الأكاديمية -")} <bdi>{t("Mena Vibes")}</bdi></span></a></li>
</ul>
</section>
</div>
<div className="contact-bottom"><span>{t("©")} <span>{new Date().getFullYear()}</span> {t("The Donut Stop")}</span><Link to="/#top">{t("ارجع لفوق ↑")}</Link></div>
</footer>);
}
