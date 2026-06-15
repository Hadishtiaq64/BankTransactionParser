import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="inline-block h-5 w-5 rotate-45 rounded-[5px]"
            style={{
              background:
                "linear-gradient(135deg, #fafafa 0%, #9a9a9f 38%, #2b2b2e 62%, #d8d7d3 100%)",
              boxShadow:
                "inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)",
            }}
          />
          <span className="text-lg font-semibold tracking-tight text-ink">
            Lustre
          </span>
        </Link>

        <nav className="flex items-center gap-7">
          <Link
            href="/app"
            className="hidden text-sm font-medium text-gray-1 transition-colors hover:text-ink sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-transform duration-200 hover:scale-[1.03] active:scale-95"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
