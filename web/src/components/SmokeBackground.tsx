export default function SmokeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cream"
    >
      {/* Diagonal smoke plumes built from soft radial/linear grayscale gradients */}
      <div
        className="absolute -top-1/3 -left-1/4 h-[90vh] w-[90vh] rounded-full opacity-70 blur-[90px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(120,120,124,0.45), rgba(120,120,124,0) 70%)",
          animation: "drift 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/4 -right-1/5 h-[80vh] w-[80vh] rounded-full opacity-60 blur-[110px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(60,60,66,0.30), rgba(60,60,66,0) 70%)",
          animation: "drift-slow 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-25%] left-1/4 h-[75vh] w-[120vh] -rotate-12 opacity-50 blur-[120px]"
        style={{
          background:
            "linear-gradient(115deg, rgba(160,160,164,0) 0%, rgba(90,90,96,0.28) 45%, rgba(160,160,164,0) 80%)",
          animation: "drift 38s ease-in-out infinite",
        }}
      />
      {/* Faint grain/vignette to keep it premium and matte */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(244,242,238,0) 55%, rgba(244,242,238,0.9) 100%)",
        }}
      />
    </div>
  );
}
