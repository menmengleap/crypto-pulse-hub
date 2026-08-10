import { motion } from "motion/react";

/** Extremely low-opacity market backdrop: grid, candles, indicator line, particles. */
export function MarketBackdrop({ dense = false }: { dense?: boolean }) {
  const candles = Array.from({ length: dense ? 28 : 18 }, (_, i) => {
    const seedA = Math.sin(i * 12.9898) * 43758.5453;
    const seedB = Math.sin(i * 78.233) * 12345.6789;
    const a = seedA - Math.floor(seedA);
    const b = seedB - Math.floor(seedB);
    return { i, body: 18 + a * 46, offset: 20 + b * 100, wick: 12 + a * 22 };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-[0.5]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,oklch(1_0_0/0.08),transparent_60%)]" />

      <svg
        className="absolute inset-x-0 bottom-0 h-[52%] w-full opacity-[0.16]"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
      >
        {candles.map((c) => (
          <g key={c.i} stroke="currentColor" className="text-foreground">
            <line
              x1={16 + c.i * 28}
              x2={16 + c.i * 28}
              y1={c.offset - c.wick}
              y2={c.offset + c.body + c.wick}
              strokeWidth="0.6"
            />
            <rect
              x={11 + c.i * 28}
              y={c.offset}
              width="10"
              height={c.body}
              fill="none"
              strokeWidth="0.8"
            />
          </g>
        ))}
        <motion.path
          d="M0 150 C 120 90, 200 170, 320 120 S 520 60, 640 110 S 760 150, 800 96"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
        />
      </svg>

      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-px w-px rounded-full bg-foreground"
          style={{ left: `${(i * 8.3 + 4) % 100}%`, top: `${(i * 13.7 + 10) % 90}%` }}
          initial={{ opacity: 0.05, y: 0 }}
          animate={{ opacity: [0.05, 0.35, 0.05], y: [-6, 6, -6] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
