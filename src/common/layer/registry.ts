import { flow, pipe } from 'fp-ts/function';
import { sequence } from 'fp-ts/ReadonlyArray';
import { Applicative, flatMap } from 'fp-ts/State';
import { periodicLayer, PeriodicLayerProps, periodicLayerType } from './periodic';
import { Preserializer, Serializer, deserializeByte, deserializeEnum, serializeByte, serializeEnum } from '../serialization';

export type LayerProps =
| PeriodicLayerProps
;

const layerTypes = [periodicLayerType];

export const layers = {
  [periodicLayerType]: periodicLayer,
};

export const serializeLayer = (layer: LayerProps): Preserializer => flow(
  serializeEnum(layerTypes)(layer.type),
  flatMap(layers[layer.type].serialize(layer)),
);

export const deserializeLayer = pipe(
  deserializeEnum(layerTypes),
  flatMap((type) => layers[type].deserialize),
);

export const serializeLayers = (value: readonly LayerProps[]): Preserializer =>
(serializers: readonly Serializer[]) => value.reduce((v, x) => pipe(v, flatMap(serializeLayer(x))), serializeByte(value.length)(serializers));

export const deserializeLayers = pipe(
  deserializeByte,
  flatMap(length => sequence(Applicative)(Array.from({ length }, () => deserializeLayer))),
);
