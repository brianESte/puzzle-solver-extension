// minesweeper.js
// designed to work on the page: https://www.puzzle-minesweeper.com/minesweeper-*

document.addEventListener("DOMContentLoaded", () => {
  // wait for the board to be ready
  waitForElm(".minesweeper-cell-back").then((elm) => {
    // console.log(elm.textContent);
    play_game();
  });
});

// const DEBUG = true;

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
          if(node.nodeType != 1)  return;
          // if the node matches the selector, resolve the promise and return from callback
          if(node.matches(selector)){
            resolve(document.querySelector(selector));
            observer.disconnect();
            return;
          }
        })
      });
    });

    observer.observe(document.body, {childList: true, subtree: true});
  });
}

function play_game(){
  let btn_Done = document.getElementById("btnReady");
  if(btn_Done === null || document.getElementsByClassName("err").length)  return;
  // diabling the timer is only superficial. 
  // var stop_tmr = document.getElementsByName("stopClock")[0];
  // stop_tmr.value = 1;

  // game dimensions from url:
  let game_type = document.URL.substring(47)
  const [H, W] = game_type.split('-')[0].split('x').map(c => parseInt(c));

  var field = new Array(H);
  for (let r_i = 0; r_i < H; r_i++){
    field[r_i] = new Array(W);
    field[r_i].fill(0);
  }

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
  for( let r_i = 0; r_i < H; r_i++){
    for( let c_i = 0; c_i < W; c_i++){
      // generate neighbor coordinates for the cell
      let neighbor_coords = gen_neighbor_coords(H, W, r_i, c_i);

      if(field[r_i][c_i].clue){
        // if cell is a clue, add its cluster to the object
        neighbor_coords = neighbor_coords.filter(coord => {
          coord = coord.split(',');
          return !field[coord[0]][coord[1]].clue;
        });

        field[r_i][c_i].cluster = neighbor_coords;
      } else {
        // if cell is unknown, add an array of nearby clues
        let nearby_clues = [];
        for(let neighbor_coord of neighbor_coords){
          neighbor_coord = neighbor_coord.split(',')
          // if cell at coordinates is a clue, add it to nearby_clues
          if(field[neighbor_coord[0]][neighbor_coord[1]].clue) nearby_clues.push(neighbor_coord.join(','));
        }

        field[r_i][c_i].nearby_clues = nearby_clues;
      }
    }
  }

  // check if easy/hard. if not hard, solve it...
  if(game_type.endsWith('hard/')){
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
 * Solve an easy minesweeper
 * 
 * @param {*} field   initial state of the puzzle grid
 * @returns           solved state of the puzzle grid
 */
function solve_minesweeper_easy(field){
  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  for(let r_i = 0; r_i < H; r_i++){
    for(let c_i = 0; c_i < W; c_i++){
      if(field[r_i][c_i].clue)  clue_cells.push([r_i, c_i]);
    }
  }

  // var loop_ct = 0;
  // loop through each clue and fill in its cluster as needed
  while(!clue_cells.every(item => field[item[0]][item[1]].done)){
    for(let clue_coords of clue_cells){
      // let cell_val = parseInt(field[r_i][c_i])
      let clue = field[clue_coords[0]][clue_coords[1]];
      if(clue.done) continue;

      // if a clue is fully flagged, but has a non-zero cluster, clear the cluster cells
      if(clue.flags_needed === 0){
        if(clue.cluster.length > 0){
          // clear those cells, and remove them from nearby clusters
          clear_cells_remove_from_clusters(clue.cluster, field);
        }
        clue.done = true;
        continue;
      }  
      
      // if remaining number of flags == remaining cluster and > 0, set cluster to flagged
      if(clue.flags_needed === clue.cluster.length && clue.flags_needed > 0){
        flag_cells_remove_from_clusters(clue.cluster, field);
        clue.done = true;
        continue;
      }
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
 * 
 * @param {*} field   initial state of field to be solved
 * @returns           field - solved state of field
 */
function solve_minesweeper_hard(field){

  const H = field.length;
  const W = field[0].length;

  var clue_cells = [];

  // update clue cells of field...
  for( let r_i = 0; r_i < H; r_i++){
    for( let c_i = 0; c_i < W; c_i++){
      if(!field[r_i][c_i].clue) continue;

      // create coordinate list of neighboring clues
      let next_clue_coords = new Set();
      for(let neighbor_coord of field[r_i][c_i].cluster){
        neighbor_coord = neighbor_coord.split(',');
        let cell = field[neighbor_coord[0]][neighbor_coord[1]];
        // if the cell is a clue cell, skip it
        if(cell.clue) continue;
        // otherwise, loop through the nearby_clues of that settable cell
        for(let clue of cell.nearby_clues){
          next_clue_coords.add(clue);
        }
      }
      next_clue_coords.delete(`${r_i},${c_i}`);
      // add the clue coordinates to the list of clue cells
      clue_cells.push([r_i, c_i]);
      // set the current cell to a clue object 
      field[r_i][c_i].next_clue_coords = next_clue_coords;
    }
  }

  // perform an initial basic pass
  for(let clue_coords of clue_cells){
    let clue = field[clue_coords[0]][clue_coords[1]];
    let cluster = clue.cluster;

    // if a flag set in a previous iteration completed a clue, clear the remaining cluster-cells and remove them from nearby clues
    if(clue.flags_needed === 0){
      if(clue.cluster.length > 0){
        // clear those cells, and remove them from nearby clusters
        clear_cells_remove_from_clusters(clue.cluster, field);
      }
      clue.done = true;
      continue;
    }
    // if remaining number of flags == remaining cluster and > 0, set cluster to flagged
    if(clue.flags_needed === cluster.length && clue.flags_needed > 0){
      flag_cells_remove_from_clusters(cluster, field);
      clue.done = true;
      continue;
    }
  }

  // var it_ct = 0;
  // now start looping through the clues..
  while(!clue_cells.every(item => field[item[0]][item[1]].done)){
    for(let clue_coords of clue_cells){
      let clue = field[clue_coords[0]][clue_coords[1]];
      if(clue.done) continue;
      let cluster = clue.cluster;

      // check basic cases first
      // if a flag set in a previous iteration completed a clue, clear the remaining cluster-cells and remove them from nearby clues
      if(clue.flags_needed === 0){
        if(clue.cluster.length > 0){
          // clear those cells, and remove them from nearby clusters
          clear_cells_remove_from_clusters(clue.cluster, field);
        }
        clue.done = true;
        continue;
      }
      // if remaining number of flags == remaining cluster and > 0, set cluster to flagged
      if(clue.flags_needed === cluster.length && clue.flags_needed > 0){
        flag_cells_remove_from_clusters(cluster, field);
        clue.done = true;
        continue;
      }

      // loop through the neighbor clues
      for(let nei_clue_coords of clue.next_clue_coords){
        nei_clue_coords = nei_clue_coords.split(',');

        let nei_clue = field[nei_clue_coords[0]][nei_clue_coords[1]];

        // determine overlapping cells
        let nei_cluster = nei_clue.cluster;
        let overlapping = cluster.filter(item => nei_cluster.includes(item));

        // if overlapping cells account for all remaining flags, set non-overlapping cells in cluster to clear
        if(clue.flags_needed === nei_clue.flags_needed && cluster.length > overlapping.length && nei_clue.cluster.length === overlapping.length){
          // clear_nonoverlapping(cluster, overlapping, field);
          let cells_to_be_cleared = cluster.filter(item => !overlapping.includes(item));
          // clear those cells, and remove them from nearby clusters
          clear_cells_remove_from_clusters(cells_to_be_cleared, field);
          continue;
        }

        let n_cluster_diff = cluster.length - overlapping.length
        if(n_cluster_diff === (clue.flags_needed - nei_clue.flags_needed) && n_cluster_diff > 0){
          // obtain non-overlapping cells from active clue
          let cells_to_be_flagged = cluster.filter(item => !overlapping.includes(item));
          flag_cells_remove_from_clusters(cells_to_be_flagged, field);
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

function clear_cells_remove_from_clusters(cells_to_be_cleared, field){
  for(let cell_coords of cells_to_be_cleared){
    cell_coords = cell_coords.split(',');
    let cell_ob = field[cell_coords[0]][cell_coords[1]];
    
    cell_ob.clear = true;
    // now update the clusters of all nearby clues
    for(let nearby_clue of cell_ob.nearby_clues){
      nearby_clue = nearby_clue.split(',');
      field[nearby_clue[0]][nearby_clue[1]].cluster = field[nearby_clue[0]][nearby_clue[1]].cluster.filter(item => item !== cell_coords.join());
      // item => item.toString() !== cell_coords.toString()
    }
  }
}

function flag_cells_remove_from_clusters(cells_to_be_flagged, field){
  for(let cell_coords of cells_to_be_flagged){
    cell_coords = cell_coords.split(',');
    let cell_ob = field[cell_coords[0]][cell_coords[1]];
    // set that cell to flagged
    cell_ob.flag = true;
    // now update the clusters of all nearby clues and flag counts
    for(let nearby_clue of cell_ob.nearby_clues){
      nearby_clue = nearby_clue.split(',');
      field[nearby_clue[0]][nearby_clue[1]].cluster = field[nearby_clue[0]][nearby_clue[1]].cluster.filter(item => item !== cell_coords.join());
      field[nearby_clue[0]][nearby_clue[1]].flags_needed--;
    }
  }
}

function gen_neighbor_coords(H, W, r_i, c_i){
  const nei_range = [-1, 0, 1];
  
  let neighbor_coords = [];
  for(let dy of nei_range){
    let y = r_i+dy;
    if(y >= H || y < 0)  continue;
    for(let dx of nei_range){
      if(dx == 0 && dy == 0)  continue;
      let x = c_i+dx;
      if(x >= W || x < 0)  continue;
      neighbor_coords.push(`${y},${x}`)
    }
  }
  return neighbor_coords;
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
