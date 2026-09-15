import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './app/App';
export const render = path => renderToString(<StaticRouter location={path}><App /></StaticRouter>);
