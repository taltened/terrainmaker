import { flow, pipe } from 'fp-ts/function';
import { Applicative, evaluate, flatMap, map, of, State } from 'fp-ts/State';
import { sequence } from './variadic';

export type SerializationContext = readonly [buffer: ArrayBuffer, byteOffset: number];

// export interface Serializer {
//   readonly byteLength: () => number;
//   readonly serialize: (buffer: ArrayBuffer, byteOffset: number) => void;
// }

// export const serialize = ([buffer, byteOffset]: SerializationContext, serializable: Serializer): SerializationContext => {
//   const delta = serializable.byteLength();
//   serializable.serialize(buffer, byteOffset);
//   return [buffer, byteOffset + delta]
// };

export type Serializer = (buffer: ArrayBuffer) => State<number, ArrayBuffer>;
export type Preserializer = (serializers: readonly Serializer[]) => State<number, readonly Serializer[]>;

export const serialize = (preserializer: State<number, readonly Serializer[]>): ArrayBuffer => pipe(
  preserializer(0),
  ([serializers, byteLength]) => serializers.reduce<State<number, ArrayBuffer>>((v, x) => pipe(v, flatMap(x)), of(new ArrayBuffer(byteLength))),
  serializer => evaluate(0)(serializer),
);

export const serializeByte = (n: number): Preserializer =>
(serializers) => (byteLength) => [
  [...serializers, (buffer) => (byteOffset) => {
    new Uint8Array(buffer, byteOffset, 1)[0] = n;
    return [buffer, byteOffset + 1];
  }],
  byteLength + 1,
];

export const deserializeByte: State<SerializationContext, number> =
([buffer, byteOffset]: SerializationContext) => [
  new Uint8Array(buffer, byteOffset, 1)[0],
  [buffer, byteOffset+1]
];

/** Pads to the next even multiple of k bytes. */
export const pad16: Preserializer =
(serializers) => (byteLength) => byteLength % 2 === 0 ?
  [serializers, byteLength] :
  serializeByte(0)(serializers)(byteLength);

export const unpad16: State<SerializationContext, unknown> =
([buffer, byteOffset]: SerializationContext) => byteOffset % 2 === 0 ?
  [undefined, [buffer, byteOffset]] :
  deserializeByte([buffer, byteOffset]);

export const serializeUint16Unsafe = (n: number): Preserializer =>
(serializers) => (byteLength) => [
  [...serializers, (buffer) => (byteOffset) => {
    new Uint16Array(buffer, byteOffset, 1)[0] = n;
    return [buffer, byteOffset + 2];
  }],
  byteLength + 2,
];

export const deserializeUint16Unsafe: State<SerializationContext, number> =
([buffer, byteOffset]: SerializationContext) => [
  new Uint16Array(buffer, byteOffset, 1)[0],
  [buffer, byteOffset+2]
];

export const serializeUint16 = (n: number): Preserializer =>
flow(pad16, flatMap(serializeUint16Unsafe(n)));

export const deserializeUint16: State<SerializationContext, number> =
pipe(unpad16, flatMap(() => deserializeUint16Unsafe));

export const serializeFloat = (n: number): Preserializer =>
(serializers) => (byteLength) => [
  [...serializers, (buffer) => (byteOffset) => {
    new Float32Array(buffer, byteOffset, 1)[0] = n;
    return [buffer, byteOffset + 4];
  }],
  byteLength + 4
];

export const deserializeFloat: State<SerializationContext, number> =
([buffer, byteOffset]: SerializationContext) => [
  new Float32Array(buffer, byteOffset, 1)[0],
  [buffer, byteOffset+4]
];

export const deserializeBytes = (length: number): State<SerializationContext, Uint8Array> =>
([buffer, byteOffset]: SerializationContext) => [
  new Uint8Array(buffer, byteOffset, length),
  [buffer, byteOffset+length]
];

