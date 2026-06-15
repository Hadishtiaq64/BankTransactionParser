import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-4 w-4 rotate-45 rounded-[4px]"
            style={{
              background:
                "linear-gradient(135deg, #fafafa 0%, #9a9a9f 38%, #2b2b2e 62%, #d8d7d3 100%)",
            }}
          />
          <span className="text-sm font-medium text-ink">Lustre</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-1">
          <Link href="/app" className="transition-colors hover:text-ink">
            Dashboard
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink"
          >
            GitHub
          </a>
        </div>

        <p className="text-xs text-gray-2">
          © {new Date().getFullYear()} Lustre. Demo project.
        </p>
      </div>
    </footer>
  );
}
