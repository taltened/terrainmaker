import { flow, pipe } from 'fp-ts/function';
import { Applicative2C } from 'fp-ts/Applicative';
import { Applicative, flatMap, map } from 'fp-ts/State';
import { SerializationContext, deserializeARGB, deserializeByte, deserializeImage, deserializeString, serializeARGB, serializeByte, serializeImage, serializeString } from '../serialization';
import { sequence } from '../variadic';
import { Layer } from './common';
import { defaultImage } from '../../renderer/utils/defaultImage';

export const periodicLayerType = 'periodic' as const;

export interface PeriodicLayerProps {
  readonly type: typeof periodicLayerType;
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly writing: boolean;
  readonly thickness: number;
  readonly shadowThickness: number;
  readonly shadowColor: number;
  readonly shadowAlpha: number;
  readonly content: ImageData;
}

let count = 0;

export const periodicLayer: Layer<PeriodicLayerProps> = {
  init: () => ({
    id: `${periodicLayerType}::${count}`,
    type: periodicLayerType,
    name: `Periodic ${count++}`,
    visible: true,
    writing: true,
    thickness: 0x4c,
    shadowThickness: 0x33,
    shadowColor: 0x000000,
    shadowAlpha: 0x7f,
    content: defaultImage(),
  }),
  getImageKeyAt: () => 0,
  getImageDataForKey: (props) => props.content,
  serialize: (layer) =>
    flow(
      serializeString(layer.name),
      flatMap(serializeByte((layer.visible ? 0b10 : 0) | (layer.writing ? 0b1 : 0))),
      flatMap(serializeByte(layer.thickness)),
      flatMap(serializeByte(layer.shadowThickness)),
      flatMap(serializeARGB((layer.shadowColor << 8) | layer.shadowAlpha)),
      flatMap(serializeImage(layer.content)),
    ),
  deserialize: pipe(
    sequence(Applicative as Applicative2C<'State', SerializationContext>)([
      deserializeString,
      deserializeByte,
      deserializeByte,
      deserializeByte,
      deserializeARGB,
      deserializeImage,
    ] as const),
    map(([name, bitfield, thickness, shadowThickness, shadowARGB, content]) => ({
      id: `${periodicLayerType}::${count++}`,
      type: periodicLayerType,
      name,
      visible: (bitfield & 0b10) > 0,
      writing: (bitfield & 0b01) > 0,
      thickness,
      shadowThickness,
      shadowColor: shadowARGB >> 8,
      shadowAlpha: shadowARGB & 0xff,
      content,
    })),
  ),
};


