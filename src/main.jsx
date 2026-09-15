import './styles/global.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
const root = document.getElementById('root');
const app = <BrowserRouter><App /></BrowserRouter>;
const normalizePath = path => path.replace(/\/$/, '') || '/';
if (root.querySelector('main') && normalizePath(root.dataset.prerenderPath || '/') === normalizePath(window.location.pathname)) hydrateRoot(root, app);
else createRoot(root).render(app);
