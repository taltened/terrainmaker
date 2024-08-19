import { GridProps, grids } from '../../common/grid';

export const useGrid = <T extends GridProps>(props: T) => grids[props.type];
