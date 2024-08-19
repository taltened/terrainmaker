import { squareGrid } from './square';

describe('square', () => {
  describe('getClosestCellIndex', () => {
    it('finds the cell from the top-left quadrant', () => {
      const grid = { type: 'square', rows: 2, columns: 2, size: 50} as const;
      expect(squareGrid.getClosestCellIndex(grid, 10, 5)).toEqual([1, 1]);
      expect(squareGrid.getClosestCellIndex(grid, 60, 15)).toEqual([3, 1]);
      expect(squareGrid.getClosestCellIndex(grid, 0, 54)).toEqual([1, 3]);
      expect(squareGrid.getClosestCellIndex(grid, 74, 50)).toEqual([3, 3]);
    })
  });
});
