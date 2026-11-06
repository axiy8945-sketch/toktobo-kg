import { INSTAGRAM, TELEGRAM_BOT, WHATSAPP, waShop } from "@/lib/brand";
import { IconInsta } from "./icons";

export const IconWhatsApp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
);
export const IconTelegram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M21.6 4.2 18.4 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9-8.2c.4-.3-.1-.5-.6-.2L6 13 1.2 11.5c-1-.3-1-1 .2-1.5l18.8-7.2c.9-.3 1.6.2 1.4 1.4z" /></svg>
);

/** Байланыш чиптери: WhatsApp, Telegram бот, Instagram */
export function ContactChips({ waText }: { waText?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={waShop(waText)} target="_blank" rel="noopener noreferrer" className="chip !border-transparent !bg-[#25D366] !text-white">
        <IconWhatsApp className="h-4 w-4" /> {WHATSAPP.display}
      </a>
      <a href={TELEGRAM_BOT.url} target="_blank" rel="noopener noreferrer" className="chip !border-transparent !bg-[#229ED9] !text-white">
        <IconTelegram className="h-4 w-4" /> @{TELEGRAM_BOT.handle}
      </a>
      {INSTAGRAM.map((i) => (
        <a key={i.handle} href={i.url} target="_blank" rel="noopener noreferrer" className="chip"><IconInsta className="h-4 w-4" /> @{i.handle}</a>
      ))}
    </div>
  );
}
