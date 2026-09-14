const menu = {
  donuts: [
    ['Original Glaze',6,'01-original-glaze.png'],['Coconut Glaze',6,'02-coconut-glaze.png'],['Toasted Coconut Glaze',6,'03-toasted-coconut-glaze.png'],['Powdered Sugar',6,'04-powdered-sugar.png'],['Chocolate Dip',6,'05-chocolate-dip.png'],['Pistachio Dip',6,'06-pistachio-dip.png'],['White Chocolate Dip',6,'07-white-chocolate-dip.png'],['Lemon Dip',6,'08-lemon-dip.png'],['Twister',6,'09-twister.png'],['Nutella Filling',7,'14-nutella-filling.png'],['Boston Cream (Custard Filling)',7,'15-boston-cream-custard-filling.png'],['Lotus Filling',7,'16-lotus-filling.png'],['Caramel Filling',7,'17-caramel-filling.png'],['Oreo Filling',7,'18-oreo-filling.png'],['Lemon Cheesecake',7,'21-lemon-cheesecake.png'],['Ferrero Filling',7,'22-ferrero-filling.png'],['Kinder Bueno Filling',7,'25-kinder-bueno-filling.png'],['Marshmallow Filling',7,'26-marshmallow-filling.png'],['Cotton Candy Filling',7,'27-cotton-candy-filling.png'],['Butter Cookie Filling',7,'28-butter-cookies-filling.png'],['Long John (Custard Filling)',7,'29-long-john-custard-filling.png'],['Bounty Filling',7,'30-bounty-filling.png'],['Pistachio Filling',8,'13-pistachio-filling.png'],['Strawberry Filling',8,'19-strawberry-filling.png'],['Blueberry Filling',8,'20-blueberry-filling.png'],['Apple Fritter',8,'31-apple-fritter.png'],['Crème Brûlée Donut',8,'32-creme-brulee-donut.png'],['Dubai Donut',10,'10-dubai-donut.png'],['Tiramisu Filling',10,'11-tiramisu-filling.png'],['Pecan Donut',10,'12-pecan-donut.png'],['Mini Donut Bites',20,'33-mini-donut-bites.png']
  ],
  hot: [['Americano','S 10 / L 12'],['Cappuccino','S 10 / L 12'],['Flat White',12],['Latte',12],['Mocha',14],['White Mocha',14],['Hot Chocolate',14],['Marshmallow Hot Chocolate',14],['Chai Latte',14],['French Vanilla',14],['Hot Hazelnut',14],['Hot Lotus',14],['Hot Spanish Latte',14],['Hot Salted Caramel',14],['Sahlab',14],['Pumpkin Spice Latte',14],['Espresso','S 8 / L 10'],['Ristretto',7],['Lungo',7],['Doppio',10]],
  cold: [['Iced Coffee','S 14 / L 16'],['Iced Coffee Diet','S 14 / L 16'],['Iced Cappuccino',15],['Iced Latte',15],['Iced Americano',12],['Iced Spanish Latte',15],['Iced Vanilla',15],['Iced Chocolate',15],['Iced Tea',12],['Iced Lemon Mint',14],['Mojito',14]],
  blends: [['Strawberry Smoothie',14],['Mango Smoothie',14],['Mix Berries Smoothie',14],['Blueberry Smoothie',14],['Pineapple Smoothie',14],['Passion Fruit Smoothie',14],['Watermelon Smoothie',14],['Vanilla Espresso Frappe',14],['Chocolate Espresso Frappe',16],['Caramel Espresso Frappe',16]]
};

