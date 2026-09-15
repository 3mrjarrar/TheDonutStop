import { LanguageProvider } from '../i18n/LanguageContext';
import AppRoutes from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}
