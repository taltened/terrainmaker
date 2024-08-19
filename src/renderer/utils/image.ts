export const scaleImage = (content: ImageData, width: number, height: number) =>
createImageBitmap(content, {
  resizeWidth: width,
  resizeHeight: height,
  resizeQuality: 'high',
});

export const drawScaled = (ctx: CanvasRenderingContext2D, content: ImageData, x: number, y: number, width: number, height: number) =>
scaleImage(content, width, height).then(data => {
  ctx.clearRect(x, y, width, height);
  ctx.drawImage(data, x, y);
  return data;
});
