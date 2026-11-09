"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBooks, IconHome, IconLibrary, IconSparkle, IconUser } from "./icons";

export function TabBar({ labels }: { labels: Record<"home" | "books" | "lib" | "coach" | "prog", string> }) {
  const path = usePathname();
  if (path.startsWith("/read/") || path.startsWith("/admin")) return null;
  const tabs = [
    { href: "/", label: labels.home, Icon: IconHome, on: path === "/" },
    { href: "/books", label: labels.books, Icon: IconBooks, on: path.startsWith("/books") },
    { href: "/library", label: labels.lib, Icon: IconLibrary, on: path.startsWith("/library") },
    { href: "/coach", label: labels.coach, Icon: IconSparkle, on: path.startsWith("/coach") },
    { href: "/progress", label: labels.prog, Icon: IconUser, on: path.startsWith("/progress") || path.startsWith("/orders") },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t glass-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-[560px] grid-cols-5">
        {tabs.map(({ href, label, Icon, on }) => (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={`grid justify-items-center gap-1 px-0.5 pb-2 pt-2.5 text-[11.5px] font-medium ${on ? "text-accent-deep" : "text-muted"}`}>
            <Icon className="h-6 w-6" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
