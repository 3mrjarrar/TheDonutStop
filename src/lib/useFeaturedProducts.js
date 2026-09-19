import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { defaultFeatured, validFeatured } from './featuredProducts';

export function useFeaturedProducts() {
  const [photos, setPhotos] = useState(defaultFeatured);
  useEffect(() => {
    let live = true;
    async function load() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('homepage_featured').select('photos').eq('id', 1).single();
        if (live && !error && validFeatured(data?.photos)) setPhotos(data.photos);
      } catch { /* Keep the last usable selection when offline. */ }
    }
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('focus', load);
    window.addEventListener('donut-featured-changed', load);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('donut-featured-changed', load); };
  }, []);
  return photos;
}
