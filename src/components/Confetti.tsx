import { useMemo } from "react";

const COLORS = ["bg-primary", "bg-ice", "bg-mint", "bg-foreground"];

export function Confetti({ count = 24 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        left: Math.round(Math.random() * 100),
        tx: Math.round((Math.random() - 0.5) * 160),
        ty: 260 + Math.round(Math.random() * 320),
        delay: Math.random() * 0.5,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-100 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.key}
          className={`confetti-piece absolute top-16 size-2 ${p.color} ${p.round ? "rounded-full" : "rounded-[2px]"}`}
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
