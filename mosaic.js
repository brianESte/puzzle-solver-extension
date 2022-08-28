// mosaic.js
// a variation of minesweeper apparently
// designed to work on the page: https://www.puzzle-minesweeper.com/mosaic-*

// TODO: imrove solve time, possibly by having an array of flags for the completion of each row...

function play_game() {
  let btn_Done = document.getElementById("btnReady");
  if (btn_Done === null || document.getElementsByClassName("err").length) return;
  // diabling the timer is only superficial. 
  // var stop_tmr = document.getElementsByName("stopClock")[0];
  // stop_tmr.value = 1;
  // set robot to true
  // document.getElementById("robot").value = 1;

  // game dimensions from url:
  let game_type = document.URL.substring(42)
  const [H, W] = game_type.split('-')[0].split('x').map(c => parseInt(c));

  var field = new Array(H);
  for (let r_i = 0; r_i < H; r_i++) {
    field[r_i] = new Array(W);
    for (let c_i = 0; c_i < W; c_i++) {
      field[r_i][c_i] = { num: '', fill: 1 };
    }
  }

  // var cell_nums = $('div.number');
  var cell_nums = document.getElementsByClassName("number");

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      field[r_i][c_i].num = cell_nums[r_i * W + c_i + 1].innerHTML;   // +1 to skip the first element
    }
  }

  // check if easy/hard. if not hard, solve it...
  if (game_type.endsWith('hard/')) {
    console.log("nope, not yet, too hard");
    print_field(field);
    return;
  }

  field = solve_mosaic_easy(field);

  // first get game element:
  const game_brd = document.getElementById("game");
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 10) / W;
  const delta_y = (game_box.height - 10) / H;

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      if (field[r_i][c_i].fill == 2) {
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
 * Pretty print the field. Necessary because each field cell is an object, which doesn't print nicely
 * @param {*} field 
 */
function print_field(field) {
  console.log(field.map(row => row.map(cell => cell.fill)));
}

/**
 * Solve an easy mosaic
 * cell values are: 
 *  0: clear, 1: unset, 2: filled
 * 
 * @param {*} field   initial state of the puzzle grid
 * @returns           solved state of the puzzle grid
 */
function solve_mosaic_easy(field) {
  const H = field.length;
  const W = field[0].length;

  const cluster_range = [-1, 0, 1];
  // loop through each cell and fill in what can be, until complete
  while (field.flat().reduce((prev, curr) => prev + (curr.fill == 1 ? 1 : 0), 0) > 0) {
    for (let r_i = 0; r_i < H; r_i++) {
      for (let c_i = 0; c_i < W; c_i++) {
        let cell_val = parseInt(field[r_i][c_i].num)
        if (isNaN(cell_val)) continue;

        // build list of neighbor coordinates
        let cluster_coords = [];
        for (let dy of cluster_range) {
          let y = r_i + dy;
          if (y >= H || y < 0) continue;
          for (let dx of cluster_range) {
            // if(dx == 0 && dy == 0)  continue;
            let x = c_i + dx;
            if (x >= W || x < 0) continue;
            cluster_coords.push([y, x])
          }
        }

        // count filled and unset cells within cluster
        let n_filled = 0;
        let n_unset = 0;
        // loop through each neighbor and update filled/unset counts
        cluster_coords.forEach(pair => {
          let val = field[pair[0]][pair[1]].fill;
          if (val == 1) { n_unset++; return; }
          if (val == 2) n_filled++;
        })

        // if count of filled among cluster == cell value, clear remaining unset cells
        if (cell_val == n_filled) {
          cluster_coords.forEach(pair => { if (field[pair[0]][pair[1]].fill == 1) field[pair[0]][pair[1]].fill = 0 })
        }
        // if the count of unset + filled within cluster == cell value, set remaining unset to filled
        else if (cell_val == n_filled + n_unset) {
          cluster_coords.forEach(pair => { if (field[pair[0]][pair[1]].fill == 1) field[pair[0]][pair[1]].fill = 2 })
        }
      }
    }
  }
  return field;
}

play_game();
