export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, color: string, radius = 3) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.radius = radius;
    this.life = 0.45 + Math.random() * 0.25;
    this.maxLife = this.life;
  }

  update(dt: number): void {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }
}
