import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_SITE_URL : "https://toktobo-kg.vercel.app";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/books`, changeFrequency: "daily", priority: 0.9 },
  ];
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.from("books").select("id, updated_at").eq("is_published", true);
    for (const b of data ?? []) pages.push({ url: `${SITE}/books/${b.id}`, lastModified: b.updated_at, changeFrequency: "weekly", priority: 0.8 });
  } catch { /* базага жетпесе да негизги барактар калат */ }
  return pages;
}
