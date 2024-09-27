import {
  MouseEvent,
  ReactElement,
  useEffect,
  useRef,
} from 'react';

export interface CanvasProps {
  readonly width: number;
  readonly height: number;
  readonly draw: (ctx: CanvasRenderingContext2D) => void;
  readonly onMouseDown?: (event: MouseEvent) => void;
  readonly onMouseMove?: (event: MouseEvent) => void;
  readonly onMouseUp?: (event: MouseEvent) => void;
  readonly onExport?: (handler: (filePath: string) => Promise<ArrayBuffer>) => void;
}

export function Canvas({
  width, height, draw,
  onMouseDown, onMouseMove, onMouseUp,
  onExport,
}: CanvasProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
        onExport?.(() =>
          new Promise((resolve, reject) => canvas.toBlob(
            blob => blob ?
              resolve(blob.arrayBuffer()) :
              reject(),
            'image/png'
          ))
        );
      }
    }
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    />
  );
}
