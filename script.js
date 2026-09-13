const menu = {
  donuts: [
    ['Original Glaze',6,'01-original-glaze.png'],['Coconut Glaze',6,'02-coconut-glaze.png'],['Toasted Coconut Glaze',6,'03-toasted-coconut-glaze.png'],['Powdered Sugar',6,'04-powdered-sugar.png'],['Chocolate Dip',6,'05-chocolate-dip.png'],['Pistachio Dip',6,'06-pistachio-dip.png'],['White Chocolate Dip',6,'07-white-chocolate-dip.png'],['Lemon Dip',6,'08-lemon-dip.png'],['Twister',6,'09-twister.png'],['Nutella Filling',7,'14-nutella-filling.png'],['Boston Cream (Custard Filling)',7,'15-boston-cream-custard-filling.png'],['Lotus Filling',7,'16-lotus-filling.png'],['Caramel Filling',7,'17-caramel-filling.png'],['Oreo Filling',7,'18-oreo-filling.png'],['Lemon Cheesecake',7,'21-lemon-cheesecake.png'],['Ferrero Filling',7,'22-ferrero-filling.png'],['Kinder Bueno Filling',7,'25-kinder-bueno-filling.png'],['Marshmallow Filling',7,'26-marshmallow-filling.png'],['Cotton Candy Filling',7,'27-cotton-candy-filling.png'],['Butter Cookie Filling',7,'28-butter-cookies-filling.png'],['Long John (Custard Filling)',7,'29-long-john-custard-filling.png'],['Bounty Filling',7,'30-bounty-filling.png'],['Pistachio Filling',8,'13-pistachio-filling.png'],['Strawberry Filling',8,'19-strawberry-filling.png'],['Blueberry Filling',8,'20-blueberry-filling.png'],['Apple Fritter',8,'31-apple-fritter.png'],['Crème Brûlée Donut',8,'32-cr-me-br-l-e-donut.png'],['Dubai Donut',10,'10-dubai-donut.png'],['Tiramisu Filling',10,'11-tiramisu-filling.png'],['Pecan Donut',10,'12-pecan-donut.png'],['Mini Donut Bites',20]
  ],
  hot: [['Americano','S 10 / L 12'],['Cappuccino','S 10 / L 12'],['Flat White',12],['Latte',12],['Mocha',14],['White Mocha',14],['Hot Chocolate',14],['Marshmallow Hot Chocolate',14],['Chai Latte',14],['French Vanilla',14],['Hot Hazelnut',14],['Hot Lotus',14],['Hot Spanish Latte',14],['Hot Salted Caramel',14],['Sahlab',14],['Pumpkin Spice Latte',14],['Espresso',7],['Ristretto',7],['Lungo',7],['Doppio',10]],
  cold: [['Iced Coffee','S 14 / L 16'],['Iced Coffee Diet','S 14 / L 16'],['Iced Cappuccino',15],['Iced Latte',15],['Iced Americano',12],['Iced Spanish Latte',15],['Iced Vanilla',15],['Iced Chocolate',15],['Iced Tea',12],['Iced Lemon Mint',14],['Mojito',14]],
  blends: [['Strawberry Smoothie',14],['Mango Smoothie',14],['Mix Berries Smoothie',14],['Blueberry Smoothie',14],['Pineapple Smoothie',14],['Passion Fruit Smoothie',14],['Watermelon Smoothie',14],['Vanilla Espresso Frappe',14],['Chocolate Espresso Frappe',16],['Caramel Espresso Frappe',16]]
};

const list = document.getElementById('menu-list');
const tabs = [...document.querySelectorAll('.tab')];
function showCategory(category) {
  const items = menu[category].map(([name, price, photo]) => {
    const card = document.createElement('article');
    card.className = 'menu-item';
    const main = document.createElement('div');
    main.className = 'menu-item-main';
    if (photo) {
      const img = document.createElement('img');
      img.src = `assets/donuts/${photo}`;
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
      title.textContent = label;
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
showCategory('donuts');
