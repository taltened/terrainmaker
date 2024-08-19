import { pipe } from 'fp-ts/function';
import { Document, deserialize, serialize } from './document';

describe('document', () => {
  const roundTrip = (document: Document) => pipe(
    document,
    serialize,
    buffer => deserialize(document.filePath, buffer),
  );

  const createSolidImage = (width: number, height: number, color: number): ImageData => {
    const view = new Uint8ClampedArray(width*height*4);
    const rr = (color >> 16) % 0x100;
    const gg = (color >> 8) % 0x100;
    const bb = (color) % 0x100;
    for (let x=0; x<width; x++) for (let y=0; y<height; y++) {
      const index = (x + width*y) * 4;
      view[index] = rr;
      view[index+1] = gg;
      view[index+2] = bb;
      view[index+3] = 0xff;
    }
    const data = new ImageData(width, height);
    view.set(data.data, 0);
    return data;
  }

  describe('serialize', () => {
    it(`preserves documents round-trip`, () => {
      const document: Document = {
        filePath: 'example.dat',
        overlay: {
          thickness: 3,
          alpha: 0.25,
          color: 0xff00e9,
        },
        grid: {
          type: 'square',
          rows: 2,
          columns: 2,
          size: 70,
        },
        layers: [
          {
            type: 'periodic',
            name: 'background',
            content: createSolidImage(70, 70, 0xffeecc),
          },
          {
            type: 'periodic',
            name: 'foreground',
            content: createSolidImage(100, 100, 0x787637),
          },
        ],
        content: [
          // L0
          true, false, false, false, true,
          true, true, true, true, true,
          true, true, true, true, true,
          true, true, true, true, true,
          true, true, true, true, true,
          // L1
          false, false, false, false, false,
          true, true, true, true, false,
          false, true, true, true, true,
          true, true, true, true, false,
          false, false, false, false, false,
          // extra bits to make a full byte
          false, false, false, false, false, false,
        ]
      };
      expect(roundTrip(document)).toEqual(document);
    });
  });
});
