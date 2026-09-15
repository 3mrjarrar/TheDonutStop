import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { menu, donutDescriptions, coldDrinkDescriptions } from '../src/components/menu/menuData.js';
test('every menu item retains its asset, price and bilingual description', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(menu).map(([key, rows]) => [key, rows.length])), { donuts: 34, hot: 20, cold: 27, blends: 10 });
  for (const [category, rows] of Object.entries(menu)) for (const [name, price, photo] of rows) {
    assert.ok(typeof price === 'number' ? price > 0 : /^S \d+ \/ L \d+$/.test(price));
    const image = category === 'donuts' ? `donuts/${photo}` : `${category === 'hot' ? 'hot-drinks' : 'cold-drinks'}/${name}.png`;
    assert.ok(existsSync(`public/assets/${image}`), image);
    if (category !== 'hot') for (const language of ['ar', 'en']) assert.ok((category === 'donuts' ? donutDescriptions : coldDrinkDescriptions)[name][language]);
  }
  for (const name of ['Red Velvet with Cream Cheese', 'Blueberry Cheesecake', 'Strawberry Jam & Cream']) assert.equal(menu.donuts.find(row => row[0] === name)[1], 10);
});
test('built pages expose crawlable content and menu navigation before JavaScript', () => {
  const home = readFileSync('dist/index.html', 'utf8');
  const menuPage = readFileSync('dist/menu/index.html', 'utf8');
  assert.match(home, /id="favorites"/);
  assert.doesNotMatch(home, /id="menu-list"/);
  assert.equal((home.match(/href="\/menu"/g) || []).length, 4);
  assert.doesNotMatch(home, /href="#menu"/);
  assert.match(menuPage, /aria-current="page"/);
  assert.equal((menuPage.match(/feature-card donut-card/g) || []).length, 34);
  assert.match(menuPage, /Red Velvet with Cream Cheese/);
  for (const html of [home, menuPage]) {
    assert.match(html, /<title>/);
    assert.match(html, /<meta name="description"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /class="site-header"/);
    assert.match(html, /class="contact-footer"/);
  }
});
