import "server-only";

// Жаңы заказ тууралуу админге Telegram аркылуу билдирүү.
// TELEGRAM_BOT_TOKEN жана TELEGRAM_CHAT_ID коюлбаса, эч нерсе жөнөтүлбөйт.
export async function notifyNewOrder(o: {
  number: number; name: string; phone: string; address: string | null; pay_method: string; total: number;
  items: { title: string; kind: string; qty: number }[];
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const lines = [
    `🛒 Жаңы заказ №${o.number}`,
    `👤 ${o.name} · ${o.phone}`,
    o.address ? `📍 ${o.address}` : "",
    ...o.items.map((i) => `• ${i.title} (${i.kind === "ebook" ? "онлайн" : "кагаз"})${i.qty > 1 ? " × " + i.qty : ""}`),
    `💰 ${o.total.toLocaleString("ru-RU")} сом · ${o.pay_method === "mbank" ? "MBank QR" : "Накталай"}`,
    site ? `${site}/admin/orders` : "",
  ].filter(Boolean);
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: lines.join("\n"), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // билдирүү жөнөбөсө да заказ сакталып калат
  }
}
