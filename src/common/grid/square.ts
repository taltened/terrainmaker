import { flow, pipe } from 'fp-ts/function';
import { sequence } from 'fp-ts/ReadonlyNonEmptyArray';
import { mapFst, mapSnd } from 'fp-ts/ReadonlyTuple';
import { Applicative, flatMap, map } from 'fp-ts/State';
import { mapBoth } from '../readonlyPair';
import { Grid } from './common';
import { deserializeByte, serializeByte } from '../serialization';
import { LayerProps, layers } from '../layer/registry';
import { scaleImage } from '../../renderer/utils/image';

export const squareGridType = 'square' as const;

export interface SquareGridProps {
  readonly type: typeof squareGridType;
  readonly size: number;
  readonly rows: number;
  readonly columns: number;
}

const isSquareGridProps = (x: SquareGridProps | unknown): x is SquareGridProps => (x as SquareGridProps)?.type === squareGridType;

const getCoordinates = (props: SquareGridProps, index: number): readonly [x: number, y: number, z: number] => [
  index % (props.columns*2+1),
  Math.floor(index / (props.columns*2+1)) % (props.rows*2+1),
  Math.floor(index / (props.columns*2+1) / (props.rows*2+1)),
];
const getContentIndex = (props: SquareGridProps, x: number, y: number, z: number) => (props.columns*2+1)*(props.rows*2+1)*z + (props.columns*2+1)*y + x;
const getContentLength = (props: SquareGridProps) => (props.columns*2+1) * (props.rows*2+1);

const to9Bits = (tl: boolean, tc: boolean, tr: boolean, cl: boolean, cc: boolean, cr: boolean, bl: boolean, bc: boolean, br: boolean) =>
(tl ? 0b100000000 : 0) |
(tc ? 0b010000000 : 0) |
(tr ? 0b001000000 : 0) |
(cl ? 0b000100000 : 0) |
(cc ? 0b000010000 : 0) |
(cr ? 0b000001000 : 0) |
(bl ? 0b000000100 : 0) |
(bc ? 0b000000010 : 0) |
(br ? 0b000000001 : 0);
const cellTo9Bits = (props: SquareGridProps, content: readonly boolean[], x: number, y: number, z: number) =>
to9Bits(
  content[getContentIndex(props, x+x, y+y, z)],
  content[getContentIndex(props, x+x+1, y+y, z)],
  content[getContentIndex(props, x+x+2, y+y, z)],
  content[getContentIndex(props, x+x, y+y+1, z)],
  content[getContentIndex(props, x+x+1, y+y+1, z)],
  content[getContentIndex(props, x+x+2, y+y+1, z)],
  content[getContentIndex(props, x+x, y+y+2, z)],
  content[getContentIndex(props, x+x+1, y+y+2, z)],
  content[getContentIndex(props, x+x+2, y+y+2, z)],
);

const drawTrapVert = (ctx: OffscreenCanvasRenderingContext2D, x0: number, x1: number, y00: number, y01: number, y11: number, y10: number) => {
  ctx.moveTo(x0, y00);
  ctx.lineTo(x0, y01);
  ctx.lineTo(x1, y11);
  ctx.lineTo(x1, y10);
};

const drawTrapHoriz = (ctx: OffscreenCanvasRenderingContext2D, y0: number, y1: number, x00: number, x01: number, x11: number, x10: number) => {
  ctx.moveTo(x00, y0);
  ctx.lineTo(x01, y0);
  ctx.lineTo(x11, y1);
  ctx.lineTo(x10, y1);
};

