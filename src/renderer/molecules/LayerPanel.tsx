import { Dispatch, ReactElement, SetStateAction, useCallback } from 'react';
import { LayerProps } from '../../common/layer';
import { StringInput } from '../atoms/StringInput';
import { PeriodicLayerPanel } from './PeriodicLayerPanel';
import { IconButton } from '../atoms/IconButton';
import { IconCheckbox } from '../atoms/IconCheckbox';
import { Theme } from '../themes/theme';
import styles from './LayerPanel.module.css';
import { IntegerInput } from '../atoms/IntegerInput';

export interface LayerPanelProps {
  readonly theme: Theme;
  readonly layer: LayerProps;
  readonly setLayer?: Dispatch<SetStateAction<LayerProps>>;
  readonly removeLayer?: () => void;
}

export function LayerPanel({ theme, layer, setLayer, removeLayer }: LayerPanelProps): ReactElement {
  const setName = useCallback((name: string) => {
    setLayer?.(x => ({ ...x, name }));
  }, [setLayer]);
  const setVisible = useCallback((visible: boolean) => {
    setLayer?.(x => ({ ...x, visible }));
  }, [setLayer]);
  const setWriting = useCallback((writing: boolean) => {
    setLayer?.(x => ({ ...x, writing }));
  }, [setLayer]);
  const setThickness = useCallback((thickness: number) => {
    setLayer?.(x => ({ ...x, thickness: Math.round(thickness*256/100) }));
  }, [setLayer]);
  const wall = Math.round(layer.thickness * 100 / 256);
  return (
    <fieldset className={styles.root}>
      <div className={styles.header}>
        <IconCheckbox theme={theme} icon='eye' checked={layer.visible} onChange={setVisible}/>
        <IconCheckbox theme={theme} icon='pen' checked={layer.writing} onChange={setWriting}/>
        <StringInput className={styles.name} label="" value={layer.name} setValue={setName} />
        { removeLayer && <IconButton icon='trash' onClick={removeLayer} /> }
      </div>
      <div className={styles.footer}>
        <IntegerInput label="Wall" min={0} max={100} value={wall} setValue={setThickness} />
        <PeriodicLayerPanel layer={layer} setLayer={setLayer} previewWidth={32} previewHeight={32} />
      </div>
    </fieldset>
  );
}
