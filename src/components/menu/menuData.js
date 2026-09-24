const menu = {
  donuts: [
    ['Original Glaze',6,'01-original-glaze.png'],['Coconut Glaze',6,'02-coconut-glaze.png'],['Toasted Coconut Glaze',6,'03-toasted-coconut-glaze.png'],['Powdered Sugar',6,'04-powdered-sugar.png'],['Chocolate Dip',6,'05-chocolate-dip.png'],['Pistachio Dip',6,'06-pistachio-dip.png'],['White Chocolate Dip',6,'07-white-chocolate-dip.png'],['Lemon Dip',6,'08-lemon-dip.png'],['Twister',6,'09-twister.png'],['Nutella Filling',7,'14-nutella-filling.png'],['Boston Cream (Custard Filling)',7,'15-boston-cream-custard-filling.png'],['Lotus Filling',7,'16-lotus-filling.png'],['Caramel Filling',7,'17-caramel-filling.png'],['Oreo Filling',7,'18-oreo-filling.png'],['Lemon Cheesecake',7,'21-lemon-cheesecake.png'],['Ferrero Filling',7,'22-ferrero-filling.png'],['Kinder Bueno Filling',7,'25-kinder-bueno-filling.png'],['Marshmallow Filling',7,'26-marshmallow-filling.png'],['Cotton Candy Filling',7,'27-cotton-candy-filling.png'],['Butter Cookie Filling',7,'28-butter-cookies-filling.png'],['Long John (Custard Filling)',7,'29-long-john-custard-filling.png'],['Bounty Filling',7,'30-bounty-filling.png'],['Pistachio Filling',8,'13-pistachio-filling.png'],['Strawberry Filling',8,'19-strawberry-filling.png'],['Blueberry Filling',8,'20-blueberry-filling.png'],['Apple Fritter',8,'31-apple-fritter.png'],['Crème Brûlée Donut',8,'32-creme-brulee-donut.png'],['Dubai Donut',10,'10-dubai-donut.png'],['Tiramisu Filling',10,'11-tiramisu-filling.png'],['Pecan Donut',10,'12-pecan-donut.png'],['Red Velvet with Cream Cheese',10,'34-red-velvet-cream-cheese.png'],['Blueberry Cheesecake',10,'35-blueberry-cheesecake.png'],['Strawberry Jam & Cream',10,'36-strawberry-jam-cream.png'],['Peanut Butter & Jam',10,'37-peanut-butter-jam.png'],['Halawa',7,'38-halawa.png'],['Pumpkin',10,'39-pumpkin.png'],['Cinnamon Rolls',8,'40-cinnamon-rolls.png'],['Mini Donut Bites',20,'33-mini-donut-bites.png']
  ],
  hot: [['Americano','S 10 / L 12'],['Cappuccino','S 10 / L 12'],['Flat White',12],['Latte',12],['Mocha',14],['White Mocha',14],['Hot Chocolate',14],['Marshmallow Hot Chocolate',14],['Chai Latte',14],['French Vanilla',14],['Hot Hazelnut',14],['Hot Lotus',14],['Hot Spanish Latte',14],['Hot Salted Caramel',14],['Sahlab',14],['Pumpkin Spice Latte',15],['Chai Pumpkin Spice',15],['Caramel Pumpkin Latte',15],['Espresso','S 8 / L 10'],['Ristretto',7],['Lungo',7],['Doppio',10]],
  cold: [['Ice Pumpkin Latte',16],['Ice Pumpkin',15],['Iced Coffee','S 14 / L 16'],['Iced Coffee Diet','S 14 / L 16'],['Iced Cappuccino',15],['Iced Latte',15],['Iced Americano',12],['Iced Spanish Latte',15],['Iced Vanilla',15],['Iced Chocolate',15],['Iced Tea',12],['Iced Lemon Mint',14],['Classic Mojito',14],['Strawberry Mojito',14],['Passion Fruit Mojito',14],['Blueberry Mojito',14],['Watermelon Mojito',14],['Bubble Gum Mojito',14],['Mango Mojito',14],['Mix Berries Mojito',14],['Pineapple Mojito',14],['Kiwi Mojito',14],['Green Apple Mojito',14],['Blue Curacao Mojito',14],['Strawberry Kiwi Mojito',14],['Mango Passion Mojito',14],['Berry Mix Mojito',14],['Tropical Mojito',14],['Blue Lagoon Mojito',14]],
  blends: [['Strawberry Smoothie',14],['Mango Smoothie',14],['Mix Berries Smoothie',14],['Blueberry Smoothie',14],['Pineapple Smoothie',14],['Passion Fruit Smoothie',14],['Watermelon Smoothie',14],['Vanilla Espresso Frappe',14],['Chocolate Espresso Frappe',16],['Caramel Espresso Frappe',16]]
};

