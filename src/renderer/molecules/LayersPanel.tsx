import { ReactElement, SetStateAction } from 'react';
import { LayerProps } from '../../common/layer';
import { LayerPanel } from './LayerPanel';
import { Theme } from '../themes/theme';
import { IconButton } from '../atoms/IconButton';
import styles from './LayersPanel.module.css';

export interface LayersPanelProps {
  readonly theme: Theme;
  readonly layers: readonly LayerProps[];
  readonly setLayer?: (index: number, value: SetStateAction<LayerProps>) => void;
  readonly removeLayer?: (index: number) => void;
  readonly addLayer?: () => void;
}

export function LayersPanel({ theme, layers, setLayer, removeLayer, addLayer }: LayersPanelProps): ReactElement {
  return (
    <fieldset className={`${theme.panel} ${styles.root}`}>
      <legend>Layers</legend>
      {layers.map((x, i) => (
        <LayerPanel
          key={x.id}
          theme={theme}
          layer={x}
          setLayer={setLayer && ((y) => setLayer(i, y))}
          removeLayer={removeLayer && (() => removeLayer(i))}
        />
      ))}
      { addLayer && <IconButton icon="add" text="Layer" onClick={addLayer} /> }
    </fieldset>
  );
}
