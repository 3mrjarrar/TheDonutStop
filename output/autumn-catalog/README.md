# Autumn catalog assets

Generated with the built-in imagegen tool using the supplied screenshots as product references and the existing Oreo, Iced Chocolate and Pumpkin Spice Latte assets as style references. Donuts use transparent PNG backgrounds. Drinks retain the existing 2:1 two-cup layout, where the menu displays the right-hand cup for standard size.

## Final prompt set

Common donut prompt: clean photorealistic studio product asset, one whole donut at a three-quarter angle, centered with safe transparent margins and genuine alpha, matching the existing Oreo asset's lighting; remove backgrounds, plates, text, hands and UI without changing product toppings.

- Peanut Butter & Jam: preserve powdered sugar perimeter, dark jam center and peanut butter zigzag from 6:29:15; reconstruct edge hidden by ribbon.
- Halawa: preserve white icing, shredded halawa and green pistachios from 6:27:44.
- Pumpkin (approved reference): preserve beige cream spiral and pecan half from 6:50:33; remove video play overlay.

Common drink prompt: photorealistic pale yellow studio background, 2:1 image with smaller cup in left square half and larger in right square half, both fully visible with margins and a common baseline, soft shadows, existing teal brand logo and THE DONUT STOP text, no surrounding props or prices.

- Ice Pumpkin Latte: preserve layered milk and coffee, cinnamon foam and stick from 6:30:17.
- Ice Pumpkin: preserve creamy spiced drink, whipped cream, star anise and cinnamon from 6:30:06.
- Pumpkin Spice Latte (user-confirmed mapping): preserve cinnamon-dusted surface, cinnamon stick and star anise from 6:30:46.
- Caramel Pumpkin Latte (user-confirmed mapping): preserve tan foam and white latte art from 6:30:37; use front branding.
- Chai Pumpkin Spice (user-confirmed mapping): preserve separated nut/coconut toppings from 6:30:28.

## Saved assets

- `public/assets/donuts/37-peanut-butter-jam.png`
- `public/assets/donuts/38-halawa.png`
- `public/assets/donuts/39-pumpkin.png`
- `public/assets/cold-drinks/Ice Pumpkin Latte.png`
- `public/assets/cold-drinks/Ice Pumpkin.png`
- `public/assets/hot-drinks/Chai Pumpkin Spice.png`
- `public/assets/hot-drinks/Pumpkin Spice Latte.png`
- `public/assets/hot-drinks/Caramel Pumpkin Latte.png`

## Release status

Local catalog and assets are prepared. The remote database has NOT been changed. Deploy the assets, then apply `supabase/migrations/202609240001_autumn_catalog.sql` using the trusted Supabase SQL editor/migration workflow. The migration is transactional and rerunnable, preserves existing IDs, stock, and availability, updates the requested prices (including existing non-null overrides), and initializes new donut inventory at zero. New drinks are not added to Icon Mall.

All photo mappings were approved by the user on 2026-09-24 after the two requested hot-drink image swaps. The user identified the spiral pastry at 6:51:45 as Cinnamon Rolls and confirmed its price as 8 ILS. It is now added under donuts with a separate migration, 202609240002_cinnamon_rolls.sql.

## Cinnamon Rolls

Saved asset: `public/assets/donuts/40-cinnamon-rolls.png`. Built-in ImageGen edit prompt: recreate the spiral cinnamon roll from screenshot 6:51:45, preserving golden pastry and thin translucent glaze; remove hands and background, reconstruct obscured edges, match existing Oreo asset studio lighting and three-quarter framing, one whole roll centered with 8% transparent margin, genuine alpha, no added toppings, text or props.

### Cinnamon Rolls visual refinement

Replaced `public/assets/donuts/40-cinnamon-rolls.png` using built-in ImageGen at the user’s request. Final edit prompt: preserve the same golden spiral cinnamon roll and thin translucent glaze; improve to a flattering three-quarter angle showing a plumper baked side, clearly defined cinnamon seams, warm golden edges, refined soft glaze highlights, realistic dough texture and soft professional bakery lighting; one whole centered roll with safe transparent margins and genuine alpha; no frosting, extra toppings, props or text.
