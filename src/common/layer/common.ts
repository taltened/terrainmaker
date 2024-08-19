import { State } from 'fp-ts/State';
import { Preserializer, SerializationContext } from '../serialization';

export interface Layer<TProps> {
  readonly init: () => TProps;
  /**
   * Determines which image to display at the given coordinates in the image tiling.
   * Image stamps do not necessarily map to overlay grid cells.
   * Given coordinates are for the nth image stamp horizontally and vertically.
   */
  readonly getImageKeyAt: (props: TProps, x: number, y: number) => number | string;
  readonly getImageDataForKey: (props: TProps, key: number | string) => ImageData;
  readonly serialize: (props: TProps) => Preserializer;
  readonly deserialize: State<SerializationContext, TProps>;
}