const sliceImage = (props: SquareGridProps, layerProps: LayerProps, image: ImageBitmap, contentBits: number) => {
  const wallRatio = layerProps.thickness / 512;
  const shadowRatio = layerProps.shadowThickness / 512;
  const shadowColor =
    [layerProps.shadowColor >> 16, layerProps.shadowColor >> 8, layerProps.shadowColor]
    .map(x => x & 0xff)
    .join(',');
  const lightShadow = `rgba(${shadowColor},${0})`;
  const darkShadow = `rgba(${shadowColor},${layerProps.shadowAlpha / 0xff})`;
  const p = [
    0,
    wallRatio-shadowRatio,
    wallRatio,
    wallRatio+shadowRatio,
    1-wallRatio-shadowRatio,
    1-wallRatio,
    1-wallRatio+shadowRatio,
    1
  ].map(x => Math.round(x*props.size));
  const canvas = new OffscreenCanvas(p[7], p[7]);
  const ctx = canvas.getContext('2d');
  const empty = ~contentBits;
  if (ctx) {
    // fill the full cell
    ctx.drawImage(image, p[0], p[0]);
    // empty out unfilled sections
    if (empty & 0b100000000) ctx.clearRect(p[0], p[0], p[2]-p[0], p[2] - p[0]);
    if (empty & 0b010000000) ctx.clearRect(p[2], p[0], p[5]-p[2], p[2] - p[0]);
    if (empty & 0b001000000) ctx.clearRect(p[5], p[0], p[7]-p[5], p[2] - p[0]);
    if (empty & 0b000100000) ctx.clearRect(p[0], p[2], p[2]-p[0], p[5] - p[2]);
    if (empty & 0b000010000) ctx.clearRect(p[2], p[2], p[5]-p[2], p[5] - p[2]);
    if (empty & 0b000001000) ctx.clearRect(p[5], p[2], p[7]-p[5], p[5] - p[2]);
    if (empty & 0b000000100) ctx.clearRect(p[0], p[5], p[2]-p[0], p[7] - p[5]);
    if (empty & 0b000000010) ctx.clearRect(p[2], p[5], p[5]-p[2], p[7] - p[5]);
    if (empty & 0b000000001) ctx.clearRect(p[5], p[5], p[7]-p[5], p[7] - p[5]);
    // apply shadows
    if (shadowRatio > 0 && (contentBits & 0b111111111) && (empty & 0b111111111)) {
      // left side of left cut
      if (empty & 0b100100100) {
        const gradient = ctx.createLinearGradient(p[1], 0, p[2], 0);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000110000) === 0b000100000) {
          // shadow in the center means one joined shadow
          const topLeftY = (empty & 0b110000000) === 0b110000000 ? p[1] :
            (empty & 0b100000000) ? p[0] : p[3];
          const bottomLeftY = (empty & 0b000000110) === 0b000000110 ? p[6] :
            (empty & 0b000000100) ? p[7] : p[4];
          const topRightY = (empty & 0b110000000) === 0b100000000 ? p[0] : p[2];
          const bottomRightY = (empty & 0b000000110) === 0b000000100 ? p[7] : p[5];
          drawTrapVert(ctx, p[1], p[2], topLeftY, bottomLeftY, bottomRightY, topRightY);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b110000000) === 0b100000000) {
            const y = (empty & 0b000100000) ? p[3] : p[1];
            drawTrapVert(ctx, p[1], p[2], p[0], y, p[2], p[0]);
          }
          if ((empty & 0b000000110) === 0b000000100) {
            const y = empty & 0b000100000 ? p[4] : p[6];
            drawTrapVert(ctx, p[1], p[2], y, p[7], p[7], p[5]);
          }
        }
        ctx.fill();
      }
      // right side of left cut
      if (empty & 0b010010010) {
        const gradient = ctx.createLinearGradient(p[3], 0, p[2], 0);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000110000) === 0b000010000) {
          // shadow in the center means one joined shadow
          const topRightY = (empty & 0b110000000) === 0b110000000 ? p[1] :
            (empty & 0b010000000) ? p[0] : p[3];
          const bottomRightY = (empty & 0b000000110) === 0b000000110 ? p[6] :
            (empty & 0b000000010) ? p[7] : p[4];
          const topLeftY = (empty & 0b110000000) === 0b010000000 ? p[0] : p[2];
          const bottomLeftY = (empty & 0b000000110) === 0b000000010 ? p[7] : p[5];
          drawTrapVert(ctx, p[2], p[3], topLeftY, bottomLeftY, bottomRightY, topRightY);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b110000000) === 0b010000000) {
            const y = (empty & 0b000010000) ? p[3] : p[1];
            drawTrapVert(ctx, p[2], p[3], p[0], p[2], y, p[0]);
          }
          if ((empty & 0b000000110) === 0b000000010) {
            const y = (empty & 0b000010000) ? p[4] : p[6];
            drawTrapVert(ctx, p[2], p[3], p[5], p[7], p[7], y);
          }
        }
        ctx.fill();
      }
      // left side of right cut
      if (empty & 0b010010010) {
        const gradient = ctx.createLinearGradient(p[4], 0, p[5], 0);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000011000) === 0b000010000) {
          // shadow in the center means one joined shadow
          const topLeftY = (empty & 0b011000000) === 0b011000000 ? p[1] :
            (empty & 0b010000000) ? p[0] : p[3];
          const bottomLeftY = (empty & 0b000000011) === 0b000000011 ? p[6] :
            (empty & 0b000000010) ? p[7] : p[4];
          const topRightY = (empty & 0b011000000) === 0b010000000 ? p[0] : p[2];
          const bottomRightY = (empty & 0b000000011) === 0b000000010 ? p[7] : p[5];
          drawTrapVert(ctx, p[4], p[5], topLeftY, bottomLeftY, bottomRightY, topRightY);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b011000000) === 0b010000000) {
            const y = (empty & 0b000010000) ? p[3] : p[1];
            drawTrapVert(ctx, p[4], p[5], p[0], y, p[2], p[0]);
          }
          if ((empty & 0b000000011) === 0b000000010) {
            const y = empty & 0b000010000 ? p[4] : p[6];
            drawTrapVert(ctx, p[4], p[5], y, p[7], p[7], p[5]);
          }
        }
        ctx.fill();
      }
      // right side of right cut
      if (empty & 0b001001001) {
        const gradient = ctx.createLinearGradient(p[6], 0, p[5], 0);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000011000) === 0b000001000) {
          // shadow in the center means one joined shadow
          const topRightY = (empty & 0b011000000) === 0b011000000 ? p[1] :
            (empty & 0b001000000) ? p[0] : p[3];
          const bottomRightY = (empty & 0b000000011) === 0b000000011 ? p[6] :
            (empty & 0b000000001) ? p[7] : p[4];
          const topLeftY = (empty & 0b011000000) === 0b001000000 ? p[0] : p[2];
          const bottomLeftY = (empty & 0b000000011) === 0b000000001 ? p[7] : p[5];
          drawTrapVert(ctx, p[5], p[6], topLeftY, bottomLeftY, bottomRightY, topRightY);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b011000000) === 0b001000000) {
            const y = (empty & 0b000001000) ? p[3] : p[1];
            drawTrapVert(ctx, p[5], p[6], p[0], p[2], y, p[0]);
          }
          if ((empty & 0b000000011) === 0b000000001) {
            const y = empty & 0b000001000 ? p[4] : p[6];
            drawTrapVert(ctx, p[5], p[6], p[5], p[7], p[7], y);
          }
        }
        ctx.fill();
      }
      // top side of top cut
      if (empty & 0b111000000) {
        const gradient = ctx.createLinearGradient(0, p[1], 0, p[2]);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b010010000) === 0b010000000) {
          // shadow in the center means one joined shadow
          const topLeftX = (empty & 0b100100000) === 0b100100000 ? p[1] :
            (empty & 0b100000000) ? p[0] : p[3];
          const topRightX = (empty & 0b001001000) === 0b001001000 ? p[6] :
            (empty & 0b001000000) ? p[7] : p[4];
          const bottomLeftX = (empty & 0b100100000) === 0b100000000 ? p[0] : p[2];
          const bottomRightX = (empty & 0b001001000) === 0b001000000 ? p[7] : p[5];
          drawTrapHoriz(ctx, p[1], p[2], topLeftX, topRightX, bottomRightX, bottomLeftX);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b100100000) === 0b100000000) {
            const x = (empty & 0b010000000) ? p[3] : p[1];
            drawTrapHoriz(ctx, p[1], p[2], p[0], x, p[2], p[0]);
          }
          if ((empty & 0b001001000) === 0b001000000) {
            const x = empty & 0b010000000 ? p[4] : p[6];
            drawTrapHoriz(ctx, p[1], p[2], x, p[7], p[7], p[5]);
          }
        }
        ctx.fill();
      }
      // bottom side of top cut
      if (empty & 0b000111000) {
        const gradient = ctx.createLinearGradient(0, p[3], 0, p[2]);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b010010000) === 0b000010000) {
          // shadow in the center means one joined shadow
          const bottomLeftX = (empty & 0b100100000) === 0b100100000 ? p[1] :
            (empty & 0b000100000) ? p[0] : p[3];
          const bottomRightX = (empty & 0b001001000) === 0b001001000 ? p[6] :
            (empty & 0b000001000) ? p[7] : p[4];
          const topLeftX = (empty & 0b100100000) === 0b000100000 ? p[0] : p[2];
          const topRightX = (empty & 0b001001000) === 0b000001000 ? p[7] : p[5];
          drawTrapHoriz(ctx, p[2], p[3], topLeftX, topRightX, bottomRightX, bottomLeftX);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b100100000) === 0b000100000) {
            const x = (empty & 0b000010000) ? p[3] : p[1];
            drawTrapHoriz(ctx, p[2], p[3], p[0], p[2], x, p[0]);
          }
          if ((empty & 0b001001000) === 0b000001000) {
            const x = (empty & 0b000010000) ? p[4] : p[6];
            drawTrapHoriz(ctx, p[2], p[3], p[5], p[7], p[7], x);
          }
        }
        ctx.fill();
      }
      // top side of bottom cut
      if (empty & 0b000111000) {
        const gradient = ctx.createLinearGradient(0, p[4], 0, p[5]);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000010010) === 0b000010000) {
          // shadow in the center means one joined shadow
          const topLeftX = (empty & 0b000100100) === 0b000100100 ? p[1] :
            (empty & 0b000100000) ? p[0] : p[3];
          const topRightX = (empty & 0b000001001) === 0b000001001 ? p[6] :
            (empty & 0b000001000) ? p[7] : p[4];
          const bottomLeftX = (empty & 0b000100100) === 0b000100000 ? p[0] : p[2];
          const bottomRightX = (empty & 0b000001001) === 0b000001000 ? p[7] : p[5];
          drawTrapHoriz(ctx, p[4], p[5], topLeftX, topRightX, bottomRightX, bottomLeftX);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b000100100) === 0b000100000) {
            const x = (empty & 0b000010000) ? p[3] : p[1];
            drawTrapHoriz(ctx, p[4], p[5], p[0], x, p[2], p[0]);
          }
          if ((empty & 0b000001001) === 0b000001000) {
            const x = empty & 0b000010000 ? p[4] : p[6];
            drawTrapHoriz(ctx, p[4], p[5], x, p[7], p[7], p[5]);
          }
        }
        ctx.fill();
      }
      // bottom side of bottom cut
      if (empty & 0b000000111) {
        const gradient = ctx.createLinearGradient(0, p[6], 0, p[5]);
        gradient.addColorStop(0, lightShadow);
        gradient.addColorStop(1, darkShadow);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((empty & 0b000010010) === 0b000000010) {
          // shadow in the center means one joined shadow
          const bottomLeftX = (empty & 0b000100100) === 0b000100100 ? p[1] :
            (empty & 0b000000100) ? p[0] : p[3];
          const bottomRightX = (empty & 0b000001001) === 0b000001001 ? p[6] :
            (empty & 0b000000001) ? p[7] : p[4];
          const topLeftX = (empty & 0b000100100) === 0b000000100 ? p[0] : p[2];
          const topRightX = (empty & 0b000001001) === 0b000000001 ? p[7] : p[5];
          drawTrapHoriz(ctx, p[5], p[6], topLeftX, topRightX, bottomRightX, bottomLeftX);
        } else {
          // no shadow in the center means separate shadows for the ends
          if ((empty & 0b000100100) === 0b000000100) {
            const x = (empty & 0b000000010) ? p[3] : p[1];
            drawTrapHoriz(ctx, p[5], p[6], p[0], p[2], x, p[0]);
          }
          if ((empty & 0b000001001) === 0b000000001) {
            const x = empty & 0b000000010 ? p[4] : p[6];
            drawTrapHoriz(ctx, p[5], p[6], p[5], p[7], p[7], x);
          }
        }
        ctx.fill();
      }
    }
  }
  return Promise.resolve(createImageBitmap(canvas));
};

