import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const loading = document.getElementById('loading');

function start() {
  canvas.classList.add('ready');
  if (loading) loading.classList.add('hidden');
  new Game(canvas).start();
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(start);
} else {
  start();
}
