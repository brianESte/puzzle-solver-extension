// mosaic.js
// a variation of minesweeper apparently
// designed to work on the page: https://www.puzzle-minesweeper.com/mosaic-*

document.addEventListener("DOMContentLoaded", () => {
  // wait for the board to be ready
  waitForElm(".mosaic-cell-back").then((elm) => {
    // console.log(elm.textContent);
    play_game();
  });
});

// Credit to Yong Wang (https://stackoverflow.com/a/61511955) for the base of this function
function waitForElm(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType != 1) return;
          // if the node matches the selector, resolve the promise and return from callback
          if (node.matches(selector)) {
            resolve(document.querySelector(selector));
            observer.disconnect();
            return;
          }
        })
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function play_game() {
  let btn_Done = document.getElementById("btnReady");
  if (btn_Done === null || document.getElementsByClassName("err").length) return;
  // disabling the timer is only superficial. 
  // var stop_tmr = document.getElementsByName("stopClock")[0];
  // stop_tmr.value = 1;

  // game dimensions from url:
  let game_mode = document.URL.substring(42)
  const [H, W] = game_mode.split('-')[0].split('x').map(char => parseInt(char));

  var field = new Array(H);
  for (let r_i = 0; r_i < H; r_i++) field[r_i] = new Array(W);

  var cell_nums = document.getElementsByClassName("number");

  // first pass: create a cell obj for each cell
  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      let val = parseInt(cell_nums[r_i * W + c_i + 1].innerText); // +1 to skip the first element

      if (isNaN(val)) {
        field[r_i][c_i] = { clue: false, clear: false, filled: false };
      } else {
        field[r_i][c_i] = { clue: true, clear: false, filled: false, done: false, val: val, fills_needed: val };
      }
    }
  }

  const cluster_range = [-1, 0, 1];
  // update each cell with an array of adjacent clues/unknown cells
  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      // build list of cluster coordinates. (this code block could be moved into the above loop, but idk what benefit it would have)
      let cluster = [];
      for (let dy of cluster_range) {
        let y = r_i + dy;
        if (y >= H || y < 0) continue;
        for (let dx of cluster_range) {
          let x = c_i + dx;
          if (x >= W || x < 0) continue;
          cluster.push(field[y][x]);
        }
      }

      // if cell is a clue, add its cluster to the object
      if (field[r_i][c_i].clue) field[r_i][c_i].cluster = cluster;

      // all cells in Mosaic are settable, and thus need an array of clues_in_range
      field[r_i][c_i].clues_in_range = cluster.filter(cell => cell.clue);
    }
  }

  // Check the difficulty, and call appropriate solver-function
  if (game_mode.endsWith('hard/')) {
    field = solve_mosaic_hard(field);
  } else {
    field = solve_mosaic_easy(field);
  }

  // set robot to true
  document.getElementById("robot").value = 1;
  // first get game element:
  const game_brd = document.getElementById("game");
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 10) / W;
  const delta_y = (game_box.height - 10) / H;

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      if (field[r_i][c_i].filled) {
        let evt_opts = {
          bubbles: true,
          // button: 2,
          // cancelable: false,
          clientX: game_box.x + 5 + (c_i + 0.5) * delta_x,
          clientY: game_box.y + 5 + (r_i + 0.5) * delta_y,
          // pointerType: "mouse",
          // view: window,
        }
        game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
        game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
      }
    }
  }

  // btn_Done.dispatchEvent(new MouseEvent("mousedown", {bubbles: true, clientX: 800, clientY: 364}));
  btn_Done.click();
}

/**
 * Solve an easy mosaic
 * cell state is given by the boolean properties 'clear' and 'filled'
 * 
 * @param {Array} field   initial state of the puzzle grid
 * @returns           solved state of the puzzle grid
 */
function solve_mosaic_easy(field) {
  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      if (field[r_i][c_i].clue) clue_cells.push(field[r_i][c_i]);
    }
  }

  // let it_ctr = 0;
  // loop through each clue and check the 2 basic cases
  while (!clue_cells.every(cell => cell.done)) {
    for (let clue_cell of clue_cells) {
      if (!clue_cell.done) perform_basic_pass(clue_cell);
    }

    // if(it_ctr++ > 2*H){
    //   console.log(`too many iterations. (it_ctr = ${it_ctr-1}). breaking`);
    //   // print_field(field);
    //   console.log(field);
    //   break;
    // }
  }
  return field;
}

/**
 * solve a hard Mosaic puzzle
 * @param {Array} field   initial state of puzzle field
 * @returns           solved field
 */
