// minesweeper.js
// designed to work on the page: https://www.puzzle-minesweeper.com/minesweeper-*

document.addEventListener("DOMContentLoaded", () => {
  // wait for the board to be ready
  waitForElm(".minesweeper-cell-back").then((elm) => {
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
  var game_mode = document.URL.substring(47);
  let btn_Done = document.getElementById("btnReady");
  if (btn_Done === null || document.getElementsByClassName("err").length) {
    game_mode = game_mode.replace('/', '');
    // retrieve the previous solve times
    var solve_time_obj = JSON.parse(sessionStorage.getItem("solve_times"));
    if (solve_time_obj === null) {
      // If there is no existing solve_times object, create one and skip the first solve time.
      // The first one is (almost) always a slow outlier.
      solve_time_obj = {
        "5x5-easy": [], "5x5-hard": [], "7x7-easy": [], "7x7-hard": [], "10x10-easy": [], "10x10-hard": [],
        "15x15-easy": [], "15x15-hard": [], "20x20-easy": [], "20x20-hard": []
      };
      sessionStorage.setItem("solve_times", JSON.stringify(solve_time_obj));
      sessionStorage.setItem("game_mode", game_mode);
      // setTimeout(() => document.getElementById("btnNew").click(), 500);
      return;
    }
    var last_game_mode = sessionStorage.getItem("game_mode");
    if (last_game_mode !== game_mode) {
      // setTimeout(() => document.getElementById("btnNew").click(), 500);
      return;
    }

    let [minutes, seconds] = document.getElementsByClassName("succ")[0].innerText.substring(47).split(':');
    // add the new solve time
    solve_time_obj[game_mode].push(60 * parseInt(minutes) + parseFloat(seconds));
    // store the updated object
    sessionStorage.setItem("solve_times", JSON.stringify(solve_time_obj));

    if (solve_time_obj[game_mode].length % 200 === 0) {
      // display solve times
      console.log("Current average solve times:");
      for (let mode in solve_time_obj) {
        let n_mode_solves = solve_time_obj[mode].length;
        if (n_mode_solves === 0) continue;
        let sum_times = solve_time_obj[mode].reduce((prev, curr) => prev + curr, 0);
        console.log(`${mode} (n=${n_mode_solves}): ${sum_times / n_mode_solves}`);
      }
    } else {
      // setTimeout(() => document.getElementById("btnNew").click(), 500);
    }
    return;
  }
  // diabling the timer is only superficial. 
  // var stop_tmr = document.getElementsByName("stopClock")[0];
  // stop_tmr.value = 1;

  // game dimensions from url:
  const [H, W] = game_mode.split('-')[0].split('x').map(c => parseInt(c));

  var field = new Array(H);
  for (let r_i = 0; r_i < H; r_i++) field[r_i] = new Array(W).fill();

  var cell_nums = document.getElementsByClassName("number");

  // first pass: create a cell obj for each clue and a non-clue obj for each settable cell
  for(let r_i = 0; r_i < H; r_i++){
    for(let c_i = 0; c_i < W; c_i++){
      let val = parseInt(cell_nums[r_i*W + c_i + 1].innerHTML);   // +1 to skip the first element

      if(isNaN(val)){
        field[r_i][c_i] = {clue: false, clear: false, flag: false};
      } else {
        field[r_i][c_i] = {clue: true, done: false, val: val, flags_needed: val};
      }
    }
  }
  
  // update each cell with an array of adjacent clues/unknown cells
  const nei_range = [-1, 0, 1];
  for( let r_i = 0; r_i < H; r_i++){
    for( let c_i = 0; c_i < W; c_i++){
      // generate array of cells adjacent to active cell
      let adjacents = [];
      for(let dy of nei_range){
        let y = r_i+dy;
        if(y >= H || y < 0)  continue;
        for(let dx of nei_range){
          if(dx == 0 && dy == 0)  continue;
          let x = c_i+dx;
          if(x >= W || x < 0)  continue;
          adjacents.push(field[y][x]);
        }
      }

      if(field[r_i][c_i].clue){
        // if cell is a clue, add its cluster to the object
        field[r_i][c_i].cluster = adjacents.filter(cell => !cell.clue);
      } else {
        // if cell is unknown, add an array of clues within that cell's cluster
        field[r_i][c_i].clues_in_range = adjacents.filter(cell => cell.clue);
      }
    }
  }

  // check difficulty and select appropriate solver-fn
  if(game_mode.endsWith('hard/')){
    field = solve_minesweeper_hard(field);
  } else {
    field = solve_minesweeper_easy(field);
  }

  // now enter the flags programmatically:
  // set robot to true
  document.getElementById("robot").value = 1;
  // first get game element:
  const game_brd = document.getElementById("game");
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 10) / W;
  const delta_y = (game_box.height - 10) / H;

  for( let r_i = 0; r_i < H; r_i++){
    for( let c_i = 0; c_i < W; c_i++){
      if( !field[r_i][c_i].clue && field[r_i][c_i].flag){
        let evt_opts = {
          bubbles: true,
          button: 2,
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
 * Solve an easy Minesweeper
 * 
 * @param {Array} field   initial state of the puzzle grid
 * @returns               solved state of the puzzle grid
 */
function solve_minesweeper_easy(field){
  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  for(let r_i = 0; r_i < H; r_i++){
    for(let c_i = 0; c_i < W; c_i++){
      if(field[r_i][c_i].clue)  clue_cells.push(field[r_i][c_i]);
    }
  }

  // var loop_ct = 0;
  // loop through each clue and fill in its cluster as needed
  while(!clue_cells.every(cell => cell.done)){
    for(let clue_cell of clue_cells){
      // perform the basic pass if the clue isn't done / completed
      if(!clue_cell.done) perform_basic_pass(clue_cell);
    }

    // loop_ct++;
    // if(loop_ct > H+3){
    //   console.log("too many iterations. breaking");
    //   print_field(field);
    //   console.log(field);
    //   return;
    // }
  }

  return field;
}


/**
 * Solve a hard Minesweeper
 * 
 * @param {Array} field   initial state of field to be solved
 * @returns               solved state of field
 */
function solve_minesweeper_hard(field){
  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  // update clue cells of field...
  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      if (!field[r_i][c_i].clue) continue;
      let clue_cell = field[r_i][c_i];

      // create list of neighboring clue cells
      let next_clues = new Set();
      for (let adj_cell of clue_cell.cluster) {
        // if the cell is a clue cell, skip it
        if (adj_cell.clue) continue;
        // otherwise, loop through the clues_in_range of that settable cell
        for (let nearby_clue_cell of adj_cell.clues_in_range) next_clues.add(nearby_clue_cell);
      }
      next_clues.delete(clue_cell);
      // add the clue coordinates to the list of clue cells
      clue_cells.push(clue_cell)
      // set the current cell to a clue object 
      clue_cell.next_clues = next_clues;
    }
  }

  // perform an initial basic pass on each clue
  for (let clue_cell of clue_cells) perform_basic_pass(clue_cell);

  // var it_ct = 0;
  // now start looping through the clues..
  while (!clue_cells.every(cell => cell.done)) {
    for (let clue of clue_cells) {
      if (clue.done) continue;

      // check basic cases first, and skip to next iteration if the clue was completed
      perform_basic_pass(clue);
      if (clue.done) continue;

      // loop through the neighbor clues
      for (let nearby_clue of clue.next_clues) {
        // determine overlapping cells
        let overlapping = clue.cluster.filter(item => nearby_clue.cluster.includes(item));

        // if overlapping cells account for all remaining flags, set non-overlapping cells in cluster to clear
        if (clue.flags_needed === nearby_clue.flags_needed && clue.cluster.length > overlapping.length && nearby_clue.cluster.length === overlapping.length) {
          let cells_to_be_cleared = clue.cluster.filter(item => !overlapping.includes(item));
          // clear those cells, and remove them from nearby clusters
          clear_cells_remove_from_clusters(cells_to_be_cleared);
          continue;
        }

        let n_cluster_diff = clue.cluster.length - overlapping.length
        if (n_cluster_diff === (clue.flags_needed - nearby_clue.flags_needed) && n_cluster_diff > 0) {
          // obtain non-overlapping cells from active clue
          let cells_to_be_flagged = clue.cluster.filter(item => !overlapping.includes(item));
          flag_cells_remove_from_clusters(cells_to_be_flagged);
        }
      }
    }
    // if(it_ct++ > H+5){
    //   if(DEBUG) console.log("too many iterations... stopping");
    //   if(DEBUG) console.log(field);
    //   break;
    // }
  }

  return field;
}

/**
 * Given the field and a clue, perform the basic checks:
 * 1. A clue that has been fully flagged, but is not yet marked done
 * 2. A clue whose remaining cluster size matches its number of missing flags
 * @param {Object} clue  clue object
 * @returns 
 */
function perform_basic_pass(clue) {
  // if a clue is fully flagged, but has a non-zero cluster, clear the cluster cells
  if (clue.flags_needed === 0) {
    // clear those cells, and remove them from nearby clusters
    if (clue.cluster.length > 0) clear_cells_remove_from_clusters(clue.cluster);
    clue.done = true;
    return;
  }
  // if remaining number of flags == remaining cluster and > 0, set cluster to flagged
  if (clue.flags_needed === clue.cluster.length && clue.flags_needed > 0) {
    flag_cells_remove_from_clusters(clue.cluster);
    clue.done = true;
    return;
  }
}

/**
 * Clear each cell in the given array, and remove them from the clusters of adjacent clues
 * @param {Array} cells_to_be_cleared   array of cells to be cleared
 */
function clear_cells_remove_from_clusters(cells_to_be_cleared) {
  // for(let cell_coords of cells_to_be_cleared){
  for (let cell_to_be_cleared of cells_to_be_cleared) {
    cell_to_be_cleared.clear = true;
    // now update the clusters of all nearby clues
    for (let nearby_clue of cell_to_be_cleared.clues_in_range) {
      nearby_clue.cluster = nearby_clue.cluster.filter(cell => cell !== cell_to_be_cleared);
    }
  }
}

/**
 * Flag each cell in the given array, and remove them from the clusters of adjacent clues
 * @param {Array} cells_to_be_flagged  array of cells to be flagged
 */
function flag_cells_remove_from_clusters(cells_to_be_flagged) {
  for (let cell_to_be_flagged of cells_to_be_flagged) {
    // set that cell to flagged
    cell_to_be_flagged.flag = true;
    // now update the clusters of all nearby clues and flag counts
    for (let nearby_clue of cell_to_be_flagged.clues_in_range) {
      nearby_clue.cluster = nearby_clue.cluster.filter(cell => cell !== cell_to_be_flagged);
      nearby_clue.flags_needed--;
    }
  }
}

function print_field(field, info=null){
  if(info != null)  console.log(info);

  console.log(field.map(row => row.map(cell => {
    if(cell.clue) return cell.val;
    if(cell.clear)  return 'o';
    if(cell.flag) return 'x';
    return ' ';
  }).join('')+'\n').join(''))
}

function test_ms_hard(){
  const field_init = [
    ['1', '', '',   '',   ''],
    ['',  '', '2',  '1',  '1'],
    ['1', '', '',   '',   ''],
    ['1', '', '1',  '',  '1'],
    ['',  '', '',   '1',   '1']];

  var field = solve_minesweeper_hard(field_init);
  print_field(field);
  console.log(field);
}