const donutDescriptions = {
  "Original Glaze": {
    "ar": "بطبقة جليز حلوة وخفيفة",
    "en": "A light, sweet glaze"
  },
  "Coconut Glaze": {
    "ar": "جليز حلو مع جوز الهند",
    "en": "Sweet glaze with coconut"
  },
  "Toasted Coconut Glaze": {
    "ar": "جليز مع جوز الهند المحمّص",
    "en": "Glaze with toasted coconut"
  },
  "Powdered Sugar": {
    "ar": "مغطاة بطبقة من السكر البودرة",
    "en": "Dusted with powdered sugar"
  },
  "Chocolate Dip": {
    "ar": "مغطاة بطبقة شوكولاتة",
    "en": "Dipped in chocolate"
  },
  "Pistachio Dip": {
    "ar": "مغطاة بطبقة بنكهة الفستق",
    "en": "Dipped in pistachio icing"
  },
  "White Chocolate Dip": {
    "ar": "مغطاة بالشوكولاتة البيضاء",
    "en": "Dipped in white chocolate"
  },
  "Lemon Dip": {
    "ar": "مغطاة بطبقة بنكهة الليمون",
    "en": "Dipped in lemon icing"
  },
  "Twister": {
    "ar": "دونات ملتفّة بطبقة جليز حلوة",
    "en": "A twisted donut with sweet glaze"
  },
  "Nutella Filling": {
    "ar": "بحشوة نوتيلا",
    "en": "Filled with Nutella"
  },
  "Boston Cream (Custard Filling)": {
    "ar": "بحشوة كاسترد ناعمة",
    "en": "Filled with smooth custard"
  },
  "Lotus Filling": {
    "ar": "بحشوة اللوتس",
    "en": "Filled with Lotus"
  },
  "Caramel Filling": {
    "ar": "بحشوة الكراميل",
    "en": "Filled with caramel"
  },
  "Oreo Filling": {
    "ar": "بحشوة بنكهة الأوريو",
    "en": "Filled with Oreo cream"
  },
  "Lemon Cheesecake": {
    "ar": "بحشوة تشيزكيك الليمون",
    "en": "Filled with lemon cheesecake cream"
  },
  "Ferrero Filling": {
    "ar": "بحشوة بنكهة فيريرو",
    "en": "Filled with Ferrero-inspired cream"
  },
  "Kinder Bueno Filling": {
    "ar": "بحشوة بنكهة كيندر بوينو",
    "en": "Filled with Kinder Bueno cream"
  },
  "Marshmallow Filling": {
    "ar": "بحشوة المارشميلو",
    "en": "Filled with marshmallow"
  },
  "Cotton Candy Filling": {
    "ar": "بحشوة بنكهة غزل البنات",
    "en": "Filled with cotton candy cream"
  },
  "Butter Cookie Filling": {
    "ar": "بحشوة بسكويت الزبدة",
    "en": "Filled with butter cookie cream"
  },
  "Long John (Custard Filling)": {
    "ar": "دونات طويلة بحشوة الكاسترد",
    "en": "A long donut filled with custard"
  },
  "Bounty Filling": {
    "ar": "بحشوة بنكهة باونتي وجوز الهند",
    "en": "Filled with Bounty-inspired coconut cream"
  },
  "Pistachio Filling": {
    "ar": "بحشوة الفستق",
    "en": "Filled with pistachio"
  },
  "Strawberry Filling": {
    "ar": "بحشوة الفراولة",
    "en": "Filled with strawberry"
  },
  "Blueberry Filling": {
    "ar": "بحشوة التوت الأزرق",
    "en": "Filled with blueberry"
  },
  "Apple Fritter": {
    "ar": "دونات بقطع التفاح",
    "en": "A fritter with apple pieces"
  },
  "Crème Brûlée Donut": {
    "ar": "بنكهة الكريم بروليه وطبقة سكر مكرمل",
    "en": "Crème brûlée flavor with a caramelized sugar topping"
  },
  "Dubai Donut": {
    "ar": "دونات بنكهة الفستق مستوحاة من دبي",
    "en": "Dubai-inspired pistachio indulgence"
  },
  "Tiramisu Filling": {
    "ar": "بحشوة بنكهة التيراميسو",
    "en": "Filled with tiramisu cream"
  },
  "Pecan Donut": {
    "ar": "دونات مع جوز البيكان",
    "en": "Topped with pecans"
  },
  "Mini Donut Bites": {
    "ar": "علبة ميني دونات بتغطيات متنوّعة",
    "en": "A box of mini bites with assorted toppings"
  }
};

const list = document.getElementById('menu-list');
const tabs = [...document.querySelectorAll('.tab')];
const hotDrinkSizes = new Map();
const smallCoffeeDescriptions = {
  Ristretto: { ar: 'إسبريسو قصير ومركّز', en: 'A short, concentrated espresso' },
  Lungo: { ar: 'إسبريسو باستخلاص أطول', en: 'An espresso with a longer extraction' },
  Doppio: { ar: 'جرعة إسبريسو مزدوجة', en: 'A double shot of espresso' }
};

