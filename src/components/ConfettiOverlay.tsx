"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion'; // Import the hook

interface ConfettiOverlayProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ isOpen, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion(); // Use the hook

  const colors = ['#a259ff', '#00FFFF', '#FF00FF', '#fff']; // Accent, Cyan, Fuchsia, White
  const MAX_PARTICLES = 60;
  const PARTICLE_LIFETIME = 400; // ms

  const createParticle = (x: number, y: number): Particle => {
    return {
      x,
      y,
      size: Math.random() * 5 + 2, // 2 to 7
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 10, // -5 to 5
      vy: (Math.random() * -10) - 5, // -15 to -5 (upwards)
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    };
  };

  const updateParticles = (deltaTime: number) => {
    const newParticles: Particle[] = [];
    particlesRef.current.forEach(p => {
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      p.vy += 0.5 * (deltaTime / 16); // Gravity
      p.alpha -= (deltaTime / PARTICLE_LIFETIME);
      p.rotation += p.rotationSpeed * (deltaTime / 16);

      if (p.alpha > 0) {
        newParticles.push(p);
      }
    });
    particlesRef.current = newParticles;
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
  };

  useEffect(() => {
    if (!isOpen || prefersReducedMotion) { // Disable if reduced motion is preferred
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fill parent
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initial burst of particles from the center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particlesRef.current.push(createParticle(centerX, centerY));
    }

    let lastTime = performance.now();
    const animateLoop = (currentTime: DOMHighResTimeStamp) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      updateParticles(deltaTime);
      drawParticles(ctx);

      if (particlesRef.current.length > 0) {
        animationFrameIdRef.current = requestAnimationFrame(animateLoop);
      } else {
        animationFrameIdRef.current = null;
        onComplete(); // All particles gone, animation complete
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isOpen, onComplete, prefersReducedMotion]); // Add prefersReducedMotion to dependencies

  return (
    <AnimatePresence>
      {isOpen && !prefersReducedMotion && ( // Only render if open AND not reduced motion
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 pointer-events-none z-50"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfettiOverlay;