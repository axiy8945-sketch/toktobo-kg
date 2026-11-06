import type { Metadata, Viewport } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { Providers } from "@/components/Providers";
import { getLang } from "@/lib/lang";
import { getSession } from "@/lib/supabase/server";
import { getStats } from "@/lib/data";
import { t } from "@/lib/i18n";

const sans = Onest({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ТОКТОБО KG", template: "%s · ТОКТОБО KG" },
  description: "Кыргызстандын санариптик китеп үйү: онлайн окуу, кагаз китептер, AI окуу коучу.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "ТОКТОБО", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const { user, profile } = await getSession();
  const isStaff = profile?.role === "staff" || profile?.role === "admin";
  const goal = profile?.daily_goal ?? 15;
  const stats = user ? await getStats(user.id, goal) : null;
  const labels = {
    home: t(lang, "nav_home"), books: t(lang, "nav_books"), lib: t(lang, "nav_mylib"),
    coach: t(lang, "nav_coach"), prog: t(lang, "nav_profile"),
  };
  return (
    <html lang={lang} className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans text-base leading-normal">
        <Providers lang={lang}>
          <Header lang={lang} loggedIn={!!user} isStaff={isStaff} today={stats ? { min: stats.todayMin, goal } : null} />
          <main className="pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-16">{children}</main>
          <TabBar labels={labels} />
        </Providers>
      </body>
    </html>
  );
}
