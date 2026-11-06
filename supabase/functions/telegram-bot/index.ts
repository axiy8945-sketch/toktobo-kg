// ТОКТОБО KG — Telegram бот: китеп тандоо, себет, заказ берүү, админге билдирүү.
// Supabase Edge Function. Жашыруун маанилер Vault'та (public.bot_secrets, service_role гана).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://toktobo-kg.vercel.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

type Lang = "ky" | "uz" | "ru";
type CartItem = { book_id: string; qty: number };
type Session = { chat_id: number; lang: Lang | null; cart: CartItem[]; step: string | null; draft: Record<string, string> };
type Book = { id: string; title: string; author: string; description: string | null; cover_path: string | null; paper_price: number | null; ebook_mode: string };

/* ---------------- тексттер ---------------- */
const T: Record<string, [string, string, string]> = {
  choose_lang: ["Тилди тандаңыз · Tilni tanlang · Выберите язык", "Тилди тандаңыз · Tilni tanlang · Выберите язык", "Тилди тандаңыз · Tilni tanlang · Выберите язык"],
  hello: ["Саламатсызбы! 📚 Бул Toktobo басма үйүнүн боту.\nБул жерден кагаз китепке заказ бере аласыз.\n\nОку. Өнүк. Токтобо.", "Assalomu alaykum! 📚 Bu Toktobo nashriyoti boti.\nBu yerda qog'oz kitobga buyurtma berishingiz mumkin.", "Здравствуйте! 📚 Это бот издательства Toktobo.\nЗдесь можно заказать бумажные книги."],
  m_books: ["📚 Китептер", "📚 Kitoblar", "📚 Книги"],
  m_cart: ["🛒 Себет", "🛒 Savat", "🛒 Корзина"],
  m_orders: ["📦 Заказдарым", "📦 Buyurtmalarim", "📦 Мои заказы"],
  m_site: ["🌐 Сайт жана онлайн окуу", "🌐 Sayt va onlayn o'qish", "🌐 Сайт и чтение онлайн"],
  m_lang: ["🌍 Тил", "🌍 Til", "🌍 Язык"],
  books_t: ["Кагаз китептер (бет {p}/{n}):", "Qog'oz kitoblar ({p}/{n}-sahifa):", "Бумажные книги (стр. {p}/{n}):"],
  no_books: ["Азырынча кагаз китептер кошула элек.", "Hozircha qog'oz kitoblar qo'shilmagan.", "Бумажных книг пока нет."],
  site_t: ["Онлайн окуу, бонустар жана AI коуч сайтта:", "Onlayn o'qish, bonuslar va AI murabbiy saytda:", "Чтение онлайн, бонусы и AI-коуч — на сайте:"],
  add: ["➕ Себетке", "➕ Savatga", "➕ В корзину"],
  back: ["◀️ Артка", "◀️ Orqaga", "◀️ Назад"],
  added: ["Себетке кошулду ✅", "Savatga qo'shildi ✅", "Добавлено ✅"],
  cart_empty: ["Себет бош. «📚 Китептер» бөлүмүнөн тандаңыз.", "Savat bo'sh. «📚 Kitoblar» bo'limidan tanlang.", "Корзина пуста. Выберите в разделе «📚 Книги»."],
  cart_t: ["🛒 Себетиңиз:", "🛒 Savatingiz:", "🛒 Ваша корзина:"],
  total: ["Жалпы", "Jami", "Итого"],
  checkout: ["✅ Заказ берүү", "✅ Buyurtma berish", "✅ Оформить"],
  clear: ["🗑 Тазалоо", "🗑 Tozalash", "🗑 Очистить"],
  ask_name: ["Атыңызды жазыңыз:", "Ismingizni yozing:", "Напишите ваше имя:"],
  ask_phone: ["Телефон номериңизди жөнөтүңүз (төмөнкү баскыч же колго жазыңыз):", "Telefon raqamingizni yuboring (pastdagi tugma yoki qo'lda yozing):", "Отправьте номер телефона (кнопка ниже или вручную):"],
  share_phone: ["📱 Номерди жөнөтүү", "📱 Raqamni yuborish", "📱 Отправить номер"],
  bad_phone: ["Номер туура эмес. Кеминде 9 сан болушу керек.", "Raqam noto'g'ri. Kamida 9 ta raqam bo'lishi kerak.", "Неверный номер. Нужно не меньше 9 цифр."],
  ask_addr: ["Жеткирүү дарегин жазыңыз (шаар, көчө, үй):", "Yetkazib berish manzilini yozing (shahar, ko'cha, uy):", "Напишите адрес доставки (город, улица, дом):"],
  ask_pay: ["Төлөм ыкмасын тандаңыз:", "To'lov usulini tanlang:", "Выберите способ оплаты:"],
  mbank: ["💳 MBank QR", "💳 MBank QR", "💳 MBank QR"],
  cash: ["💵 Накталай", "💵 Naqd pul", "💵 Наличными"],
  summary: ["Заказды текшериңиз:", "Buyurtmani tekshiring:", "Проверьте заказ:"],
  confirm: ["✅ Ырастоо", "✅ Tasdiqlash", "✅ Подтвердить"],
  cancel: ["✖️ Жокко чыгаруу", "✖️ Bekor qilish", "✖️ Отмена"],
  cancelled_flow: ["Заказ берүү токтотулду.", "Buyurtma berish to'xtatildi.", "Оформление отменено."],
  order_ok: ["🎉 №{n} заказыңыз кабыл алынды!\nСумма: {t} сом.", "🎉 №{n} buyurtmangiz qabul qilindi!\nSumma: {t} so'm.", "🎉 Заказ №{n} принят!\nСумма: {t} сом."],
  next_mbank: ["Кызматкер жакында сизге MBank QR-кодун жөнөтөт. Төлөгөндөн кийин заказ тастыкталат.", "Xodim tez orada sizga MBank QR-kodini yuboradi. To'lovdan keyin buyurtma tasdiqlanadi.", "Сотрудник скоро отправит QR-код MBank. После оплаты заказ подтвердят."],
  next_cash: ["Кызматкер тастыктоо үчүн сиз менен байланышат.", "Xodim tasdiqlash uchun siz bilan bog'lanadi.", "Сотрудник свяжется с вами для подтверждения."],
  order_err: ["Заказ берүүдө ката кетти. Кайра аракет кылыңыз.", "Buyurtmada xatolik. Qayta urinib ko'ring.", "Ошибка при оформлении. Попробуйте ещё раз."],
  orders_empty: ["Азырынча заказ жок.", "Hozircha buyurtma yo'q.", "Заказов пока нет."],
  s_pending: ["⏳ Күтүүдө", "⏳ Kutilmoqda", "⏳ Ожидает"],
  s_qr_sent: ["💳 QR жөнөтүлдү", "💳 QR yuborildi", "💳 QR отправлен"],
  s_confirmed: ["✅ Тастыкталды", "✅ Tasdiqlandi", "✅ Подтверждён"],
  s_cancelled: ["✖️ Жокко чыгарылды", "✖️ Bekor qilindi", "✖️ Отменён"],
  st_upd: ["№{n} заказыңыздын абалы: {s}", "№{n} buyurtmangiz holati: {s}", "Статус заказа №{n}: {s}"],
  st_conf_extra: ["Рахмат! Заказыңыз тастыкталды, жакында жеткирилет.", "Rahmat! Buyurtmangiz tasdiqlandi, tez orada yetkaziladi.", "Спасибо! Заказ подтверждён и скоро будет доставлен."],
  admin_ok: ["✅ Бул чат админ катары катталды. Жаңы заказдар ушул жерге келет.", "✅ Bu chat admin sifatida ro'yxatdan o'tdi.", "✅ Этот чат зарегистрирован как админ. Новые заказы будут приходить сюда."],
  admin_bad: ["Код туура эмес.", "Kod noto'g'ri.", "Неверный код."],
  unknown: ["Төмөнкү менюдан тандаңыз 👇", "Pastdagi menyudan tanlang 👇", "Выберите в меню ниже 👇"],
  som: ["сом", "so'm", "сом"],
};
const li = (l: Lang | null) => (l === "uz" ? 1 : l === "ru" ? 2 : 0);
const tr = (l: Lang | null, k: string, v?: Record<string, string | number>) => {
  let s = (T[k] ?? [k, k, k])[li(l)];
  if (v) for (const x in v) s = s.split(`{${x}}`).join(String(v[x]));
  return s;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");

/* ---------------- жардамчылар ---------------- */
let secretsCache: Record<string, string> | null = null;
async function secrets() {
  if (secretsCache) return secretsCache;
  const { data, error } = await sb.rpc("bot_secrets");
  if (error) throw error;
  secretsCache = data as Record<string, string>;
  return secretsCache;
}
async function tg(method: string, body: Record<string, unknown>) {
  const { telegram_bot_token } = await secrets();
  const r = await fetch(`https://api.telegram.org/bot${telegram_bot_token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}
const send = (chat_id: number, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

function menu(l: Lang | null) {
  return { keyboard: [[{ text: tr(l, "m_books") }, { text: tr(l, "m_cart") }], [{ text: tr(l, "m_orders") }, { text: tr(l, "m_site") }], [{ text: tr(l, "m_lang") }]], resize_keyboard: true };
}

async function getSession(chat_id: number): Promise<Session> {
  const { data } = await sb.from("bot_sessions").select("chat_id, lang, cart, step, draft").eq("chat_id", chat_id).maybeSingle();
  return (data as Session) ?? { chat_id, lang: null, cart: [], step: null, draft: {} };
}
async function saveSession(s: Session) {
  await sb.from("bot_sessions").upsert({ ...s, updated_at: new Date().toISOString() });
}

async function paperBooks(): Promise<Book[]> {
  const { data } = await sb.from("books").select("id, title, author, description, cover_path, paper_price, ebook_mode")
    .eq("is_published", true).not("paper_price", "is", null).order("created_at", { ascending: false });
  return (data ?? []) as Book[];
}

/* ---------------- экрандар ---------------- */
const PER_PAGE = 8;
async function showBooks(s: Session, page = 0, editMsg?: number) {
  const books = await paperBooks();
  if (!books.length) return send(s.chat_id, tr(s.lang, "no_books"), { reply_markup: menu(s.lang) });
  const pages = Math.ceil(books.length / PER_PAGE);
  page = Math.max(0, Math.min(page, pages - 1));
  const rows = books.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
    .map((b) => [{ text: `${b.title} — ${money(b.paper_price!)} ${tr(s.lang, "som")}`.slice(0, 60), callback_data: `book:${b.id}` }]);
  const nav = [];
  if (page > 0) nav.push({ text: "◀️", callback_data: `books:${page - 1}` });
  if (page < pages - 1) nav.push({ text: "▶️", callback_data: `books:${page + 1}` });
  if (nav.length) rows.push(nav);
  const text = tr(s.lang, "books_t", { p: page + 1, n: pages });
  if (editMsg) return tg("editMessageText", { chat_id: s.chat_id, message_id: editMsg, text, reply_markup: { inline_keyboard: rows } });
  return send(s.chat_id, text, { reply_markup: { inline_keyboard: rows } });
}

async function showBook(s: Session, id: string) {
  const { data: b } = await sb.from("books").select("id, title, author, description, cover_path, paper_price, ebook_mode").eq("id", id).eq("is_published", true).maybeSingle();
  if (!b || b.paper_price == null) return showBooks(s);
  const caption = `<b>${esc(b.title)}</b>\n${esc(b.author)}\n\n💰 ${money(b.paper_price)} ${tr(s.lang, "som")}` +
    (b.description ? `\n\n${esc(b.description.slice(0, 600))}` : "");
  const reply_markup = { inline_keyboard: [[{ text: tr(s.lang, "add"), callback_data: `add:${b.id}` }], [{ text: tr(s.lang, "m_cart"), callback_data: "cart" }, { text: tr(s.lang, "back"), callback_data: "books:0" }]] };
  if (b.cover_path) {
    const photo = `${SUPABASE_URL}/storage/v1/object/public/covers/${b.cover_path}`;
    const r = await tg("sendPhoto", { chat_id: s.chat_id, photo, caption: caption.slice(0, 1000), parse_mode: "HTML", reply_markup });
    if (r?.ok) return r;
  }
  return send(s.chat_id, caption, { reply_markup });
}

async function cartLines(s: Session) {
  const ids = s.cart.map((c) => c.book_id);
  if (!ids.length) return { lines: [] as { b: Book; qty: number }[], total: 0 };
  const { data } = await sb.from("books").select("id, title, author, description, cover_path, paper_price, ebook_mode").in("id", ids).eq("is_published", true);
  const map = new Map((data ?? []).map((b: Book) => [b.id, b]));
  const lines = s.cart.filter((c) => map.get(c.book_id)?.paper_price != null).map((c) => ({ b: map.get(c.book_id)!, qty: c.qty }));
  return { lines, total: lines.reduce((a, l) => a + l.b.paper_price! * l.qty, 0) };
}

async function showCart(s: Session, editMsg?: number) {
  const { lines, total } = await cartLines(s);
  if (!lines.length) {
    if (editMsg) return tg("editMessageText", { chat_id: s.chat_id, message_id: editMsg, text: tr(s.lang, "cart_empty") });
    return send(s.chat_id, tr(s.lang, "cart_empty"), { reply_markup: menu(s.lang) });
  }
  const text = `${tr(s.lang, "cart_t")}\n\n` + lines.map((l) => `• ${esc(l.b.title)} × ${l.qty} = ${money(l.b.paper_price! * l.qty)} ${tr(s.lang, "som")}`).join("\n") +
    `\n\n<b>${tr(s.lang, "total")}: ${money(total)} ${tr(s.lang, "som")}</b>`;
  const rows = lines.map((l) => [
    { text: "➖", callback_data: `dec:${l.b.id}` }, { text: `${l.b.title.slice(0, 22)} (${l.qty})`, callback_data: `book:${l.b.id}` }, { text: "➕", callback_data: `inc:${l.b.id}` },
  ]);
  rows.push([{ text: tr(s.lang, "checkout"), callback_data: "checkout" }]);
  rows.push([{ text: tr(s.lang, "clear"), callback_data: "clear" }]);
  const extra = { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } };
  if (editMsg) return tg("editMessageText", { chat_id: s.chat_id, message_id: editMsg, text, ...extra });
  return send(s.chat_id, text, extra);
}

async function showOrders(s: Session) {
  const { data } = await sb.from("orders").select("number, status, total, created_at").eq("tg_chat_id", s.chat_id).order("created_at", { ascending: false }).limit(5);
  if (!data?.length) return send(s.chat_id, tr(s.lang, "orders_empty"), { reply_markup: menu(s.lang) });
  const text = data.map((o) => `№${o.number} · ${money(o.total)} ${tr(s.lang, "som")} · ${tr(s.lang, `s_${o.status}`)}`).join("\n");
  return send(s.chat_id, text, { reply_markup: menu(s.lang) });
}

async function askLang(chat_id: number) {
  return send(chat_id, tr(null, "choose_lang"), { reply_markup: { inline_keyboard: [[
    { text: "🇰🇬 Кыргызча", callback_data: "lang:ky" }, { text: "🇺🇿 O'zbekcha", callback_data: "lang:uz" }, { text: "🇷🇺 Русский", callback_data: "lang:ru" },
  ]] } });
}

/* ---------------- заказ берүү кадамдары ---------------- */
async function handleStep(s: Session, text: string | undefined, contactPhone?: string) {
  const l = s.lang;
  if (s.step === "name") {
    const name = (text ?? "").trim().slice(0, 120);
    if (!name) return send(s.chat_id, tr(l, "ask_name"));
    s.draft.name = name; s.step = "phone"; await saveSession(s);
    return send(s.chat_id, tr(l, "ask_phone"), { reply_markup: { keyboard: [[{ text: tr(l, "share_phone"), request_contact: true }], [{ text: tr(l, "cancel") }]], resize_keyboard: true, one_time_keyboard: true } });
  }
  if (s.step === "phone") {
    const phone = (contactPhone ?? text ?? "").trim();
    if (phone.replace(/\D/g, "").length < 9) return send(s.chat_id, tr(l, "bad_phone"));
    s.draft.phone = phone.startsWith("+") || phone.replace(/\D/g, "").length < 11 ? phone : `+${phone.replace(/\D/g, "")}`;
    s.step = "address"; await saveSession(s);
    return send(s.chat_id, tr(l, "ask_addr"), { reply_markup: { keyboard: [[{ text: tr(l, "cancel") }]], resize_keyboard: true } });
  }
  if (s.step === "address") {
    const addr = (text ?? "").trim().slice(0, 300);
    if (addr.length < 3) return send(s.chat_id, tr(l, "ask_addr"));
    s.draft.address = addr; s.step = "pay"; await saveSession(s);
    await send(s.chat_id, "👌", { reply_markup: menu(l) });
    return send(s.chat_id, tr(l, "ask_pay"), { reply_markup: { inline_keyboard: [[{ text: tr(l, "mbank"), callback_data: "pay:mbank" }, { text: tr(l, "cash"), callback_data: "pay:cash" }]] } });
  }
}

async function showSummary(s: Session) {
  const { lines, total } = await cartLines(s);
  if (!lines.length) { s.step = null; await saveSession(s); return showCart(s); }
  const text = `${tr(s.lang, "summary")}\n\n` + lines.map((l) => `• ${esc(l.b.title)} × ${l.qty}`).join("\n") +
    `\n\n<b>${tr(s.lang, "total")}: ${money(total)} ${tr(s.lang, "som")}</b>\n👤 ${esc(s.draft.name)}\n📱 ${esc(s.draft.phone)}\n📍 ${esc(s.draft.address)}\n` +
    (s.draft.pay === "cash" ? tr(s.lang, "cash") : tr(s.lang, "mbank"));
  return send(s.chat_id, text, { reply_markup: { inline_keyboard: [[{ text: tr(s.lang, "confirm"), callback_data: "confirm" }], [{ text: tr(s.lang, "cancel"), callback_data: "cancelflow" }]] } });
}

async function placeOrder(s: Session) {
  const { data, error } = await sb.rpc("bot_place_order", {
    p_chat: s.chat_id, p_items: s.cart, p_name: s.draft.name, p_phone: s.draft.phone, p_address: s.draft.address, p_pay: s.draft.pay,
  });
  if (error || !data) { console.error(error); return send(s.chat_id, tr(s.lang, "order_err"), { reply_markup: menu(s.lang) }); }
  const o = data as { number: number; total: number };
  const pay = s.draft.pay;
  s.cart = []; s.step = null; s.draft = { name: s.draft.name, phone: s.draft.phone, address: s.draft.address };
  await saveSession(s);
  return send(s.chat_id, `${tr(s.lang, "order_ok", { n: o.number, t: money(o.total) })}\n\n${tr(s.lang, pay === "cash" ? "next_cash" : "next_mbank")}`, { reply_markup: menu(s.lang) });
}

/* ---------------- ички окуялар (маалымат базасынан) ---------------- */
async function onNewOrder(orderId: string) {
  const { data: o } = await sb.from("orders").select("number, name, phone, address, pay_method, total, bonus_used, source, order_items(title, kind, qty)").eq("id", orderId).maybeSingle();
  if (!o) return;
  const { data: admins } = await sb.from("bot_admins").select("chat_id");
  if (!admins?.length) return;
  const items = (o.order_items as { title: string; kind: string; qty: number }[]) ?? [];
  const wa = String(o.phone).replace(/\D/g, "").replace(/^0(\d{9})$/, "996$1");
  const text = `🛒 <b>Жаңы заказ №${o.number}</b> (${o.source === "telegram" ? "Telegram бот" : "сайт"})\n👤 ${esc(o.name)} · ${esc(o.phone)}\n` +
    (o.address ? `📍 ${esc(o.address)}\n` : "") +
    items.map((i) => `• ${esc(i.title)} (${i.kind === "ebook" ? "онлайн" : "кагаз"})${i.qty > 1 ? ` × ${i.qty}` : ""}`).join("\n") +
    `\n💰 ${money(o.total)} сом · ${o.pay_method === "mbank" ? "MBank QR" : "Накталай"}` +
    (o.bonus_used ? `\n🎁 Бонус менен: ${o.bonus_used} сом` : "");
  const buttons = [[{ text: "Админ панель", url: `${SITE}/admin/orders` }]];
  if (wa.length >= 11) buttons[0].push({ text: "WhatsApp", url: `https://wa.me/${wa}` });
  for (const a of admins) await send(a.chat_id, text, { reply_markup: { inline_keyboard: buttons } });
}

async function onStatus(orderId: string) {
  const { data: o } = await sb.from("orders").select("number, status, tg_chat_id").eq("id", orderId).maybeSingle();
  if (!o?.tg_chat_id) return;
  const s = await getSession(o.tg_chat_id);
  let text = tr(s.lang, "st_upd", { n: o.number, s: tr(s.lang, `s_${o.status}`) });
  if (o.status === "confirmed") text += `\n${tr(s.lang, "st_conf_extra")}`;
  await send(o.tg_chat_id, text);
}

/* ---------------- негизги кабыл алгыч ---------------- */
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  let sec: Record<string, string>;
  try { sec = await secrets(); } catch (e) { console.error(e); return new Response("cfg", { status: 500 }); }

  // Маалымат базасынан келген окуя
  const internal = req.headers.get("x-internal-secret");
  if (internal) {
    if (internal !== sec.bot_internal_secret) return new Response("forbidden", { status: 403 });
    const ev = await req.json().catch(() => ({}));
    try {
      if (ev.event === "new_order") await onNewOrder(ev.order_id);
      if (ev.event === "status") await onStatus(ev.order_id);
    } catch (e) { console.error(e); }
    return new Response("ok");
  }

  // Telegram'дан келген жаңылык (жашыруун баш сап менен гана)
  if (req.headers.get("x-telegram-bot-api-secret-token") !== sec.bot_webhook_secret) return new Response("forbidden", { status: 403 });
  const u = await req.json().catch(() => null);
  if (!u) return new Response("ok");

  try {
    if (u.callback_query) {
      const q = u.callback_query;
      const chat = q.message?.chat?.id as number;
      if (!chat) return new Response("ok");
      const s = await getSession(chat);
      const [act, arg] = String(q.data ?? "").split(":");
      let toast = "";
      if (act === "lang" && (arg === "ky" || arg === "uz" || arg === "ru")) {
        s.lang = arg; await saveSession(s);
        await send(chat, tr(s.lang, "hello"), { reply_markup: menu(s.lang) });
      } else if (act === "books") await showBooks(s, Number(arg) || 0, q.message.message_id);
      else if (act === "book") await showBook(s, arg);
      else if (act === "add" || act === "inc") {
        const c = s.cart.find((x) => x.book_id === arg);
        if (c) c.qty = Math.min(50, c.qty + 1); else if (s.cart.length < 30) s.cart.push({ book_id: arg, qty: 1 });
        await saveSession(s);
        if (act === "inc") await showCart(s, q.message.message_id); else toast = tr(s.lang, "added");
      } else if (act === "dec") {
        const c = s.cart.find((x) => x.book_id === arg);
        if (c) { c.qty -= 1; if (c.qty <= 0) s.cart = s.cart.filter((x) => x !== c); }
        await saveSession(s); await showCart(s, q.message.message_id);
      } else if (act === "cart") await showCart(s);
      else if (act === "clear") { s.cart = []; await saveSession(s); await showCart(s, q.message.message_id); }
      else if (act === "checkout") {
        if (!s.cart.length) await showCart(s);
        else { s.step = "name"; await saveSession(s); await send(chat, tr(s.lang, "ask_name"), { reply_markup: { keyboard: [[{ text: s.draft.name || tr(s.lang, "cancel") }], ...(s.draft.name ? [[{ text: tr(s.lang, "cancel") }]] : [])], resize_keyboard: true } }); }
      } else if (act === "pay" && s.step === "pay" && (arg === "mbank" || arg === "cash")) {
        s.draft.pay = arg; s.step = "confirm"; await saveSession(s); await showSummary(s);
      } else if (act === "confirm" && s.step === "confirm") await placeOrder(s);
      else if (act === "cancelflow") { s.step = null; await saveSession(s); await send(chat, tr(s.lang, "cancelled_flow"), { reply_markup: menu(s.lang) }); }
      await tg("answerCallbackQuery", { callback_query_id: q.id, text: toast || undefined });
      return new Response("ok");
    }

    const m = u.message;
    if (!m?.chat?.id || m.chat.type !== "private") return new Response("ok");
    const chat = m.chat.id as number;
    const text: string | undefined = m.text;
    const s = await getSession(chat);

    if (text?.startsWith("/admin")) {
      const code = text.split(/\s+/)[1] ?? "";
      if (code && code === sec.bot_admin_code) {
        await sb.from("bot_admins").upsert({ chat_id: chat, name: [m.from?.first_name, m.from?.username && `@${m.from.username}`].filter(Boolean).join(" ") });
        await send(chat, tr(s.lang, "admin_ok"));
      } else await send(chat, tr(s.lang, "admin_bad"));
      return new Response("ok");
    }
    if (text === "/start" || !s.lang) { s.step = null; await saveSession(s); await askLang(chat); return new Response("ok"); }
    if (text === tr(s.lang, "cancel")) { s.step = null; await saveSession(s); await send(chat, tr(s.lang, "cancelled_flow"), { reply_markup: menu(s.lang) }); return new Response("ok"); }
    if (s.step && ["name", "phone", "address"].includes(s.step)) { await handleStep(s, text, m.contact?.phone_number); return new Response("ok"); }

    if (text === tr(s.lang, "m_books")) await showBooks(s);
    else if (text === tr(s.lang, "m_cart")) await showCart(s);
    else if (text === tr(s.lang, "m_orders")) await showOrders(s);
    else if (text === tr(s.lang, "m_site")) await send(chat, `${tr(s.lang, "site_t")}\n${SITE}`, { reply_markup: menu(s.lang) });
    else if (text === tr(s.lang, "m_lang")) await askLang(chat);
    else await send(chat, tr(s.lang, "unknown"), { reply_markup: menu(s.lang) });
  } catch (e) {
    console.error(e);
  }
  return new Response("ok");
});
