import { MouseEvent, ReactElement, useCallback, useMemo, useState } from 'react';
import { GridProps, Locus } from '../../common/grid';
import { OverlayProps } from '../../common/overlay';
import { useGrid } from '../atoms/useGrid';
import { Canvas } from '../atoms/Canvas';
import { useDocument, useDocumentContent, useDocumentLayers } from '../atoms/DocumentProvider';
import { Point } from '../../common/grid/common';

export interface PreviewProps {
  /** Grid structure and dimensions. */
  readonly grid: GridProps;
  /** Styling of grid overlay. */
  readonly overlay: OverlayProps;
}

export function Preview({ grid: gridProps, overlay: overlayProps }: PreviewProps): ReactElement {
  const { layers } = useDocumentLayers();
  const [content] = useDocumentContent();
  const [,setDocument] = useDocument();
  // Grid-specific logic
  const grid = useGrid(gridProps);
  const { width, height } = grid.getDimensions(gridProps);
  const overlay = useMemo(
    () => grid.getOverlay(gridProps, overlayProps),
    [grid, gridProps, overlayProps]
  );

  const [sxy, setSxy] = useState<Locus | undefined>(undefined);
  const [exy, setExy] = useState<Point | undefined>(undefined);
  const onDown = useCallback((event: MouseEvent) => {
    const xy = grid.getClosestCellOrVertexIndex(
      gridProps,
      event.nativeEvent.offsetX,
      event.nativeEvent.offsetY,
    );
    setSxy(xy);
    setExy([xy[0], xy[1]]);
  }, [grid, gridProps]);
  const onMove = useCallback((event: MouseEvent) => {
    if (sxy) {
      setExy((sxy[2] === 'cell' ? grid.getClosestCellIndex : grid.getClosestVertexIndex)(
        gridProps,
        event.nativeEvent.offsetX,
        event.nativeEvent.offsetY,
      ));
    }
  }, [grid, gridProps, sxy]);
  const onUp = useCallback((event: MouseEvent) => {
    if (sxy) {
      const xy = (sxy[2] === 'cell' ? grid.getClosestCellIndex : grid.getClosestVertexIndex)(
        gridProps,
        event.nativeEvent.offsetX,
        event.nativeEvent.offsetY,
      );
      const x = sxy[0] < xy[0] ? [sxy[0], xy[0]] : [xy[0], sxy[0]];
      const y = sxy[1] < xy[1] ? [sxy[1], xy[1]] : [xy[1], sxy[1]];
      setDocument(grid.drawRect(gridProps, x[0], y[0], x[1], y[1], !event.shiftKey, layers.map(layer => layer.writing)));
      setSxy(undefined);
      setExy(undefined);
    }
  }, [grid, gridProps, sxy, setDocument, layers]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return layers.reduce(
      (promise, layer, i) => {
        if (!layer.visible) return promise;
        return promise.then(() => grid.stampLayer(gridProps, layer, i, content, ctx));
      },
      Promise.resolve()
    ).then(() => {
      grid.stampAll(gridProps, overlay, ctx);
      if (sxy) {
        if (exy) {
          grid.markRect(gridProps, ctx, sxy[0], sxy[1], exy[0], exy[1]);
        } else {
          grid.markLocation(gridProps, ctx, sxy[0], sxy[1]);
        }
      }
      return ctx;
    });
  }, [grid, gridProps, overlay, sxy, exy, layers, content]);

  return <Canvas draw={draw} width={width} height={height} onMouseDown={onDown} onMouseUp={onUp} onMouseMove={sxy && onMove} onExport={window.electron.onExport} />;
}
