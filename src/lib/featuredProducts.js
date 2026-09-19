import { menu } from '../components/menu/menuData.js';

export const defaultFeatured = ['10-dubai-donut.png', '13-pistachio-filling.png', '16-lotus-filling.png', '01-original-glaze.png'];
export function validFeatured(photos) {
  return Array.isArray(photos) && photos.length === 4 && new Set(photos).size === 4
    && photos.every(photo => menu.donuts.some(item => item[2] === photo));
}
export function featuredItems(photos) {
  return (validFeatured(photos) ? photos : defaultFeatured).map(photo => menu.donuts.find(item => item[2] === photo));
}
