import { Dispatch, ReactElement, SetStateAction, useCallback } from 'react';
import { PeriodicLayerProps } from '../../common/layer';
import { Canvas } from '../atoms/Canvas';
import { FileInput } from '../atoms/FileInput';

export interface PeriodicLayerPanelProps {
  readonly layer: PeriodicLayerProps;
  readonly setLayer?: Dispatch<SetStateAction<PeriodicLayerProps>>;
  readonly previewWidth: number;
  readonly previewHeight: number;
}

export function PeriodicLayerPanel({ layer, setLayer, previewWidth, previewHeight }: PeriodicLayerPanelProps): ReactElement {
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    createImageBitmap(layer.content, {
      resizeWidth: previewWidth,
      resizeHeight: previewHeight,
      resizeQuality: 'high',
    }).then(data => {
      ctx.clearRect(0, 0, previewWidth, previewHeight);
      ctx.drawImage(data, 0, 0);
      return data;
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.log(`Error loading layer preview: ${error}`);
    });
  }, [layer.content, previewWidth, previewHeight]);

  const updateFile = useCallback((url: string) => {
    if (url.length && setLayer) {
      const image = new Image();
      image.onload = () => {
        // Embed the image at its original size
        // so that rescaling the grid
        // does not accumulate scaling artifacts
        createImageBitmap(image).then(data => {
          const canvas = new OffscreenCanvas(data.width, data.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('no 2d context available from OffscreenCanvas');
          }
          ctx.drawImage(data, 0, 0);
          setLayer(y => ({ ...y, content: ctx.getImageData(0, 0, data.width, data.height) }));
          return data;
        }).catch(error => {
          // eslint-disable-next-line no-console
          console.log(`Error creating periodic layer from image: ${error}`);
        });
      }
      image.src = `local://${url}`;
    }
  }, [setLayer]);

  return (
    <div>
      <Canvas draw={draw} width={previewWidth} height={previewHeight} />
      <FileInput label="Image:" setValue={updateFile} />
    </div>
  );
}
