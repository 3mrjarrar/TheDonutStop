import { Route, Routes } from 'react-router';
import { LanguageProvider } from '../i18n/LanguageContext';
import MainLayout from './MainLayout';
import Home from '../pages/Home/Home';
import Menu from '../pages/Menu/Menu';
import NotFound from '../pages/NotFound/NotFound';
export default function App() {
  return <LanguageProvider><Routes><Route element={<MainLayout />}><Route index element={<Home />} /><Route path="menu" element={<Menu />} /><Route path="*" element={<NotFound />} /></Route></Routes></LanguageProvider>;
}
