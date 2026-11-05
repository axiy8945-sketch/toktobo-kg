import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component ичинен чакырылганда cookie жазылбайт — middleware жаңылайт.
          }
        },
      },
    },
  );
}

/** Кирген колдонуучу жана анын профили (жок болсо null). */
export async function getSession() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, lang, daily_goal")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile } as const;
}
