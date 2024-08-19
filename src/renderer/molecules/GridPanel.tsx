import { ReactElement, ReactNode, SetStateAction } from 'react';
import { GridProps } from '../../common/grid';
import { SquareGridPanel } from './SquareGridPanel';
import { Theme } from '../themes/theme';

export interface GridPanelProps {
  readonly theme: Theme;
  readonly grid: GridProps;
  readonly setGrid?: (a: SetStateAction<GridProps>) => void;
}

export function GridPanel({ theme, grid, setGrid }: GridPanelProps): ReactElement {
  let subsection: ReactNode | null = null;
  if (grid.type === 'square') {
    subsection = <SquareGridPanel grid={grid} setGrid={setGrid} />
  }
  return (
    <fieldset className={`${theme.panel}`}>
      <legend>Grid</legend>
      {subsection}
    </fieldset>
  );
}
