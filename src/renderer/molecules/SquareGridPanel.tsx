import { ReactElement, SetStateAction, useCallback } from 'react';
import { IntegerInput } from '../atoms/IntegerInput';
import { SquareGridProps } from '../../common/grid';

export interface SquareGridPanelProps {
  readonly grid: SquareGridProps;
  readonly setGrid?: (a: SetStateAction<SquareGridProps>) => void;
}

export function SquareGridPanel({ grid, setGrid }: SquareGridPanelProps): ReactElement {
  const setSize = useCallback((size: number) => {
    setGrid?.(x => ({ ...x, size }));
  }, [setGrid]);
  const setRows = useCallback((rows: number) => {
    setGrid?.(x => ({ ...x, rows }));
  }, [setGrid]);
  const setColumns = useCallback((columns: number) => {
    setGrid?.(x => ({ ...x, columns }));
  }, [setGrid]);
  return (
    <section>
      <IntegerInput label="Size (px)" min={1} max={256} value={grid.size} setValue={setSize} />
      <IntegerInput label="Rows" min={1} max={100} value={grid.rows} setValue={setRows} />
      <IntegerInput label="Columns" min={1} max={100} value={grid.columns} setValue={setColumns} />
    </section>
  );
}
