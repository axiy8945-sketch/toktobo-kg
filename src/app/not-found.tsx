import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap max-w-[560px] pt-14">
      <div className="grid justify-items-start gap-4 rounded-hero bg-soft p-8">
        <span className="eb">404</span>
        <h1 className="text-3xl font-semibold">Барак табылган жок</h1>
        <p className="text-ink2">Sahifa topilmadi · Страница не найдена</p>
        <Link href="/" className="btn btn-sm">ТОКТОБО</Link>
      </div>
    </div>
  );
}
