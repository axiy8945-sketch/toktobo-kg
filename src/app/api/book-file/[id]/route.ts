import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Доступу бар колдонуучуга китеп файлынын убактылуу (10 мүн) шилтемесин берет.
// Текшерүү Storage RLS аркылуу да жүрөт: доступ жок болсо шилтеме түзүлбөйт.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { data: book } = await sb.from("books").select("id, file_path, file_type").eq("id", id).maybeSingle();
  if (!book?.file_path) return NextResponse.json({ error: "no_file" }, { status: 404 });

  const { data, error } = await sb.storage.from("books").createSignedUrl(book.file_path, 600);
  if (error || !data) return NextResponse.json({ error: "no_access" }, { status: 403 });

  return NextResponse.json(
    { url: data.signedUrl, type: book.file_type },
    { headers: { "Cache-Control": "no-store" } },
  );
}
