// Optional sprite sheet support.
//
// Drop a Tibia item sheet at assets/items.png, set TILE/COLS to match it, then
// map item ids to tile indexes below. Anything unmapped keeps its emoji, so the
// game works with a half-finished mapping — or none at all.
//
// Tile index counts left to right, top to bottom, starting at 0:
//
//     0  1  2  3 ...
//    26 27 28 29 ...
//
// tools/sprite-picker.html loads the sheet, draws the grid over it and hands
// you the `itemId: index,` line for whatever tile you click.

export const SHEET = {
  src: 'assets/items.png',
  tile: 32, // pixel size of one sprite
  cols: 26, // sprites per row in the sheet
};

/** itemId → tile index. Empty means "emoji everywhere", which is the default. */
export const SPRITES = {
  // rapier: 41,
  // plate_armor: 320,
};

export function spritePosition(itemId) {
  const index = SPRITES[itemId];
  if (index == null) return null;
  return {
    x: -(index % SHEET.cols) * SHEET.tile,
    y: -Math.floor(index / SHEET.cols) * SHEET.tile,
  };
}

export const hasSprites = () => Object.keys(SPRITES).length > 0;
