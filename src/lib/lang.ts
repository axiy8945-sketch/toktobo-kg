import { cookies } from "next/headers";
import { LANG_COOKIE } from "./i18n";
import type { Lang } from "./types";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "uz" || v === "ru" ? v : "ky";
}
