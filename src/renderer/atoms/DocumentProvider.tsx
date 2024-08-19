import {
  createContext,
  Dispatch,
  ReactElement,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { flow, pipe } from 'fp-ts/function';
import { GridProps, grids } from '../../common/grid';
import { OverlayProps } from '../../common/overlay';
import { LayerProps } from '../../common/layer';
import { apply, canRedo, canUndo, initialize, redo, undo } from '../../worker/documentState';
import { deserialize, Document, serialize } from '../../worker/document';
import { layers as layerRegistry } from '../../common/layer/registry';
import { periodicLayerType } from '../../common/layer/periodic';

type State<T> = readonly [value: T, setValue: Dispatch<SetStateAction<T>>];

interface DocumentContext {
  readonly document: Document;
  readonly setDocument: (value: SetStateAction<Document>) => void;
  readonly setOverlay: (value: SetStateAction<OverlayProps>) => void;
  readonly setGrid: (value: SetStateAction<GridProps>) => void;
  readonly addLayer: () => void;
  readonly removeLayer: (index: number) => void;
  readonly setLayer: (index: number, props: SetStateAction<LayerProps>) => void;
  readonly setContent: (value: SetStateAction<readonly boolean[]>) => void;
}

const noop = () => {};
const context = createContext<DocumentContext>({
  document: {} as Document,
  setDocument: noop,
  setOverlay: noop,
  setGrid: noop,
  addLayer: noop,
  removeLayer: noop,
  setLayer: noop,
  setContent: noop,
});

export function useDocument(): State<Document> {
  const { document, setDocument } = useContext(context);
  return [document, setDocument];
}

export function useDocumentGrid(): State<GridProps> {
  const { document: { grid }, setGrid } = useContext(context);
  return [grid, setGrid];
}

export function useDocumentOverlay(): State<OverlayProps> {
  const { document: { overlay }, setOverlay } = useContext(context);
  return [overlay, setOverlay];
}

export function useDocumentLayer(index: number): State<LayerProps> {
  const { document: { layers }, setLayer: setLayerAt } = useContext(context);
  const setLayer = useCallback((props: SetStateAction<LayerProps>) => setLayerAt(index, props), [setLayerAt, index]);
  return [layers[index], setLayer];
}

export function useDocumentLayers(): Pick<DocumentContext, 'addLayer' | 'removeLayer' | 'setLayer'> & Pick<Document, 'layers'> {
  const { document: { layers }, addLayer, removeLayer, setLayer } = useContext(context);
  return { layers, addLayer, removeLayer, setLayer };
}

export function useDocumentContent(): State<readonly boolean[]> {
  const { document: { content }, setContent } = useContext(context);
  return [content, setContent];
}

export interface DocumentProviderProps {
  readonly document: Document;
  readonly children?: ReactNode;
}

/** Provides access to the current open document. */
export function DocumentProvider({
  document,
  children,
}: DocumentProviderProps): ReactElement {
  const initialDocumentState = useMemo(() => initialize(document), [document]);
  const [documentState, setDocumentState] = useState(initialDocumentState);
  const { current } = documentState;

  const operations = useMemo(() => {
    const makeOperation = (op: (doc: Document) => Document) => () => setDocumentState(apply(op));
    const operate = (op: (doc: Document) => Document) => setDocumentState(apply(op));
    const addLayer = makeOperation(doc => ({
      ...doc,
      layers: [...doc.layers, layerRegistry[periodicLayerType].init()],
      content: [...doc.content, ...Array.from({ length: (doc.layers.length+1) * grids[doc.grid.type].getContentLength(doc.grid) }, () => false)],
    }));
    const removeLayer = (index: number) =>
      operate((doc) => ({
        ...doc,
        layers: doc.layers.filter((_, i) => i !== index),
        content: [
          ...doc.content.slice(0, index * grids[doc.grid.type].getContentLength(doc.grid)),
          ...doc.content.slice((index+1) * grids[doc.grid.type].getContentLength(doc.grid)),
        ],
      }));
    const setLayer = (index: number, layer: SetStateAction<LayerProps>) => operate(doc => ({
      ...doc,
      layers: doc.layers.map((x,i) => i === index ? typeof layer === 'function' ? layer(x) : layer : x),
    }));
    const setOverlay = (value: SetStateAction<OverlayProps>) =>
      operate((doc) => ({
        ...doc,
        overlay: typeof value === 'function' ? value(doc.overlay) : value,
      }));
    const setGrid = (value: SetStateAction<GridProps>) => operate(doc => pipe(
      typeof value === 'function' ? value(doc.grid) : value,
      (newGrid) => ({
        ...doc,
        grid: newGrid,
        content: grids[newGrid.type].transformContent(newGrid, doc.grid, doc.layers.length)(doc.content),
      })
    ));
    const setContent = (value: SetStateAction<readonly boolean[]>) => operate(doc => ({
      ...doc,
      content: typeof value === 'function' ? value(doc.content) : value,
    }));
    const setDocument = (value: SetStateAction<Document>) => operate(typeof value === 'function' ? value: () => value);
    return {
      setDocument, setOverlay, setGrid,
      addLayer, removeLayer, setLayer,
      setContent,
    };
  }, []);

  const { setDocument } = operations;
  useEffect(() => {
    const listeners = [
      window.electron.onOpen(flow(deserialize, setDocument)),
      window.electron.onSave((filePath) => {
        if (current.filePath !== filePath)
          setDocument((doc) => ({ ...doc, filePath }));
        return Promise.resolve(serialize(current));
      }),
      window.electron.onUndo(() => pipe(undo, setDocumentState)),
      window.electron.onRedo(() => pipe(redo, setDocumentState)),
    ];
    return () => listeners.forEach(dispose => dispose());
  }, [current, setDocument]);

  useEffect(() => {
    window.electron.setUndoContext(canUndo(documentState), canRedo(documentState));
  }, [documentState]);

  const provider = useMemo(() => ({ document: current, ...operations }), [current, operations]);
  return (
    <context.Provider value={provider}>
      {children}
    </context.Provider>
  );
}
