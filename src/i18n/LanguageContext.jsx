import { createContext, useContext, useEffect, useState } from 'react';
import { englishTranslations } from './translations';
const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  useEffect(() => {
    try { if (localStorage.getItem('donut-stop-language') === 'en') setLanguage('en'); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  const toggleLanguage = () => setLanguage(current => {
    const next = current === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('donut-stop-language', next); } catch {}
    return next;
  });
  const t = text => language === 'en' ? englishTranslations[text] || text : text;
  return <LanguageContext.Provider value={{ language, toggleLanguage, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
