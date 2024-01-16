A browser extension that automatically solves certain puzzle games. The status of each site/game is listed below. 

## Setup

Different browsers have different requirements for the various parameters in the manifest file. To facilitate cross-browser testing, as well as setup, browser-specific manifest files are available. To use the extension, either create a symlink to the manifest file corresponding to the browser of your choice, or rename it to `manifest.json`.

The manifest will likely need to be modified / ammended slightly to work with other browsers, but the code should transfer without issue; unless you are using an absurdly old browser version.

*** Pop-up has only been tested on Firefox. There may be issues with other browsers

To use this browser extension, download the code. Then follow the browser specific instructions below:

Chrome/Chromium: [Follow these instructions](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked)

Firefox: First set the "manifest_version" number according to Mozilla's [current standard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/manifest_version). Then follow [these instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)

---

## www.puzzle-battleships.com/ (battleships.js)

merely a stub

Size  | Difficulty | Solve Time [s]
------|------------|---------------
6x6   | Easy       | ??
6x6   | Hard       | ??
8x8   | Easy       | ??
8x8   | Hard       | ??
10x10 | Easy       | ??
10x10 | Hard       | ??
15x15 | Easy       | ??
15x15 | Hard       | ??

---

## www.puzzle-binairo.com/ (binairo.js)

Successfully completes all 'easy' puzzles.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
6x6   | Easy       | 0.417
6x6   | Hard       | ??
8x8   | Easy       | 0.514
8x8   | Hard       | ??
10x10 | Easy       | 0.552
10x10 | Hard       | ??
14x14 | Easy       | 0.564
14x14 | Hard       | ??
20x20 | Easy       | 0.776
20x20 | Hard       | ??

---

## www.puzzle-kakurasu.com/ (kakurasu.js)

Successfully completes all puzzles modes. The solver-fn first generates a object of possibilities based on the size of the field, where each key is the row/column sum, and the coresponding value is a list of cell combinations that sum to the key. The initial list of options for each row/column is set by the possibilities-object and that row/column's given sum. The row/column options are repeatedly processed and filtered until each row/column has only 1 option remaining. A process/filter step consists of checking the following 2 conditions:

- If all options for the current axis (row/column) contain a certain value, then the cell corresponding to that value is filled and the cross axis options that do not contain that value are filtered out.
- If a certain value is missing from all options, then the cell corresponding to that value is cleared and the cross axis options that do contain it are filtered out.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
4x4   | Easy       | 0.496
4x4   | Hard       | 0.489
5x5   | Easy       | 0.491
5x5   | Hard       | 0.513
6x6   | Easy       | 0.472
6x6   | Hard       | 0.521
7x7   | Easy       | 0.502
7x7   | Hard       | 0.481
8x8   | Easy       | 0.517
8x8   | Hard       | 0.557
9x9   | Easy       | 0.527
9x9   | Hard       | 0.567

---

## www.puzzle-minesweeper.com/minesweeper (minesweeper.js)

Successfully solves all minesweeper puzzles. The minesweeper puzzles on this site are unambiguous, in that all information necessary to solve them is presented to the user from the beginning, and there is never a reason to guess. The solver-fn uses a 2D array of objects to keep track of each cell's state. Clue cells have a list of references to the adjacent cells known as their cluster, as well as their given value. Unknown cells merely have booleans indicating whether it is cleared, flagged, or unset. The easy solver-fn simply performs a basic pass on each clue not set to 'done'. A basic pass consists of checking for one of the two following cases:

- The clue requires no more flags, but is not yet marked done. If there are any cells remaining in its cluster, those should be cleared and removed.
- The number of flags needed by the clue equals the size (number of elements) of its cluster. All cells in its cluster are then flagged.

The hard solver-fn first expands each clue cell to include the set of clues that influence the cells that it influences (clues in a 5x5 window centered on the clue in question). The main solving loop loops through each incomplete clue, performing a basic pass, before comparing it to each of its 'clue-neighbors' and checking for either of the two following conditions:

- If both clues require the same number of flags, the length of the active clue's cluster is greater than the number of overlapping cells, and the neighbor-clue's remaining cluster cells are the overlapping cells, then the clue's non-overlapping cells are cleared. In this example the center-right 2 is the active clue and the 1 to its left is the neighbor clue. The 1's flag will be the 2's final flag, thus the 2's remaining cluster cells (bottom-right) must be cleared.
```
┬───┬───┬───┬───┐             ┬───┬───┬───┬───┐
| 1 | 0 | x | 1 |             | 1 | 0 | x | 1 |
┼───┼───┼───┼───┤             ┼───┼───┼───┼───┤
| x | 1 | 2 | F |     ──>     | x | 1 | 2 | F |
┼───┼───┼───┼───┤             ┼───┼───┼───┼───┤
| 2 |   |   |   |             | 2 |   |   | x |
┼───┼───┼───┼───┤             ┼───┼───┼───┼───┤
```
- If the active clue's number of non-overlapping cells is equal to the active clue's number of flags needed minus the neighbor clue's number of flags needed and the number of non-overlapping cells is greater than 0, then the active clue's non-overlapping cells are flagged. In this example the active clue is the 2 on the right, and the neighbor clue is the 1. There can be at most 1 flag in the cells that the 2 and 1 share, thus the last cell of the 2's cluster (top-center) must be flagged.
```
┼───┼───┼───┤             ┼───┼───┼───┤
|   |   | x |             |   | F | x |
┼───┼───┼───┤             ┼───┼───┼───┤
| 2 |   | 2 |     ──>     | 2 |   | 2 |
┼───┼───┼───┤             ┼───┼───┼───┤
|   | 1 |   |             |   | 1 |   |
┴───┴───┴───┘             ┴───┴───┴───┘
```
This is repeated until the puzzle is solved.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
5x5   | Easy       | 0.387
5x5   | Hard       | 0.412
7x7   | Easy       | 0.387
7x7   | Hard       | 0.407
10x10 | Easy       | 0.420
10x10 | Hard       | 0.429
15x15 | Easy       | 0.550
15x15 | Hard       | 0.580
20x20 | Easy       | 0.747
20x20 | Hard       | 0.763

