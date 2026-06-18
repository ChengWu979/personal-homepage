const canvas = document.querySelector("#network-canvas");
const ctx = canvas.getContext("2d");
const root = document.documentElement;
const glow = document.querySelector(".cursor-glow");
const tiltTarget = document.querySelector(".tilt-target");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let scrollRatio = 0;

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  active: false
};

function particleCount() {
  if (reduceMotion) return Math.min(34, Math.floor(window.innerWidth / 34));
  return window.innerWidth < 760 ? 58 : 110;
}

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  particles = Array.from({ length: particleCount() }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.48,
    vy: (Math.random() - 0.5) * 0.48,
    size: Math.random() * 1.8 + 0.7,
    pulse: Math.random() * Math.PI * 2
  }));
}

function drawGrid(time) {
  const grid = 72;
  const shift = (time * 0.012 + scrollRatio * 160) % grid;
  ctx.strokeStyle = "rgba(77, 231, 255, 0.045)";
  ctx.lineWidth = 1;

  for (let x = -grid; x < width + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + shift * 0.35, 0);
    ctx.lineTo(x - shift * 0.35, height);
    ctx.stroke();
  }

  for (let y = -grid; y < height + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + shift);
    ctx.lineTo(width, y + shift);
    ctx.stroke();
  }
}

function drawParticles(time) {
  const speed = reduceMotion ? 0.15 : 0.52 + scrollRatio * 0.9;

  for (const p of particles) {
    const dx = pointer.x - p.x;
    const dy = pointer.y - p.y;
    const dist = Math.hypot(dx, dy);

    if (pointer.active && dist < 180 && !reduceMotion) {
      const force = (180 - dist) / 180;
      p.vx -= (dx / Math.max(dist, 1)) * force * 0.018;
      p.vy -= (dy / Math.max(dist, 1)) * force * 0.018;
    }

    p.x += p.vx * speed;
    p.y += p.vy * speed;
    p.vx *= 0.995;
    p.vy *= 0.995;

    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;
  }

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j += 1) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 128) continue;

      const alpha = (1 - dist / 128) * 0.22;
      ctx.strokeStyle = `rgba(77, 231, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (const p of particles) {
    const pulse = Math.sin(time * 0.003 + p.pulse) * 0.45 + 0.55;
    ctx.fillStyle = `rgba(199, 255, 63, ${0.28 + pulse * 0.42})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size + pulse * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScanline(time) {
  const y = (time * 0.12 + scrollRatio * height * 1.4) % (height + 180) - 90;
  const gradient = ctx.createLinearGradient(0, y - 70, 0, y + 70);
  gradient.addColorStop(0, "rgba(77, 231, 255, 0)");
  gradient.addColorStop(0.5, "rgba(77, 231, 255, 0.13)");
  gradient.addColorStop(1, "rgba(77, 231, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y - 70, width, 140);
}

function animate(time = 0) {
  ctx.clearRect(0, 0, width, height);
  drawGrid(time);
  drawParticles(time);
  if (!reduceMotion) drawScanline(time);
  requestAnimationFrame(animate);
}

function updateScrollState() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollRatio = window.scrollY / maxScroll;
  root.style.setProperty("--scroll-progress", scrollRatio.toFixed(4));
  root.style.setProperty("--grid-shift", `${Math.round(scrollRatio * 110)}px`);

  document.querySelectorAll(".parallax").forEach((el) => {
    if (reduceMotion) return;
    const speed = Number(el.dataset.speed || 0.08);
    el.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
  });
}

function updatePointer(event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  root.style.setProperty("--cursor-x", `${event.clientX}px`);
  root.style.setProperty("--cursor-y", `${event.clientY}px`);

  if (!tiltTarget || reduceMotion) return;
  const rect = tiltTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  tiltTarget.style.setProperty("--tilt-y", `${x * 5}deg`);
  tiltTarget.style.setProperty("--tilt-x", `${y * -5}deg`);
}

function resetPointer() {
  pointer.active = false;
  glow.style.opacity = "0.35";
  if (tiltTarget) {
    tiltTarget.style.setProperty("--tilt-x", "0deg");
    tiltTarget.style.setProperty("--tilt-y", "0deg");
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
window.addEventListener("resize", resizeCanvas, { passive: true });
window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });
window.addEventListener("pointerleave", resetPointer, { passive: true });

resizeCanvas();
updateScrollState();
animate();

