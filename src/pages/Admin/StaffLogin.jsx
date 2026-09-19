import { useState } from 'react';
import { Link } from 'react-router';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useLanguage } from '../../i18n/LanguageContext';
import './StaffLogin.css';

export default function StaffLogin({ ready, recovery, busy, error, message, configured, onLogin, onReset, onChangePassword }) {
  const { language, toggleLanguage } = useLanguage();
  const en = language === 'en';
  const [visible, setVisible] = useState(false);
  const copy = (ar, english) => en ? english : ar;
  return <div className="staff-page" dir={en ? 'ltr' : 'rtl'}>
    <title>{`${copy('دخول الموظفين', 'Staff login')} | The Donut Stop`}</title>
    <meta name="robots" content="noindex,nofollow" />
    <header className="staff-topbar">
      <Link className="brand" to="/" aria-label={copy('ذا دونات ستوب - الرئيسية', 'The Donut Stop — Home')}><img src="/assets/logo.jpg" alt="" /><span>THE DONUT STOP</span></Link>
      <div><Link className="staff-back" to="/">{copy('العودة للمتجر', 'Back to store')}</Link><button className="language-switch" onClick={toggleLanguage} lang={en ? 'ar' : 'en'}>{en ? 'العربية' : 'English'}</button></div>
    </header>
    <main className="staff-stage">
      <section className="staff-story" aria-labelledby="staff-story-title">
        <span className="staff-eyebrow">THE PEOPLE BEHIND THE SWEETNESS</span>
        <h1 id="staff-story-title">{copy('وراء كل دونات،', 'Behind every donut,')}<br /><em>{copy('فريق يصنع الفرحة.', 'a little team magic.')}</em></h1>
        <p>{copy('أهلًا بالفريق اللي بيخلّي كل يوم أحلى. وقفتك الحلوة تبدأ من هون.', 'For the team that makes every day a little sweeter. Your next sweet shift starts here.')}</p>
        <div className="staff-art" aria-hidden="true"><div className="staff-art-ring" /><img className="staff-donut-main" src="/assets/donuts/36-strawberry-jam-cream.png?v=transparent-2" alt="" /><img className="staff-donut-small" src="/assets/donuts/01-original-glaze.png?v=transparent-2" alt="" /><span className="staff-sticker">MADE WITH<br />LOVE ♡</span><span className="staff-spark">✦</span></div>
        <span className="staff-story-note">{copy('شوية سكر. كتير شغف.', 'A little sugar. A lot of heart.')}</span>
      </section>
      <section className="staff-card" aria-labelledby="staff-form-title">
        <span className="staff-lock"><LockOutlinedIcon /></span>
        <span className="staff-eyebrow">{copy('مساحة الفريق', 'THE STAFF CORNER')}</span>
        <h2 id="staff-form-title">{recovery ? copy('بداية جديدة.', 'A fresh start.') : copy('أهلًا برجعتك.', 'Welcome back.')}</h2>
        <p className="staff-intro">{recovery ? copy('اختار كلمة مرور جديدة لحسابك.', 'Choose a new password for your account.') : copy('سجّل دخولك، وخلّينا نحلّي يوم الناس.', 'Sign in, settle in, and make someone’s day.')}</p>
        {error && <p className="staff-feedback staff-feedback-error" role="alert">{error}</p>}
        {message && <p className="staff-feedback" role="status">{message}</p>}
        {!ready ? <p role="status">{copy('جارٍ التحقق من الجلسة…', 'Checking your session…')}</p> : <form onSubmit={recovery ? onChangePassword : onLogin} aria-busy={busy}>
          {!recovery && <label className="staff-field">{copy('البريد الإلكتروني', 'Email address')}<input name="email" type="email" autoComplete="username" placeholder="you@example.com" dir="ltr" required disabled={busy} /></label>}
          <label className="staff-field" htmlFor="staff-password">{recovery ? copy('كلمة المرور الجديدة', 'New password') : copy('كلمة المرور', 'Password')}</label>
          <div className="staff-password"><input id="staff-password" name="password" type={visible ? 'text' : 'password'} autoComplete={recovery ? 'new-password' : 'current-password'} minLength={recovery ? 12 : undefined} placeholder={recovery ? copy('12 حرفًا على الأقل', 'At least 12 characters') : '••••••••'} dir="ltr" required disabled={busy} /><button type="button" aria-label={visible ? copy('إخفاء كلمة المرور', 'Hide password') : copy('إظهار كلمة المرور', 'Show password')} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}</button></div>
          {!recovery && <button type="button" className="staff-forgot" disabled={busy || !configured} onClick={onReset}>{copy('نسيت كلمة المرور؟', 'Forgot password?')}</button>}
          <button className="staff-submit" disabled={busy || !configured}>{busy ? copy('لحظة من فضلك…', 'One sweet moment…') : recovery ? copy('حفظ كلمة المرور', 'Save password') : copy('دخول لوحة الإدارة', 'Let’s get to work')}<ArrowForwardRoundedIcon aria-hidden="true" /></button>
        </form>}
        <div className="staff-card-footer"><LockOutlinedIcon /><span>{copy('للفريق فقط · استخدم حسابك المخصص من الإدارة', 'Just for the team · Use your assigned staff account')}</span></div>
      </section>
    </main>
    <footer className="staff-footer">THE DONUT STOP <span>✦</span> {copy('كل يوم أحلى معكم', 'SWEETER TOGETHER')}</footer>
  </div>;
}
