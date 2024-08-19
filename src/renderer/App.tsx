import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useMemo } from 'react';
import { GridProps, grids } from '../common/grid';
import { OverlayProps } from '../common/overlay';
import { DocumentProvider } from './atoms/DocumentProvider';
import { DocumentPage } from './pages/DocumentPage';
import './App.css';
import { Document } from '../worker/document';
import { layers } from '../common/layer/registry';
import { periodicLayerType } from '../common/layer/periodic';

export default function App() {
  const grid = useMemo((): GridProps => ({
    type: 'square',
    rows: 10,
    columns: 12,
    size: 70,
  }), []);
  const overlay = useMemo((): OverlayProps => ({
    color: 0x000000,
    alpha: 0.3,
    thickness: 2,
  }), []);
  const document = useMemo((): Document => ({
    filePath: '',
    grid,
    overlay,
    layers: [layers[periodicLayerType].init()],
    content: Array.from({ length: grids[grid.type].getContentLength(grid) }, () => true),
  }), [grid, overlay]);
  return (
    <DocumentProvider key={document.filePath} document={document}>
      <Router>
        <Routes>
          <Route path="/" element={<DocumentPage />} />
        </Routes>
      </Router>
    </DocumentProvider>
  );
}
