import { flow, pipe } from 'fp-ts/function';
import { flatMap } from 'fp-ts/State';
import { SquareGridProps, squareGrid, squareGridType } from './square';
import { Preserializer, deserializeEnum, serializeEnum } from '../serialization';

export type GridProps =
| SquareGridProps
;

const gridTypes = [
  squareGridType
];

export const grids = {
  [squareGridType]: squareGrid,
} as const;

export const serializeGrid = (value: GridProps): Preserializer => flow(
  serializeEnum(gridTypes)(value.type),
  flatMap(grids[value.type].serialize(value)),
);

export const deserializeGrid = pipe(
  deserializeEnum(gridTypes),
  flatMap(type => grids[type].deserialize),
);