function solve_mosaic_hard(field) {
  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  // update clue cells of field...
  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      if (!field[r_i][c_i].clue) continue;
      let clue_cell = field[r_i][c_i];

      // create list of adjacent clue cells
      let next_clues = new Set();
      for (let adj_cell of clue_cell.cluster) {
        // in Mosaic, all cells are settable, loop through em
        for (let clue of adj_cell.clues_in_range) {
          next_clues.add(clue);
        }
      }
      next_clues.delete(clue_cell);
      // add the clue coordinates to the list of clue cells
      clue_cells.push(clue_cell);
      // set the current cell to a clue object 
      clue_cell.next_clues = next_clues;
    }
  }

  // perform an initial basic pass
  for (let clue_cell of clue_cells) perform_basic_pass(clue_cell);

  // var it_ctr = 0;
  // now start looping through the clues..
  while (!clue_cells.every(cell => cell.done)) {
    for (let clue of clue_cells) {
      if (clue.done) continue;

      // check basic cases first
      perform_basic_pass(clue);
      if (clue.done) continue;

      // loop through the neighbor clues
      for (let nearby_clue of clue.next_clues) {

        // determine overlapping cells
        let overlapping = clue.cluster.filter(item => nearby_clue.cluster.includes(item));

        // if overlapping cells account for all remaining fills, set non-overlapping cells in cluster to clear
        if (clue.fills_needed === nearby_clue.fills_needed && clue.cluster.length > overlapping.length && nearby_clue.cluster.length === overlapping.length) {
          // obtain non-overlapping cells from active clue's cluster
          let cells_to_be_cleared = clue.cluster.filter(item => !overlapping.includes(item));
          // clear those cells, and remove them from nearby clusters
          clear_cells_remove_from_clusters(cells_to_be_cleared);
          continue;
        }

        let n_cluster_diff = clue.cluster.length - overlapping.length
        if (n_cluster_diff === (clue.fills_needed - nearby_clue.fills_needed) && n_cluster_diff > 0) {
          // obtain non-overlapping cells from active clue, and fill them
          fill_cells_remove_from_clusters(clue.cluster.filter(item => !overlapping.includes(item)));
        }
      }
    }
    // if(it_ctr++ > H*H){
    //   console.log(`too many iterations. (it_ctr = ${it_ctr-1}). breaking`);
    //   console.log(field);
    //   break;
    // }
  }
  return field;
}

/**
 * Given the field and a clue, perform the basic checks:
 * 1. A clue that has been fully filled, but is not yet marked done
 * 2. A clue whose remaining cluster size matches its number of missing fills
 * @param {Object} clue   clue object
 * @returns 
 */
function perform_basic_pass(clue) {
  // if a clue is fully filled, set it to done
  if (clue.fills_needed === 0) {
    // and clear any remaining cells in its cluster, and remove them from nearby clusters
    if (clue.cluster.length > 0) clear_cells_remove_from_clusters(clue.cluster);
    clue.done = true;
    return;
  }

  // if remaining number of filled-cells == remaining cluster and > 0, set cluster to filled-cells
  if (clue.fills_needed === clue.cluster.length && clue.fills_needed > 0) {
    fill_cells_remove_from_clusters(clue.cluster);
    clue.done = true;
  }
}

/**
 * Clear each cell in the given array, and remove them from the clusters of adjacent clues
 * @param {Array} cells_to_be_cleared   array of cells to be filled
 */
function clear_cells_remove_from_clusters(cells_to_be_cleared) {
  for (let cell_to_be_cleared of cells_to_be_cleared) {
    cell_to_be_cleared.clear = true;
    // now update the clusters of all nearby clues
    for (let clue_cell of cell_to_be_cleared.clues_in_range) {
      clue_cell.cluster = clue_cell.cluster.filter(cell => cell !== cell_to_be_cleared);
    }
  }
}

/**
 * Fill each cell in the given array, and remove them from the clusters of adjacent clues
 * @param {Array} cells_to_be_filled  array of cells to be filled
 */
function fill_cells_remove_from_clusters(cells_to_be_filled) {
  for (let cell_to_be_filled of cells_to_be_filled) {
    // set that cell to filled
    cell_to_be_filled.filled = true;
    // now update the clusters of all nearby clues and filled counts
    for (let clue_cell of cell_to_be_filled.clues_in_range) {
      clue_cell.cluster = clue_cell.cluster.filter(cell => cell !== cell_to_be_filled);
      clue_cell.fills_needed--;
    }
  }
}

/**
 * Pretty print the field. Necessary because each field cell is an object, which doesn't print nicely
 * @param {Array} field 
 */
function print_field(field, info = null) {
  if (info != null) console.log(info);

  console.log(field.map(row => row.map(cell => {
    if (cell.clear) return 'o';
    if (cell.filled) return 'x';
    if (cell.clue) return cell.val;
    return ' ';
  }).join('') + '\n').join(''))
}
