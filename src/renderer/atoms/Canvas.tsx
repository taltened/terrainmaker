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
}

export function Canvas({
  width, height, draw,
  onMouseDown, onMouseMove, onMouseUp,
}: CanvasProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
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
