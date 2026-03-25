export default function WavyBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.06] overflow-hidden">
      <svg
        className="w-[200vw] h-[200vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#wave-grad)"
          d="M0 50 Q25 25 50 50 T100 50 L100 100 L0 100 Z"
        />
        <defs>
          <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(27, 100%, 55%)" />
            <stop offset="33%" stopColor="hsl(14, 100%, 55%)" />
            <stop offset="66%" stopColor="hsl(290, 98%, 74%)" />
            <stop offset="100%" stopColor="hsl(217, 100%, 65%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 bg-background mix-blend-overlay"></div>
    </div>
  );
}
