"use client";

/* eslint-disable @next/next/no-img-element */

const LOGOS = [
  { src: "/logos/cibc.png", alt: "CIBC" },
  { src: "/logos/td-v2.png", alt: "TD Bank" },
  { src: "/logos/scotiabank-v2.png", alt: "Scotiabank" },
  { src: "/logos/rbc-v2.png", alt: "RBC" },
  { src: "/logos/bmo.png", alt: "BMO" },
];

function Sequence() {
  return (
    <ul className="flex shrink-0 items-center gap-x-20 px-10" aria-hidden>
      {LOGOS.map((logo) => (
        <li key={logo.alt} className="flex items-center">
          <img
            src={logo.src}
            alt={logo.alt}
            className="h-9 w-auto object-contain opacity-60 grayscale transition-opacity duration-300 hover:opacity-100 sm:h-11"
            style={{ mixBlendMode: "multiply" }}
          />
        </li>
      ))}
    </ul>
  );
}

export default function LogoMarquee() {
  return (
    <div
      className="group relative overflow-hidden py-2"
      style={{
        // Soft edge fade so logos appear/disappear smoothly at both ends.
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        maskImage:
          "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <div
        className="flex w-max group-hover:[animation-play-state:paused]"
        style={{ animation: "marquee-ltr 32s linear infinite" }}
      >
        <Sequence />
        <Sequence />
      </div>
    </div>
  );
}
