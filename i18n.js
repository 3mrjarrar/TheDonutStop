// Natural-language keys preserve the original Arabic copy and inline markup.
const englishTranslations = {
  'دونات طازجة بنكهات وأشكال متنوعة تُعد يوميًا بحب وإبداع.': 'Fresh donuts in a variety of flavors and shapes, made daily with love and creativity.',
  'تابعنا على مواقع التواصل': 'Follow us on social media',
  'فيسبوك — يفتح في نافذة جديدة': 'Facebook — opens in a new tab',
  'إنستغرام — يفتح في نافذة جديدة': 'Instagram — opens in a new tab',
  'خلّينا على تواصل': 'Stay in touch',
  'تواصل معنا وفروعنا': 'Contact & Locations',
  'احكي معنا': 'Give us a call',
  'لاقينا قريب منك': 'Find your nearest stop',
  'الطيرة، خلف سرية رام الله.': 'Al-Tireh, behind Sareyyet Ramallah.',
  'ايكون مول، الطابق الأرضي.': 'Icon Mall, ground floor.',
  'نابلس - شارع الأكاديمية -': 'Nablus — Academy Street —',

  'The Donut Stop | ذا دونات ستوب': 'The Donut Stop | Donuts & Coffee',
  'ذا دونات ستوب — دونات ومشروبات لكل لحظة حلوة.': 'The Donut Stop — donuts and drinks for every sweet moment.',
  'ذا دونات ستوب - الرئيسية': 'The Donut Stop — Home',
  'شعار ذا دونات ستوب': 'The Donut Stop logo',
  'القائمة الرئيسية': 'Main navigation',
  'المفضّلة': 'Favorites',
  'المنيو': 'Menu',
  'العروض': 'Offers',
  'شوف المنيو': 'View menu',
  'لحظتك الحلوة بتبدأ هون': 'Your sweet moment starts here',
  'وقفة صغيرة.': 'A little stop.',
  'فرحة كبيرة.': 'A lot of joy.',
  'دونات طازة بنكهات بتحبها، ومعها قهوتك المفضّلة. اختار اللي على مزاجك من ذا دونات ستوب.': 'Fresh donuts in the flavors you love, paired with your favorite coffee. Find your perfect treat at The Donut Stop.',
  'اكتشف المنيو': 'Explore the menu',
  'شوف العروض': 'View offers',
  'دونات من': 'Donuts from',
  '· مشروبات ساخنة وباردة': '· Hot & cold drinks',
  'مجموعة من أصناف الدونات': 'A selection of our donuts',
  'دونات دبي بالفستق': 'Dubai donut with pistachio',
  'دونات بحشوة اللوتس': 'Lotus-filled donut',
  'دونات أوريجينال جليز': 'Original glazed donut',
  'THE DONUT STOP ✦ لحظات أحلى ✦ DONUTS & COFFEE ✦ THE DONUT STOP ✦ لحظات أحلى ✦ DONUTS & COFFEE ✦': 'THE DONUT STOP ✦ SWEETER MOMENTS ✦ DONUTS & COFFEE ✦ THE DONUT STOP ✦ SWEETER MOMENTS ✦ DONUTS & COFFEE ✦',
  'جرّب نكهاتنا': 'Find your favorite flavor',
  'اختيارات بتشهّي': 'Made to tempt you',
  'كل الأصناف': 'All flavors',
  'دونات دبي': 'Dubai-inspired indulgence',
  'دونات بحشوة الفستق': 'Pistachio-filled donut',
  'بحشوة الفستق': 'Filled with pistachio',
  'بحشوة اللوتس': 'Filled with Lotus',
  'النكهة الأصلية': 'The original favorite',
  'شارك الحلو مع الكل': 'Share something sweet',
  'الدونات أحلى': 'Donuts taste better',
  'لما تكون': 'when there are',
  'أكثر!': 'more!',
  'اختار نكهاتك المفضّلة، وخلي العلبة تجمعهم.': 'Pick your favorite flavors and bring them together in one box.',
  'كل يوم': 'Every day',
  'خذ 6': 'Get 6',
  'وادفع ثمن 5': 'pay for 5',
  'من أصناف الدونات المؤهلة': 'On eligible donut varieties',
  'يوم الثلاثاء': 'Tuesdays',
  'خذ 12': 'Get 12',
  'وادفع ثمن 7': 'pay for 7',
  'كل شي بتحبّه بمكان واحد': 'Everything you love, in one place',
  'اختار فئتك وتصفّح الأصناف والأسعار.': 'Choose a category to browse our menu and prices.',
  'فئات المنيو': 'Menu categories',
  'دونات': 'Donuts',
  'مشروبات ساخنة': 'Hot drinks',
  'مشروبات باردة': 'Cold drinks',
  'سموذي وفرابيه': 'Smoothies & frappes',
  'نكهات الموهيتو': 'Mojito flavors',
  'خلطات الموهيتو': 'Mojito mixes',
  'سموذي': 'Smoothies',
  'فرابيه': 'Frappes',
  'في كل لقمة،': 'In every bite,',
  'لحظة بتستاهل.': 'a moment to savor.',
  'ارجع لفوق ↑': 'Back to top ↑',
  'ذا دونات ستوب · دونات ومشروبات': 'The Donut Stop · Donuts & drinks'
};

function initializeLanguage() {
  const translations = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
    const key = node.textContent.trim();
    if (Object.hasOwn(englishTranslations, key)) {
      const leading = node.textContent.match(/^\s*/)[0];
      const trailing = node.textContent.match(/\s*$/)[0];
      translations.push(() => { node.textContent = leading + i18next.t(key) + trailing; });
    }
  }
  document.querySelectorAll('[alt], [aria-label], meta[name="description"]').forEach(element => {
    ['alt', 'aria-label', 'content'].forEach(attribute => {
      const key = element.getAttribute(attribute);
      if (Object.hasOwn(englishTranslations, key)) {
        translations.push(() => element.setAttribute(attribute, i18next.t(key)));
      }
    });
  });
  const switcher = document.getElementById('language-switch');
  let savedLanguage;
  try { savedLanguage = localStorage.getItem('donut-stop-language'); } catch {}

  function renderLanguage() {
    const language = i18next.resolvedLanguage;
    document.documentElement.lang = language;
    document.documentElement.dir = i18next.dir(language);
    translations.forEach(translate => translate());
    const isArabic = language === 'ar';
    switcher.textContent = isArabic ? 'English' : 'العربية';
    switcher.lang = isArabic ? 'en' : 'ar';
    switcher.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
    showCategory(document.querySelector('.tab.active')?.dataset.category || 'donuts');
    try { localStorage.setItem('donut-stop-language', language); } catch {}
  }
  i18next.on('languageChanged', renderLanguage);
  i18next.init({
    lng: savedLanguage === 'en' ? 'en' : 'ar',
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    keySeparator: false,
    nsSeparator: false,
    resources: {
      ar: { translation: Object.fromEntries(Object.keys(englishTranslations).map(key => [key, key])) },
      en: { translation: englishTranslations }
    }
  });
  switcher.addEventListener('click', () => {
    i18next.changeLanguage(i18next.resolvedLanguage === 'ar' ? 'en' : 'ar');
  });
}