const donutDescriptions = {
  "Cinnamon Rolls": { ar: 'رول القرفة بطبقة جليز حلوة وخفيفة', en: 'A cinnamon roll with a light, sweet glaze' },
  "Peanut Butter & Jam": { ar: 'دونات بزبدة الفول السوداني والمربّى', en: 'A donut with peanut butter and jam' },
  "Halawa": { ar: 'دونات بالحلاوة والفستق', en: 'A donut topped with halawa and pistachios' },
  "Pumpkin": { ar: 'دونات بنكهة اليقطين', en: 'A pumpkin-flavored donut' },
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
  "Red Velvet with Cream Cheese": {
    "ar": "دونات بكريم تشيز وفتات كيك الريد فيلفت",
    "en": "Cream cheese icing topped with red velvet cake crumbs"
  },
  "Blueberry Cheesecake": {
    "ar": "دونات بنكهة تشيزكيك التوت الأزرق وفتات البسكويت",
    "en": "Blueberry cheesecake flavor topped with biscuit crumbs"
  },
  "Strawberry Jam & Cream": {
    "ar": "دونات بمربّى الفراولة والكريمة وتغطية الفراولة",
    "en": "Strawberry icing with strawberry jam and cream"
  },
  "Mini Donut Bites": {
    "ar": "علبة ميني دونات بتغطيات متنوّعة",
    "en": "A box of mini bites with assorted toppings"
  }
};

