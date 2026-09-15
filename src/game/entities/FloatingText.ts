export class FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  life = 0.9;
  maxLife = 0.9;

  constructor(text: string, x: number, y: number, color: string) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
  }

  update(dt: number): void {
    this.life -= dt;
    this.y -= 28 * dt;
  }
}
