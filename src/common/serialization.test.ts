import { pipe } from 'fp-ts/function';
import { State, evaluate } from 'fp-ts/lib/State';
import { Preserializer, SerializationContext, deserializeByte, deserializeFloat, deserializeString, serialize, serializeByte, serializeFloat, serializeString } from './serialization';

describe('serialization', () => {
  const roundTrip = <T>(serializer: Preserializer, deserializer: State<SerializationContext, T>) => pipe(
    [],
    serializer,
    serialize,
    data => pipe(
      deserializer,
      evaluate<SerializationContext>([data, 0]),
    ),
  );

  describe('serializeByte', () => {
    [0x0, 0x1, 0x2c, 0xff].forEach(v => {
      it(`preserves ${v} round-trip`, () => {
        expect(roundTrip(serializeByte(v), deserializeByte)).toBe(v);
      });
    });
  });

  describe('serializeFloat', () => {
    [0, 1, -1, 0.4, -4.2, 5500000].forEach((v) => {
      it(`preserves ${v} round-trip`, () => {
        expect(roundTrip(serializeFloat(v), deserializeFloat)).toBeCloseTo(v, 5);
      });
    });
  });

  describe('serializeTextBytes', () => {
    ["", "all in a hot and copper sky", "néü"].forEach((v) => {
      it(`preserves "${v}" round-trip`, () => {
        expect(roundTrip(serializeString(v), deserializeString)).toEqual(v);
      });
    });
  });
});
