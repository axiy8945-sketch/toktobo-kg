"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBooks, IconCoach, IconHome, IconProg, IconRead } from "./icons";

export function TabBar({ labels }: { labels: Record<"home" | "books" | "lib" | "coach" | "prog", string> }) {
  const path = usePathname();
  if (path.startsWith("/read/") || path.startsWith("/admin")) return null;
  const tabs = [
    { href: "/", label: labels.home, Icon: IconHome, on: path === "/" },
    { href: "/books", label: labels.books, Icon: IconBooks, on: path.startsWith("/books") },
    { href: "/library", label: labels.lib, Icon: IconRead, on: path.startsWith("/library") },
    { href: "/coach", label: labels.coach, Icon: IconCoach, on: path.startsWith("/coach") },
    { href: "/progress", label: labels.prog, Icon: IconProg, on: path.startsWith("/progress") },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-[560px] grid-cols-5">
        {tabs.map(({ href, label, Icon, on }) => (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={`grid justify-items-center gap-0.5 px-0.5 pb-2 pt-2.5 text-[11px] font-medium ${on ? "text-accent" : "text-muted"}`}>
            <Icon className="h-[23px] w-[23px]" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
