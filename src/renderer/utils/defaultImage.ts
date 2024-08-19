export function defaultImage(): ImageData {
  const canvas = new OffscreenCanvas(100, 100);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f00';
    ctx.fillRect(0,0,100,100);
    ctx.fillStyle = '#0f0';
    ctx.moveTo(0,100);
    ctx.lineTo(100,100);
    ctx.lineTo(100,0);
    ctx.fill();
    return ctx.getImageData(0, 0, 100, 100);
  }
  return new ImageData(100, 100);
}