export const squareGrid: Grid<SquareGridProps> = {
  getDimensions: (props) => ({
    width: props.columns * props.size,
    height: props.rows * props.size,
  }),
  getClosestCellIndex: (props, ...xy) =>
    pipe(
      xy,
      mapBoth((a) => Math.floor(a / props.size)),
      mapFst((x) => (x < 0 ? 0 : x > props.columns ? props.columns : x)),
      mapSnd((y) => (y < 0 ? 0 : y > props.rows ? props.rows : y)),
      mapBoth((a) => a + a + 1),
    ),
  getClosestVertexIndex: (props, ...xy) =>
    pipe(
      xy,
      mapBoth((a) => a + props.size / 2),
      mapBoth((a) => Math.floor(a / props.size)),
      mapFst((x) => (x < 0 ? 0 : x > props.columns ? props.columns : x)),
      mapSnd((y) => (y < 0 ? 0 : y > props.rows ? props.rows : y)),
      mapBoth((a) => a + a),
    ),
  getClosestCellOrVertexIndex: (props, ...xy) =>
    pipe(
      xy,
      ([x, y]) => [x + y, y - x] as const,
      mapBoth((a) => a + props.size / 2),
      mapBoth((a) => Math.floor(a / props.size)),
      ([x, y]) => [x - y, x + y] as const,
      ([x, y]) => [x, y, x % 2 === 0 ? 'vertex' : 'cell'] as const,
    ),
  getOverlay: (props, overlay) => {
    const alpha = overlay.alpha < 0 ? 0 : overlay.alpha > 1 ? 1 : overlay.alpha;
    const rr = (overlay.color >> 16) % 0xff;
    const gg = (overlay.color >> 8) % 0xff;
    const bb = overlay.color % 0xff;
    const thickness =
      (overlay.thickness > props.size
        ? props.size
        : overlay.thickness < 0
        ? 0
        : overlay.thickness) / 2;

    const canvas = new OffscreenCanvas(props.size, props.size);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = `rgb(${rr} ${gg} ${bb} / ${alpha}`;
      ctx.fillRect(0, 0, props.size, props.size);
      ctx.clearRect(
        thickness,
        thickness,
        props.size - thickness - thickness,
        props.size - thickness - thickness,
      );
    }

    return canvas.transferToImageBitmap();
  },
  stampCell: (props, cell, ctx, x, y) => {
    ctx.drawImage(cell, x * props.size, y * props.size);
  },
  stampAll: (props, cell, ctx) => {
    for (let x = 0; x < props.columns; x++)
      for (let y = 0; y < props.rows; y++) {
        squareGrid.stampCell(props, cell, ctx, x, y);
      }
  },
  stampLayer: (props, layerProps, z, content, ctx) => {
    const layer = layers[layerProps.type];
    const cells = Array
      .from({ length: props.columns*props.rows }, (_,i) => [i%props.columns, Math.floor(i/props.columns)] as readonly [number, number])
      .map<readonly [x: number, y: number, key: string|number, data:number]>(([x,y]) => [x, y, layer.getImageKeyAt(layerProps, x, y), cellTo9Bits(props, content, x, y, z)]);
    const imageData = cells.reduce((v, [,,imageKey]) => {
      if (!v[imageKey]) v[imageKey] = scaleImage(layer.getImageDataForKey(layerProps, imageKey), props.size, props.size);
      return v;
    }, {} as {[key: string]: Promise<ImageBitmap>});
    const cellData = cells.reduce((v, [,,imageKey,data]) => {
      const key = `${imageKey}::${data}`;
      if (!v[key]) v[key] = imageData[imageKey].then(image => sliceImage(props, layerProps, image, data));
      return v;
    }, {} as {[key: string]: Promise<ImageBitmap>});
    return Promise.all(
      cells
      .map<readonly [x: number, y: number, data: Promise<ImageBitmap>]>(([x, y, imageKey, data]) => [x, y, cellData[`${imageKey}::${data}`]])
      .map(([x, y, renderCellStamp]) => renderCellStamp.then(data => ctx.drawImage(data, x*props.size, y*props.size)))
    );
  },
  markLocation: (props, ctx, x, y) => {
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(x * props.size/2, y * props.size/2, props.size/8, 0, Math.PI*2, false);
    ctx.fill();
  },
  markRect: (props, ctx, sx, sy, ex, ey) => {
    const x = sx < ex ? sx : ex;
    const y = sy < ey ? sy : ey;
    const dx = sx < ex ? ex - sx : sx - ex;
    const dy = sy < ey ? ey - sy : sy - ey;
    const unit = props.size/2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect((x-0.5)*unit, (y-0.5)*unit, (dx+1)*unit, (dy+1)*unit);
  },
  getContentLength,
  getContentIndex,
  serialize: (props) => flow(
    serializeByte(props.size),
    flatMap(serializeByte(props.rows)),
    flatMap(serializeByte(props.columns)),
  ),
  deserialize: pipe(
    sequence(Applicative)([
      deserializeByte,
      deserializeByte,
      deserializeByte,
    ]),
    map(([size, rows, columns]): SquareGridProps => ({
      type: 'square',
      size,
      rows,
      columns,
    })),
  ),
  drawRect: (props, sx, sy, ex, ey, value, layerss) => (document) => ({
    ...document,
    content: document.content
      .map((v,i) => [v, ...getCoordinates(props, i)] as const)
      .map(([v, x, y, z]) => layerss[z] && sx <= x && x <= ex && sy <= y && y <= ey ? value : v)
  }),
  transformContent: (props, oldProps, layerCount) => (content) => {
    if (!isSquareGridProps(oldProps)) {
      // reset all content on grid type change
      return Array.from({ length: getContentLength(props)*layerCount }, () => false);
    } else if (props.rows !== oldProps.rows || props.columns !== oldProps.columns) {
      const newContent = Array.from({ length: getContentLength(props)*layerCount }, () => false);
      const dim = [props.columns*2+1, props.rows*2+1, layerCount];
      content.forEach((x, i) => {
        if (!x) return;
        const coords = getCoordinates(oldProps, i);
        if (coords.every((y,j) => y < dim[j])) {
          newContent[getContentIndex(props, ...coords)] = true;
        }
      });
      return newContent;
    } else {
      return content;
    }
  }
};
