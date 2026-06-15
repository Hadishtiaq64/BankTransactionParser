import Link from "next/link";
import { ArrowRight, FileUp, Sparkles, LayoutDashboard } from "lucide-react";
import SmokeBackground from "@/components/SmokeBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import ChromeCenterpiece from "@/components/ChromeCenterpiece";
import Reveal from "@/components/Reveal";
import LogoMarquee from "@/components/LogoMarquee";

const STEPS = [
  {
    icon: FileUp,
    title: "Upload CSV",
    body: "Drop in a bank export. Lustre parses messy statements and detail pages automatically.",
  },
  {
    icon: Sparkles,
    title: "AI Categorizes & Detects Anomalies",
    body: "Claude sorts every transaction into clean categories and flags unusual spending with plain-language reasons.",
  },
  {
    icon: LayoutDashboard,
    title: "View Insights Dashboard",
    body: "See your spending breakdown, category trends, and flagged outliers in one calm, monochrome view.",
  },
];

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <SmokeBackground />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-12 pb-24 md:grid-cols-2 md:pt-20 md:pb-32">
          <Reveal>
            <div className="flex flex-col items-start">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-cream-card/60 px-3.5 py-1.5 text-xs font-medium tracking-wide text-gray-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                AI-native financial intelligence
              </span>

              <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
                AI-Powered
                <br />
                Transaction
                <br />
                Intelligence
              </h1>

              <p className="mt-7 max-w-md text-lg leading-relaxed text-gray-1">
                Upload your transactions and watch them organize themselves.
                Lustre categorizes spending and surfaces anomalies — quietly,
                instantly, beautifully.
              </p>

              <div className="mt-9 flex items-center gap-4">
                <Link
                  href="/app"
                  className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-cream transition-transform duration-200 hover:scale-[1.03] active:scale-95"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
                >
                  Live demo
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="flex items-center justify-center md:justify-end">
            <ChromeCenterpiece />
          </div>
        </section>

        {/* Inspired-by banks */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-gray-2">
              Used by teams inspired by
            </p>
            <div className="mt-8">
              <LogoMarquee />
            </div>
            <p className="mt-8 text-center text-xs text-gray-2">
              Demo project — not affiliated with or endorsed by these
              institutions.
            </p>
          </Reveal>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-gray-1">
              Three steps from raw export to clear insight.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.12}>
                <div className="group h-full rounded-3xl border border-[var(--line)] bg-cream-card/70 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-cream">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-3">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-1">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border border-[var(--line)] bg-ink px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
                See your money clearly.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-cream/60">
                Upload a CSV and get an instant, AI-categorized breakdown with
                anomaly detection.
              </p>
              <Link
                href="/app"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-medium text-ink transition-transform duration-200 hover:scale-[1.03] active:scale-95"
              >
                Open the dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
