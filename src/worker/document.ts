import { flow, pipe } from 'fp-ts/function';
import { Applicative2C } from 'fp-ts/Applicative';
import { Applicative, evaluate, flatMap, map } from 'fp-ts/State';
import { deserializeGrid, GridProps, grids, serializeGrid } from '../common/grid';
import { deserializeLayers, LayerProps, serializeLayers } from '../common/layer';
import { Preserializer, SerializationContext, deserializeBits, deserializeByte, deserializeFloat, serialize as _serialize, serializeBits, serializeByte, serializeFloat } from '../common/serialization';
import { sequence } from '../common/variadic';
import { OverlayProps } from '../common/overlay';

export interface Document {
  readonly filePath: string;
  readonly overlay: OverlayProps;
  readonly grid: GridProps;
  readonly layers: readonly LayerProps[];
  readonly content: readonly boolean[];
}

const serializeOverlay = (overlay: OverlayProps) => flow(
  serializeByte((overlay.color >> 16) % 0x100),
  flatMap(serializeByte((overlay.color >> 8) % 0x100)),
  flatMap(serializeByte((overlay.color) % 0x100)),
  flatMap(serializeFloat(overlay.alpha)),
  flatMap(serializeFloat(overlay.thickness)),
);

const deserializeOverlay = pipe(
  sequence(Applicative as Applicative2C<'State', SerializationContext>)([
    deserializeByte,
    deserializeByte,
    deserializeByte,
    deserializeFloat,
    deserializeFloat,
  ] as const),
  map(([red, green, blue, alpha, thickness]): OverlayProps => ({
    color: (red << 16) + (green << 8) + blue,
    alpha,
    thickness,
  })),
);

const serializeContent = (content: readonly boolean[]) =>
  pipe(serializeBits(content));

const deserializeContent = (grid: GridProps, layerCount: number) =>
  pipe(deserializeBits(grids[grid.type].getContentLength(grid) * layerCount));

const serializeDocument = (document: Document): Preserializer => flow(
  serializeByte(1), // version, unused
  flatMap(serializeOverlay(document.overlay)),
  flatMap(serializeGrid(document.grid)),
  flatMap(serializeLayers(document.layers)),
  flatMap(serializeContent(document.content)),
);

const deserializeDocument = pipe(
  deserializeByte, // version, unused
  flatMap(() => sequence(Applicative)([
    deserializeOverlay,
    pipe(
      sequence(Applicative as Applicative2C<'State',SerializationContext>)([
        deserializeGrid,
        deserializeLayers,
      ] as const),
      flatMap(([grid, layers]) => pipe(
        deserializeContent(grid, layers.length),
        map((content): Omit<Document, 'filePath' | 'overlay'> => ({ grid, layers, content })),
      )),
    ),
  ] as const)),
  map(([overlay, rest]): Omit<Document,'filePath'> => ({ overlay, ...rest })),
);

export const serialize = (doc: Document): ArrayBuffer => pipe(
  [],
  serializeDocument(doc),
  _serialize,
);

export const deserialize = (filePath: string, buffer: ArrayBuffer): Document => pipe(
  deserializeDocument,
  evaluate<SerializationContext>([buffer, 0]),
  (result) => ({ filePath, ...result }),
);
