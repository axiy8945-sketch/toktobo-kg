export type Lang = "ky" | "uz" | "ru";
export type Role = "reader" | "staff" | "admin";
export type EbookMode = "none" | "free" | "paid";

export interface Book {
  id: string;
  title: string;
  author: string;
  category_id: string | null;
  lang: Lang;
  description: string | null;
  cover_path: string | null;
  paper_price: number | null;
  ebook_mode: EbookMode;
  ebook_price: number;
  file_path: string | null;
  file_type: "pdf" | "epub" | null;
  is_published: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_ky: string;
  name_uz: string;
  name_ru: string;
  sort: number;
}

export type OrderStatus = "pending" | "qr_sent" | "confirmed" | "cancelled";

export interface CartItem {
  book_id: string;
  kind: "paper" | "ebook";
  qty: number;
}

export const BOOK_COLUMNS =
  "id,title,author,category_id,lang,description,cover_path,paper_price,ebook_mode,ebook_price,file_path,file_type,is_published,created_at";

/** Ар бир сатылып алынган китеп үчүн бонус (маалымат базасындагы place_order менен бирдей болушу керек) */
export const BONUS_PER_BOOK = 20;
