import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import MainLayout from './MainLayout';
import Home from '../pages/Home/Home';
import Menu from '../pages/Menu/Menu';
import NotFound from '../pages/NotFound/NotFound';

const Admin = lazy(() => import('../pages/Admin/Admin'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="admin" element={<Suspense fallback={<p>جارٍ التحميل…</p>}><Admin /></Suspense>} />
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
