// Токтобо басма үйүнүн расмий барактары
export const INSTAGRAM = [
  { handle: "toktobo.kg", url: "https://www.instagram.com/toktobo.kg/" },
  { handle: "toktobo_books", url: "https://www.instagram.com/toktobo_books/" },
];

// Дүкөндүн WhatsApp номери жана заказ боту
export const WHATSAPP = { display: "0709 040 809", number: "996709040809" };
export const TELEGRAM_BOT = { handle: "toktobokg_bot", url: "https://t.me/toktobokg_bot" };
export const waShop = (text?: string) => `https://wa.me/${WHATSAPP.number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
