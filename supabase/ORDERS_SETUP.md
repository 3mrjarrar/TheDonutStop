# تفعيل السلة والطلبات

1. طبّق الملفات 001 و002 و003 أولًا (لا تعِد تشغيل الملفات الناجحة).
2. شغّل `migrations/202609170004_orders.sql` مرة واحدة في SQL Editor.
3. افتح المنيو محليًا، واختر فرعًا وأضف الأصناف. الطلب بدون حساب والدفع نقدًا عند الاستلام.
4. اختبر بطلب واضح أنه تجريبي، ثم ادخل `/admin` في نفس الفرع. اقبله أو ألغِه وتحقق من المخزون.

## السلوك

- كميات الدونات فقط تُخصم عند حفظ الطلب وتُعاد مرة واحدة عند الإلغاء.
- المشروبات لا تُخصم كمياتها؛ إيقاف البيع اليدوي يمنع طلبها.
- يحتسب الخادم الأسعار والتوصيل، ويرفض الطلب إذا تغيّر إجماليه أو نفدت الكمية.
- بيانات الطلبات خاصة بالموظفين المصرح لهم في الفرع؛ موظف الطلبات لا يدير المخزون.
- الحالات: جديد ← قيد التحضير ← جاهز ← مكتمل. الإلغاء ممكن قبل الإكمال فقط.
- تعرض الإدارة آخر 100 طلب مع تحديث كل 10 ثوانٍ. الرسائل النصية والدفع الإلكتروني والتنبيه الصوتي غير مضافين.
- تبديل الفرع يطلب تأكيد إفراغ السلة. السلة موجودة في الصفحة الحالية؛ لا تُحفظ بعد إعادة تحميلها.
- عند انقطاع الاتصال أثناء التأكيد، أبقِ الصفحة مفتوحة وأعد المحاولة. يُستخدم نفس معرّف الطلب لمنع التكرار.

## التوصيل

يبدأ التوصيل معطّلًا لجميع الفروع، حتى يحدد المالك الخدمة ورسومها. لتفعيله غيّر `delivery_enabled` و`delivery_fee` للفرع في Supabase، بعد تحديد الرسوم الحقيقية. يعرض النموذج الرسوم ويضمها للإجمالي. السعر ثابت لكل فرع في هذه المرحلة، دون حساب مسافات أو مناطق توصيل.

## الاختبار

`npm run build && npm test` لا يتصل بقاعدة البيانات.
اختبارات قاعدة البيانات المعزولة تعمل باستخدام PGlite:

```sh
PGLITE_MODULE=/path/to/pglite/dist/index.js node supabase/tests/orders.mjs
```

تتحقق من الصلاحيات والأسعار والكميات وإعادة المحاولة والإلغاء والتوصيل. اختبار طلبين على آخر قطعة يعمل في محرك PGlite الذي يسلسل الاستعلامات؛ يجب إجراء اختبار اتصالين مستقلين على PostgreSQL التجريبي قبل إطلاق استقبال الطلبات على نطاق واسع.

يوجد حد خمسة طلبات لكل رقم هاتف خلال 15 دقيقة. هذا ليس بديلًا عن تحقق الهاتف أو حماية آلية من الروبوتات؛ يمكن تغييره بعد تحديد سياسة التشغيل، وإضافة حماية على بوابة الطلبات قبل الإطلاق العام.

## Customer status tracking

Run `migrations/202609180001_order_tracking.sql` in the Supabase SQL Editor after migration 004, then deploy the rebuilt frontend. No Realtime publication or anonymous table access is needed. Customers poll the restricted status RPC every 5 seconds using their private checkout request UUID; the card persists in the same browser across reloads.

Use **قبول وبدء التحضير** to accept an order, **تم التجهيز — جاهز للاستلام/للتوصيل** when prepared, **إكمال الطلب** after fulfillment, and **رفض / إلغاء** to cancel. These transitions update the customer's card automatically.

## Donut offers

Apply `migrations/202609180002_donut_offers.sql` after all previous migrations **before deploying this frontend**. Checkout now requires `get_guest_order_quote`; admin orders also read the new discount fields. No live migration has been applied by the local implementation.

- Every complete 6 donuts earns one free donut whose current branch price is exactly 6 or 7 shekels. The server chooses the highest eligible price to maximize this discount. The overlay appears when one donut is needed to complete a group and lets the customer choose an available eligible donut.
- Tuesday uses the database clock in `Asia/Hebron`. Every complete 12 donuts earns 5 free donuts; the lowest-priced units are discounted, so a dozen is charged at the price of its most expensive 7. Extra units count at their normal prices.
- Both discounts are calculated on Tuesdays; only the larger discount is applied (daily wins a tie). Drinks and delivery fees are excluded. Daily and Tuesday discounts never stack.
- Free donuts still reserve stock and appear in the order with `free_quantity`. Cancellation restores all units. Retry request IDs continue to prevent duplicate orders.
- The morning coffee promotion is informational only; its checkout pricing was not part of this change.

Validation: `PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/offers.mjs` and the existing `orders.mjs` suite.