const serializeTextBytes = (value: string): Preserializer =>
(serializers) => (byteLength) => {
  const encoded = new TextEncoder().encode(value);
  return [
    [...serializers, (buffer) => (byteOffset) => {
      new Uint8Array(buffer, byteOffset, encoded.byteLength).set(encoded);
      return [buffer, byteOffset + encoded.byteLength];
    }],
    byteLength + encoded.byteLength
  ];
}

export const serializeImageBytes = (bytes: Uint8ClampedArray): Preserializer =>
(serializers) => (byteLength) => {
  const { byteLength: length } = bytes;
  return [
    [...serializers, (buffer) => (byteOffset) => {
      new Uint8ClampedArray(buffer, byteOffset, length).set(bytes);
      return [buffer, byteOffset + length];
    }],
    byteLength + length,
  ];
}


export const deserializeImageBytes = (length: number): State<SerializationContext, Uint8ClampedArray> =>
([buffer, byteOffset]: SerializationContext) => [
  new Uint8ClampedArray(buffer, byteOffset, length),
  [buffer, byteOffset + length],
];

export const serializeBits = (bits: readonly boolean[]): Preserializer =>
(serializers) => (byteLength) => {
  const length = Math.ceil(bits.length/8);
  return [
    [...serializers, (buffer) => (byteOffset) => {
      new Uint8Array(buffer, byteOffset, length).set(
        bits
        .map((x,i) => +x << (i%8))
        .reduce((v,x,i) => {
          if (i%8 === 0) return [...v, x];
          v[v.length-1] += x;
          return v;
        }, [] as number[])
      );
      return [buffer, byteOffset + length];
    }],
    byteLength + length,
  ];
}

export const deserializeBits = (length: number): State<SerializationContext, readonly boolean[]> => pipe(
  deserializeBytes(Math.ceil(length/8)),
  map(bytes => [...bytes]),
  map(bytes => bytes.flatMap(byte => [byte, byte>>1, byte>>2, byte>>3, byte>>4, byte>>5, byte>>6, byte>>7])),
  map(bits => bits.flatMap(bit => (bit & 1) > 0)),
);

export const serializeEnum = <T>(values: [...T[]]) => (value: T): Preserializer =>
serializeByte(values.indexOf(value)+1);

export const deserializeEnum = <T>(values: [...T[]]) => pipe(
  deserializeByte,
  map(x => values[x-1]),
);

export const serializeDimensions = (width: number, height: number): Preserializer => flow(
  serializeUint16(width),
  flatMap(serializeUint16(height)),
);

export const deserializeDimensions: State<SerializationContext, readonly [number, number]> = pipe(
  sequence(Applicative)([deserializeUint16, deserializeUint16] as const)
);

export const serializeString = (value: string): Preserializer => flow(
  serializeByte(new TextEncoder().encode(value).byteLength),
  flatMap(serializeTextBytes(value)),
);

export const deserializeString: State<SerializationContext, string> = pipe(
  deserializeByte,
  flatMap(deserializeBytes),
  map(bytes => new TextDecoder().decode(bytes)),
);

export const serializeImage = (image: ImageData): Preserializer => flow(
  serializeDimensions(image.width, image.height),
  flatMap(serializeImageBytes(image.data)),
);

export const deserializeImage: State<SerializationContext, ImageData> = pipe(
  deserializeDimensions,
  flatMap(([width, height]) => pipe(
    deserializeImageBytes(width * height * 4),
    map(bytes => {
      const data = new ImageData(width, height)
      data.data.set(bytes, 0);
      return data;
    }),
  )),
);

export const serializeARGB = (rgba: number): Preserializer => flow(
  serializeByte((rgba >> 24) & 0xff),
  flatMap(serializeByte((rgba >> 16) & 0xff)),
  flatMap(serializeByte((rgba >> 8) & 0xff)),
  flatMap(serializeByte(rgba & 0xff)),
);

export const deserializeARGB: State<SerializationContext, number> = pipe(
  deserializeBytes(4),
  map(a => a.reduce((v,x) => (v << 8) | x, 0)),
);
