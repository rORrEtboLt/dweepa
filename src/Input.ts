export class Input {
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  clicked = false;
  rightClicked = false;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousemove', (e) => this.handleMove(canvas, e));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.clicked = true;
      } else if (e.button === 2) {
        this.rightClicked = true;
      }
    });
    canvas.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (!t) return;
      this.handleMove(canvas, t);
      this.mouseDown = true;
      this.clicked = true;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) this.handleMove(canvas, t);
    }, { passive: true });
    canvas.addEventListener('touchend', () => {
      this.mouseDown = false;
    });
  }

  private handleMove(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
    const r = canvas.getBoundingClientRect();
    this.mouseX = e.clientX - r.left;
    this.mouseY = e.clientY - r.top;
  }

  endFrame() {
    this.clicked = false;
    this.rightClicked = false;
  }
}
