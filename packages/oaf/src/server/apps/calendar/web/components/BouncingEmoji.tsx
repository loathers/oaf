import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
};

const GRAVITY = 300;
const DAMPING = 0.7;
const EMOJIS = ["🥗", "🥒", "🥗"];

export function BouncingEmoji() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = EMOJIS.map((emoji) => ({
      x: Math.random() * 60 + 10,
      y: Math.random() * 20,
      vx: (Math.random() - 0.5) * 100,
      vy: 0,
      emoji,
      size: 14,
    }));

    let lastTime = 0;
    let animId = 0;

    function resize() {
      const rect = container!.getBoundingClientRect();
      canvas!.width = rect.width;
      canvas!.height = rect.height;
    }

    resize();

    function animate(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Bounce off walls
        if (p.x < p.size / 2) {
          p.x = p.size / 2;
          p.vx = Math.abs(p.vx) * DAMPING;
        }
        if (p.x > w - p.size / 2) {
          p.x = w - p.size / 2;
          p.vx = -Math.abs(p.vx) * DAMPING;
        }

        // Bounce off floor
        if (p.y > h - p.size / 2) {
          p.y = h - p.size / 2;
          p.vy = -Math.abs(p.vy) * DAMPING;

          // Add random horizontal kick to keep things lively
          if (Math.abs(p.vy) < 30) {
            p.vy = -(80 + Math.random() * 120);
            p.vx = (Math.random() - 0.5) * 150;
          }
        }

        // Bounce off ceiling
        if (p.y < p.size / 2) {
          p.y = p.size / 2;
          p.vy = Math.abs(p.vy) * DAMPING;
        }

        ctx!.font = `${p.size}px serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(p.emoji, p.x, p.y);
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
