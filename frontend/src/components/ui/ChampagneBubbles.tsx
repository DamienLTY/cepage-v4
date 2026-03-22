/**
 * SpaceParticles — Particules spatiales neon en arrière-plan
 *
 * Orbes colorées (indigo, cyan, violet, crimson) qui flottent, réagissent
 * à la souris/au doigt, et créent une atmosphère "deep space vineyard".
 * Désactivée automatiquement en mode admin (prop disabled).
 */

import { useRef, useEffect } from 'react';

interface Props {
  disabled: boolean;
}

// Palette neon Deep Space
const COLORS = [
  { r: 99,  g: 102, b: 241 }, // indigo
  { r: 34,  g: 211, b: 238 }, // cyan
  { r: 139, g: 92,  b: 246 }, // violet
  { r: 244, g: 63,  b: 94  }, // crimson
  { r: 245, g: 158, b: 11  }, // amber
  { r: 16,  g: 185, b: 129 }, // emerald
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  life: number; maxLife: number;
  color: { r: number; g: number; b: number };
  type: 'orb' | 'dot' | 'ring';
  popping: boolean; popFrame: number;
  angle: number; angleSpeed: number;
}

export default function ChampagneBubbles({ disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -200, y: -200 });
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });

    let animId: number;
    let lastSpawn = 0;
    let frameCount = 0;

    const spawnParticle = (canvas: HTMLCanvasElement): Particle => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const types: Particle['type'][] = ['orb', 'orb', 'dot', 'ring'];
      const type = types[Math.floor(Math.random() * types.length)];
      const size = type === 'ring' ? 8 + Math.random() * 12 :
                   type === 'orb'  ? 2 + Math.random() * 5  :
                                     1 + Math.random() * 2;
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.6),
        size, opacity: 0.5 + Math.random() * 0.4,
        life: 0, maxLife: 150 + Math.random() * 120,
        color, type,
        popping: false, popFrame: 0,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.03,
      };
    };

    const drawOrb = (ctx: CanvasRenderingContext2D, p: Particle, alpha: number) => {
      const { r, g, b } = p.color;
      const grad = ctx.createRadialGradient(
        p.x - p.size * 0.25, p.y - p.size * 0.25, 0,
        p.x, p.y, p.size
      );
      grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.6})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.7})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Glow
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.8})`;
      ctx.shadowBlur = p.size * 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawDot = (ctx: CanvasRenderingContext2D, p: Particle, alpha: number) => {
      const { r, g, b } = p.color;
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawRing = (ctx: CanvasRenderingContext2D, p: Particle, alpha: number) => {
      const { r, g, b } = p.color;
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.7})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Reflet interne
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.2})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn toutes les 350ms
      if (time - lastSpawn > 350) {
        lastSpawn = time;
        if (particlesRef.current.length < 55) {
          particlesRef.current.push(spawnParticle(canvas));
        }
      }

      // Init burst de particules au démarrage
      if (frameCount === 1) {
        for (let i = 0; i < 25; i++) {
          const p = spawnParticle(canvas);
          p.y = Math.random() * canvas.height;
          p.life = Math.random() * 60;
          particlesRef.current.push(p);
        }
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        p.angle += p.angleSpeed;

        // Interaction souris — repulsion douce
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && !p.popping) {
          p.vx += (dx / dist) * 0.12;
          p.vy += (dy / dist) * 0.12;
          // Friction légère
          p.vx *= 0.96;
          p.vy *= 0.96;
        }

        if (p.popping) {
          p.popFrame++;
          if (p.popFrame > 10) return false;
          const { r, g, b } = p.color;
          const popAlpha = Math.max(0, 0.5 - p.popFrame * 0.05);
          const popSize = p.size * (1 + p.popFrame * 0.3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, popSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${popAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          return true;
        }

        // Mouvement sinusoïdal léger
        p.x += p.vx + Math.sin(p.angle) * 0.25;
        p.y += p.vy;

        // Pop en haut ou en fin de vie
        if (p.y < canvas.height * 0.05 || p.life > p.maxLife) {
          p.popping = true;
          return true;
        }

        // Alpha selon la durée de vie (fondu in/out)
        const lifeRatio = p.life / p.maxLife;
        const fadeIn  = Math.min(1, p.life / 20);
        const fadeOut = Math.max(0, 1 - Math.max(0, lifeRatio - 0.7) / 0.3);
        const alpha = p.opacity * fadeIn * fadeOut;

        if (p.type === 'orb')  drawOrb(ctx, p, alpha);
        if (p.type === 'dot')  drawDot(ctx, p, alpha);
        if (p.type === 'ring') drawRing(ctx, p, alpha);

        return true;
      });
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
        opacity: 0.6,
      }}
    />
  );
}