const coldDrinkDescriptions = {
  "Ice Pumpkin Latte": { ar: 'لاتيه بارد بنكهة اليقطين', en: 'An iced pumpkin latte' },
  "Ice Pumpkin": { ar: 'مشروب اليقطين البارد بالكريمة والتوابل', en: 'A chilled pumpkin drink with cream and spices' },
  "Iced Coffee": {
    "ar": "قهوة باردة بالحليب والثلج",
    "en": "Chilled coffee with milk and ice"
  },
  "Iced Coffee Diet": {
    "ar": "قهوة باردة بنسخة دايت مع الثلج",
    "en": "Diet iced coffee served over ice"
  },
  "Iced Cappuccino": {
    "ar": "إسبريسو بارد بالحليب ورغوة ناعمة",
    "en": "Iced espresso with milk and soft foam"
  },
  "Iced Latte": {
    "ar": "إسبريسو وحليب بارد مع الثلج",
    "en": "Espresso and cold milk over ice"
  },
  "Iced Americano": {
    "ar": "إسبريسو مع الماء والثلج بطعم غني",
    "en": "Espresso with water and ice"
  },
  "Iced Spanish Latte": {
    "ar": "إسبريسو وحليب مكثّف لمذاق حلو وكريمي",
    "en": "Espresso with sweet, creamy condensed milk"
  },
  "Iced Vanilla": {
    "ar": "مشروب حليب بارد بنكهة الفانيلا",
    "en": "A chilled milk drink with vanilla flavor"
  },
  "Iced Chocolate": {
    "ar": "شوكولاتة وحليب بارد مع الثلج",
    "en": "Chocolate and cold milk over ice"
  },
  "Iced Tea": {
    "ar": "شاي بارد ومنعش مع الثلج",
    "en": "Refreshing tea served over ice"
  },
  "Iced Lemon Mint": {
    "ar": "ليمون منعش ممزوج بالنعناع والثلج",
    "en": "Refreshing lemon blended with mint and ice"
  },
  "Classic Mojito": {
    "ar": "ليمون ونعناع مع الثلج",
    "en": "Lemon flavor with lemon and mint"
  },
  "Strawberry Mojito": {
    "ar": "موهيتو بنكهة الفراولة مع الليمون والنعناع",
    "en": "Strawberry flavor with lemon and mint"
  },
  "Passion Fruit Mojito": {
    "ar": "موهيتو بنكهة الباشن فروت مع الليمون والنعناع",
    "en": "Passion Fruit flavor with lemon and mint"
  },
  "Blueberry Mojito": {
    "ar": "موهيتو بنكهة التوت الأزرق مع الليمون والنعناع",
    "en": "Blueberry flavor with lemon and mint"
  },
  "Watermelon Mojito": {
    "ar": "موهيتو بنكهة البطيخ مع الليمون والنعناع",
    "en": "Watermelon flavor with lemon and mint"
  },
  "Bubble Gum Mojito": {
    "ar": "موهيتو بنكهة العلكة مع الليمون والنعناع",
    "en": "Bubble Gum flavor with lemon and mint"
  },
  "Mango Mojito": {
    "ar": "موهيتو بنكهة المانجو مع الليمون والنعناع",
    "en": "Mango flavor with lemon and mint"
  },
  "Mix Berries Mojito": {
    "ar": "موهيتو بنكهة التوت المشكّل مع الليمون والنعناع",
    "en": "Mix Berries flavor with lemon and mint"
  },
  "Pineapple Mojito": {
    "ar": "موهيتو بنكهة الأناناس مع الليمون والنعناع",
    "en": "Pineapple flavor with lemon and mint"
  },
  "Kiwi Mojito": {
    "ar": "موهيتو بنكهة الكيوي مع الليمون والنعناع",
    "en": "Kiwi flavor with lemon and mint"
  },
  "Green Apple Mojito": {
    "ar": "موهيتو بنكهة التفاح الأخضر مع الليمون والنعناع",
    "en": "Green Apple flavor with lemon and mint"
  },
  "Blue Curacao Mojito": {
    "ar": "بلو كوراساو مع الليمون والنعناع",
    "en": "Blue curacao with lemon and mint"
  },
  "Strawberry Kiwi Mojito": {
    "ar": "فراولة وكيوي مع الليمون والنعناع",
    "en": "Strawberry and kiwi with lemon and mint"
  },
  "Mango Passion Mojito": {
    "ar": "مانجو وباشن فروت مع الليمون والنعناع",
    "en": "Mango and passion fruit with lemon and mint"
  },
  "Berry Mix Mojito": {
    "ar": "فراولة وتوت أزرق ومشكّل مع الليمون والنعناع",
    "en": "Strawberry, blueberry and mixed berries with lemon and mint"
  },
  "Tropical Mojito": {
    "ar": "مانجو وأناناس وباشن فروت مع الليمون",
    "en": "Mango, pineapple and passion fruit with lemon"
  },
  "Blue Lagoon Mojito": {
    "ar": "بلو كوراساو مع الليمون ونكهة اللايم",
    "en": "Blue curacao with lemon and lime flavor"
  },
  "Strawberry Smoothie": {
    "ar": "سموذي مثلّج بنكهة الفراولة وقوام ناعم",
    "en": "A smooth, frozen strawberry blend"
  },
  "Mango Smoothie": {
    "ar": "سموذي مثلّج بنكهة المانجو وقوام ناعم",
    "en": "A smooth, frozen mango blend"
  },
  "Mix Berries Smoothie": {
    "ar": "سموذي مثلّج بنكهة التوت المشكّل وقوام ناعم",
    "en": "A smooth, frozen mix berries blend"
  },
  "Blueberry Smoothie": {
    "ar": "سموذي مثلّج بنكهة التوت الأزرق وقوام ناعم",
    "en": "A smooth, frozen blueberry blend"
  },
  "Pineapple Smoothie": {
    "ar": "سموذي مثلّج بنكهة الأناناس وقوام ناعم",
    "en": "A smooth, frozen pineapple blend"
  },
  "Passion Fruit Smoothie": {
    "ar": "سموذي مثلّج بنكهة الباشن فروت وقوام ناعم",
    "en": "A smooth, frozen passion fruit blend"
  },
  "Watermelon Smoothie": {
    "ar": "سموذي مثلّج بنكهة البطيخ وقوام ناعم",
    "en": "A smooth, frozen watermelon blend"
  },
  "Vanilla Espresso Frappe": {
    "ar": "إسبريسو مثلّج وممزوج بنكهة الفانيلا وقوام كريمي",
    "en": "Blended frozen espresso with creamy vanilla flavor"
  },
  "Chocolate Espresso Frappe": {
    "ar": "إسبريسو مثلّج وممزوج بنكهة الشوكولاتة وقوام كريمي",
    "en": "Blended frozen espresso with creamy chocolate flavor"
  },
  "Caramel Espresso Frappe": {
    "ar": "إسبريسو مثلّج وممزوج بنكهة الكراميل وقوام كريمي",
    "en": "Blended frozen espresso with creamy caramel flavor"
  }
};

const smallCoffeeDescriptions = {
  Ristretto: { ar: 'إسبريسو قصير ومركّز', en: 'A short, concentrated espresso' },
  Lungo: { ar: 'إسبريسو باستخلاص أطول', en: 'An espresso with a longer extraction' },
  Doppio: { ar: 'جرعة إسبريسو مزدوجة', en: 'A double shot of espresso' }
};

export { menu, donutDescriptions, coldDrinkDescriptions, smallCoffeeDescriptions };