function createHotDrinkCard(name, price) {
  const english = i18next.resolvedLanguage === 'en';
  const labels = english ? { small: 'Small', large: 'Large', size: 'Size' } : { small: 'صغير', large: 'كبير', size: 'الحجم' };
  if (name === 'Espresso') {
    labels.small = 'Single';
    labels.large = 'Double';
    labels.size = english ? 'Shots' : 'عدد الشوتات';
  }
  const card = document.createElement('article');
  card.className = 'feature-card hot-drink-card';
  const visual = document.createElement('div');
  visual.className = 'hot-drink-image';
  const img = document.createElement('img');
  img.src = `assets/hot-drinks/${encodeURIComponent(name)}.png`;
  img.alt = '';
  img.loading = 'lazy';
  img.width = 1774;
  img.height = 887;
  visual.append(img);
  const info = document.createElement('div');
  info.className = 'feature-info';
  const title = document.createElement('h3');
  title.textContent = name;
  const value = document.createElement('strong');
  value.dir = 'ltr';
  info.append(title, value);
  const prices = typeof price === 'string' ? price.match(/^S (\d+) \/ L (\d+)$/) : null;
  if (!prices) {
    const description = smallCoffeeDescriptions[name];
    const size = description ? 'small' : 'large';
    visual.dataset.size = size;
    img.alt = `${name} — ${labels[size]}`;
    value.textContent = `${price} ₪`;
    const sizeLabel = document.createElement('p');
    sizeLabel.className = 'drink-size-label';
    sizeLabel.textContent = description
      ? description[english ? 'en' : 'ar']
      : english ? 'Large size' : 'حجم كبير';
    card.append(visual, info, sizeLabel);
    return card;
  }
  const sizes = document.createElement('div');
  sizes.className = 'drink-sizes';
  sizes.setAttribute('role', 'group');
  sizes.setAttribute('aria-label', `${name} — ${labels.size}`);
  const buttons = ['small', 'large'].map(size => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = labels[size];
    button.dataset.size = size;
    button.addEventListener('click', () => selectSize(size));
    sizes.append(button);
    return button;
  });
  function selectSize(size) {
    hotDrinkSizes.set(name, size);
    visual.dataset.size = name === 'Espresso' ? 'small' : size;
    img.alt = `${name} — ${labels[size]}`;
    value.textContent = `${prices ? prices[size === 'small' ? 1 : 2] : price} ₪`;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
  }
  selectSize(hotDrinkSizes.get(name) || 'small');
  card.append(visual, info, sizes);
  return card;
}

function showCategory(category) {
  const isDonuts = category === 'donuts';
  list.classList.toggle('donut-grid', isDonuts);
  list.classList.toggle('hot-drink-grid', category === 'hot');
  const items = menu[category].map(([name, price, photo], index) => {
    if (category === 'hot') return createHotDrinkCard(name, price);
    if (isDonuts) {
      const card = document.createElement('article');
      card.className = 'feature-card donut-card';
      const visual = document.createElement('div');
      visual.className = `feature-image ${['coral', 'lemon', 'pink', 'mint'][index % 4]}`;
      const img = document.createElement('img');
      img.src = `assets/donuts/${photo}?v=transparent-3`;
      img.alt = '';
      img.loading = 'lazy';
      img.width = 1254;
      img.height = 1254;
      visual.append(img);
      const info = document.createElement('div');
      info.className = 'feature-info';
      const copy = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = name;
      const description = document.createElement('p');
      description.textContent = donutDescriptions[name][i18next.resolvedLanguage === 'en' ? 'en' : 'ar'];
      copy.append(title, description);
      const value = document.createElement('strong');
      value.dir = 'ltr';
      value.textContent = `${price} ₪`;
      info.append(copy, value);
      card.append(visual, info);
      return card;
    }
    const card = document.createElement('article');
    card.className = 'menu-item';
    const main = document.createElement('div');
    main.className = 'menu-item-main';
    if (photo) {
      const img = document.createElement('img');
      img.src = `assets/donuts/${photo}?v=transparent-3`;
      img.alt = '';
      img.loading = 'lazy';
      main.append(img);
    }
    const title = document.createElement('h3');
    title.textContent = name;
    main.append(title);
    const value = document.createElement('strong');
    value.textContent = `${price} ₪`;
    card.append(main, value);
    return card;
  });
  if (category === 'blends') {
    const frappeStart = menu.blends.findIndex(([name]) => name.includes('Frappe'));
    const heading = label => {
      const title = document.createElement('h3');
      title.className = 'menu-group-heading';
      title.textContent = i18next.t(label);
      return title;
    };
    list.replaceChildren(heading('سموذي'), ...items.slice(0, frappeStart), heading('فرابيه'), ...items.slice(frappeStart));
  } else {
    list.replaceChildren(...items);
  }
  tabs.forEach(tab => {
    const active = tab.dataset.category === category;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}
tabs.forEach(tab => tab.addEventListener('click', () => showCategory(tab.dataset.category)));
document.getElementById('year').textContent = new Date().getFullYear();
initializeLanguage();
