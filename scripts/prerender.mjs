import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { render } from '../.prerender/entry-server.js';
const template = await readFile('dist/index.html', 'utf8');
for (const [route, file] of [['/', 'dist/index.html'], ['/menu', 'dist/menu/index.html'], ['/cart', 'dist/cart/index.html'], ['/404', 'dist/404.html']]) {
  await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  const markup = render(route);
  const metadata = markup.match(/<title>.*?<\/title>|<meta\s[^>]*>|<link\s[^>]*>/g)?.join('') || '';
  await writeFile(file, template.replace('id="root"', `id="root" data-prerender-path="${route}"`).replace('<!--app-html-->', markup.replace(/<title>.*?<\/title>|<meta\s[^>]*>|<link\s[^>]*>/g, '')).replace('</head>', metadata + '</head>'));
}
await rm('.prerender', { recursive: true, force: true });
console.log('Prerendered home, menu, cart and 404. Deploy dist as static files.');