---

## www.puzzle-minesweeper.com/mosaic (mosaic.js)

Successfully solves all mosaic puzzles. Mosiac is quite similar to minesweeper, the main difference being that all cells, including clues, can be set or cleared. As such, the solver-fn setup is a little different than Minesweeper's, but all solving is basically the same.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
5x5   | Easy       | 0.445
5x5   | Hard       | 0.541
7x7   | Easy       | 0.520
7x7   | Hard       | 0.585
10x10 | Easy       | 0.600
10x10 | Hard       | 0.660
15x15 | Easy       | 0.832
15x15 | Hard       | 0.803
20x20 | Easy       | 1.298
20x20 | Hard       | 1.364

---

## www.puzzle-nonograms.com (nonograms.js)

The solver works, and has been test on puzzle sizes 5x5, 10x10, and 15x15, and _should_ work for the remaining sizes, but seems to lag out. This is likely due to the recursion during setup or the potentially large number of arrays used to represent all possibilities for each row / column. Approximate solve-times are shown below, and could probably be better. The current methodology is to generate for each row and column all possible mark/clear permutations, and progressively eliminate them until the field is filled. This is arguably a very naive approach. Future versions will likely attempt to skip sparse lines until more information is gather from intersecting lines.

Size  | Solve Time [s]
------|---------------
5x5   | 0.71
10x10 | 0.92
15x15 | 6.90
20x20 | ??
25x25 | ??

---

## www.puzzle-skyscrapers.com (skyscrapers.js)

Sucessfully solves the 'easy' and 'normal' game modes. *Sometimes* solves the 4x4 'hard' puzzles. The solver-fn creates a list of possible value permutations [1-N] and copies it for each row/column. Each of these lists of options is filtered by the corresponding edge clues. Next, pre-filled cells are taken into account, and used to filter the row/column options. Each cell contains a list of possible values that is also filtered by the remaining row/column options for that cell. The process of filtering the row/column options based on their cells is repeated until each row/column only has 1 option. This process works for the 'easy' and 'normal' difficulty game modes, but not for the 'hard' ones.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
4x4   | Easy       | 0.575
4x4   | Normal     | 0.349
4x4   | Hard       | 0.474
5x5   | Easy       | 0.538
5x5   | Normal     | 0.586
5x5   | Hard       | ??
6x6   | Easy       | 0.574
6x6   | Normal     | 0.591
6x6   | Hard       | ??

---

## www.puzzle-tents.com (tents.js)

Successfully solves all easy puzzles, and generally solves the hard ones. The algorithm uses a task queue to control the work flow. The possible tasks are:
- process_row(): check a given row for clearable cells and tent-able cells.
  - If the number of tents remaining is equal to the number of unset cells remaining, those can all be set to tents.
  - If there are no tents remaining, but unset cells remain, those can all be set to clear.
  - If neither of the 2 previous conditions is met, a regex is performed on the row to search for tent-able and clearable cells.
- process_col(): same as process_row(), but applied to a column.
- clear_cell(): clear a given cell.
- pitch_tent(): set a cell to tent.
- check_tent(): check if a tent cell can be assigned to a tree.

The tasks add more tasks to the queue as needed. Once the queue is empty the field is checked for completion. The solve times shown below are only estimates. The 15x15 hard puzzles have a ~50% chance of failure.

Size  | Difficulty | Solve Time [s]
------|------------|---------------
6x6   | Easy       | 0.6
6x6   | Hard       | 0.76
8x8   | Easy       | 0.79
8x8   | Hard       | 0.86
10x10 | Easy       | 1.2
10x10 | Hard       | 1.2
15x15 | Easy       | 1.8
15x15 | Hard       | 1.8*

## www.puzzle-thermometers.com (thermometers.js)

Sucessfully solves all puzzles that have been tested so far. Main features are a comprehensive `grid` object that contains the grid cells both via row access and via column access. This structure allowed the functionality of a process_row() and process_column() to be combined, without needing to transpose the grid inbetween operations. For control of workflow a task queue is used. Tasks are the following:
- `process_line()`: check a given line (row/column) for clearable and settable cells. Combines the would-be functionality of a process_row() and process_col(). 
  - If the number of fills remaining equals the number of unset cells, those cells are filled.
  - If the number of filled cells equals the line fill count, the remaining cells are cleared.
  - Cells are cleared based on the longest thermometer section in the line and the line fill count.
  - Cells are filled based on the longest thermometer section in the line, the line fill count, and the number of unset cells in the line.
- `clear_cell()`: clear a given cell. `clear_cell()` tasks added by this function are added at the beginning of the queue to avoid interfering with `process_line()`.
- `fill_cell()`: fill a given cell. `fill_cell()` tasks added by this function are added at the beginning of the queue to avoid interfering with `process_line()`.

Size  | Type       | Solve Time [s]
------|------------|---------------
4x4   | Normal     | ??
4x4   | Curved     | ??
6x6   | Normal     | ??
6x6   | Curved     | ??
10x10 | Normal     | ??
10x10 | Curved     | ??
15x15 | Normal     | ??
15x15 | Curved     | ??