export class Input {
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  clicked = false;
  rightClicked = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;

  keys: Set<string> = new Set();
  keysPressed: Set<string> = new Set();

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
      this.longPressTriggered = false;
      this.longPressTimer = setTimeout(() => {
        this.rightClicked = true;
        this.longPressTriggered = true;
      }, 500);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) {
        const r = canvas.getBoundingClientRect();
        const dx = t.clientX - r.left - this.mouseX;
        const dy = t.clientY - r.top - this.mouseY;
        if (Math.hypot(dx, dy) > 10) this.cancelLongPress();
        this.handleMove(canvas, t);
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      this.cancelLongPress();
      this.mouseDown = false;
      if (this.longPressTriggered) {
        this.clicked = false;
        this.longPressTriggered = false;
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      this.keysPressed.add(e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  private cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private handleMove(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
    const r = canvas.getBoundingClientRect();
    this.mouseX = e.clientX - r.left;
    this.mouseY = e.clientY - r.top;
  }

  wasPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  endFrame() {
    this.clicked = false;
    this.rightClicked = false;
    this.keysPressed.clear();
  }
}
