import { State } from 'fp-ts/State';
import { OverlayProps } from '../overlay';
import { Preserializer, SerializationContext } from '../serialization';
import type { Document } from '../../worker/document';
import { LayerProps } from '../layer';

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export type Point = readonly [x: number, y: number];
export type Locus = readonly [x: number, y: number, type: 'cell' | 'vertex'];

export interface Grid<TProps> {
  /** Calculate dimensions of the visible grid. */
  readonly getDimensions: (props: TProps) => Dimensions;
  /** Creates a stampable image bitmap for a grid overlay. */
  readonly getOverlay: (props: TProps, overlay: OverlayProps) => ImageBitmap;
  /** Finds the closest content cell for screen coordinates. */
  readonly getClosestCellIndex: (props: TProps, x: number, y: number) => Point;
  /** Finds the closest content vertex for screen coordinates. */
  readonly getClosestVertexIndex: (props: TProps, x: number, y: number) => Point;
  /** Finds the closest content cell or vertex for screen coordinates. */
  readonly getClosestCellOrVertexIndex: (props: TProps, x: number, y: number) => Locus;
  /** Stamps image data onto a given visible cell. */
  readonly stampCell: (props: TProps, cell: ImageBitmap, ctx: CanvasRenderingContext2D, x: number, y: number) => void;
  /** Stamps image data onto all visible cells. */
  readonly stampAll: (props: TProps, cell: ImageBitmap, ctx: CanvasRenderingContext2D) => void;
  /** Stamps layer data onto all visible cells. */
  readonly stampLayer: (props: TProps, layer: LayerProps, z: number, content: readonly boolean[], ctx: CanvasRenderingContext2D) => void;
  /** Draws an indicator on the given internal grid cell. */
  readonly markLocation: (props: TProps, ctx: CanvasRenderingContext2D, x: number, y: number) => void;
  /** Draws an indicator on the given internal grid cell. */
  readonly markRect: (props: TProps, ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number) => void;
  /** Calculates total length of content array per layer. */
  readonly getContentLength: (props: TProps) => number;
  /** Maps internal grid coordinates to a content position. */
  readonly getContentIndex: (props: TProps, x: number, y: number, z: number) => number;
  readonly drawRect: (props: TProps, sx: number, sy: number, ex: number, ey: number, value: boolean, layers: readonly boolean[]) => (document: Document) => Document;
  readonly transformContent: (props: TProps, oldProps: TProps | unknown, layerCount: number) => (content: readonly boolean[]) => readonly boolean[];
  readonly serialize: (props: TProps) => Preserializer;
  readonly deserialize: State<SerializationContext, TProps>;
}
