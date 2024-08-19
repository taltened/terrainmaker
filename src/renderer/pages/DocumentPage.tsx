import { ReactElement } from 'react';
import { useDocumentGrid, useDocumentLayers, useDocumentOverlay } from '../atoms/DocumentProvider';
import { Preview } from '../molecules/Preview';
import { GridPanel } from '../molecules/GridPanel';
import { LayersPanel } from '../molecules/LayersPanel';
import styles from './DocumentPage.module.css';
import darkTheme from '../themes/dark.module.css';
import { Theme } from '../themes/theme';

const theme: Theme = darkTheme as unknown as Theme;

export function DocumentPage(): ReactElement {
  const [grid, setGrid] = useDocumentGrid();
  const [overlay] = useDocumentOverlay();
  const { layers, setLayer, removeLayer, addLayer } = useDocumentLayers();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Preview grid={grid} overlay={overlay} />
      </main>
      <aside className={`${theme.panel} ${styles.sidebar}`}>
        <GridPanel
          theme={theme}
          grid={grid}
          setGrid={setGrid}
        />
        <LayersPanel
          theme={theme}
          layers={layers}
          setLayer={setLayer}
          removeLayer={removeLayer}
          addLayer={addLayer}
        />
      </aside>
    </div>
  );
}
