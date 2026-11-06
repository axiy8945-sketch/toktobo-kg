// WhatsApp шилтемелери (wa.me) — номерди эл аралык форматка келтирет
export function waNumber(phone: string): string | null {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "996" + d.slice(1);   // 0555 123 456
  else if (d.length === 9) d = "996" + d;                              // 555 123 456
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function waLink(phone: string, text?: string): string | null {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
