"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTabs({ labels, isAdmin }: { labels: { books: string; orders: string; access: string; staff: string }; isAdmin: boolean }) {
  const p = usePathname();
  const tabs = [
    { href: "/admin", label: labels.books, on: p === "/admin" || p.startsWith("/admin/books") },
    { href: "/admin/orders", label: labels.orders, on: p.startsWith("/admin/orders") },
    { href: "/admin/access", label: labels.access, on: p.startsWith("/admin/access") },
    ...(isAdmin ? [{ href: "/admin/staff", label: labels.staff, on: p.startsWith("/admin/staff") }] : []),
  ];
  return (
    <nav className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto rounded-[14px] bg-soft p-1.5">
      {tabs.map((x) => (
        <Link key={x.href} href={x.href} aria-current={x.on ? "page" : undefined}
          className={`flex-1 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-center text-sm font-semibold ${x.on ? "bg-card text-ink shadow-sm" : "text-muted"}`}>
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
