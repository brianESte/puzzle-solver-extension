// skyscrapers.js
// designed to work on the page: https://www.puzzle-skyscrapers.com/

document.addEventListener("DOMContentLoaded", () => {
  // wait for the board to be ready
  waitForElm(".sudoku-cell-back").then((elm) => {
    // console.log(elm.textContent);
    play_game();
  });
});

// Credit to Yong Wang (https://stackoverflow.com/a/61511955) for the base of this function
function waitForElm(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) return resolve(document.querySelector(selector));

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

  // obtain each clue array
  var clue_arrays = new Array(4);
  const clue_classes = ['task-top', 'task-right', 'task-bottom', 'task-left'];
  for (let s_i = 0; s_i < 4; s_i++) {
    clue_arrays[s_i] = Array.from(document.getElementsByClassName(clue_classes[s_i])).map(item => {
      var val = parseInt(item.innerText);
      if (isNaN(val)) return 0;
      return val;
    });
  }
  // game dimension from number of clues
  const N = clue_arrays[0].length;

  var field = new Array(N);
  for (let r_i = 0; r_i < N; r_i++) field[r_i] = new Array(N);
  const base_options = new Array(N).fill().map((item, i) => i + 1);

  var option_list = [];
  gen_row_options_rec(option_list, [], base_options.slice());
  var h_options = new Array(N).fill().map(() => { return { complete: false, opts: option_list.slice() } });
  var v_options = new Array(N).fill().map(() => { return { complete: false, opts: option_list.slice() } });

  // filter the options for the row/col
  filter_by_clues(v_options, clue_arrays[0], count_visible);
  filter_by_clues(h_options, clue_arrays[1], count_visible_neg);
  filter_by_clues(v_options, clue_arrays[2], count_visible_neg);
  filter_by_clues(h_options, clue_arrays[3], count_visible);

  var cells = document.getElementsByClassName("cell selectable");
  // first pass: create a cell obj for each clue and a non-clue obj for each settable cell
  for (let r_i = 0; r_i < N; r_i++) {
    for (let c_i = 0; c_i < N; c_i++) {
      let val = parseInt(cells[r_i * N + c_i].innerText);

      if (isNaN(val)) {
        field[r_i][c_i] = { val: 0, val_options: base_options.slice(), set: false };
      } else {
        // assign a set object, then filter the h/v_options
        field[r_i][c_i] = { val: val, set: true };
        h_options[r_i].opts = h_options[r_i].opts.filter(option => option[c_i] === val);
        v_options[c_i].opts = v_options[c_i].opts.filter(option => option[r_i] === val);
      }
    }
  }

  // perform an initial field filter based on the updated h/v_options..?
  // console.log(h_options, v_options);
  var it_ctr = 0;
  var basic_progress = true;
  while (!h_options.every(row => row.complete) || !v_options.every(col => col.complete)) {
    // let basic_ctr = 0;
    while(basic_progress){
      basic_progress = false;
      // perform basic pass on first axis
      basic_progress = basic_progress || basic_pass(h_options, v_options, field, true);
      // console.log(`basic_progress after prime_axis check: ${basic_progress}`);
      // perform basic pass on second axis
      basic_progress = basic_progress || basic_pass(v_options, h_options, field, false);
      // console.log(`basic_progress after second_axis check: ${basic_progress}`);
      // if(basic_ctr++ > 3*N){
        // console.log("run away inner loop, breaking");
        // break;
      // }
    }
    // option tree?
    // create an option tree as a copy of a h/v option
    // either loop through all first row/col options, or try to find one with the fewest options
    // 
    var opt_tree = undefined;
    for(let row_opt_obj of h_options){
      for(let base_array of row_opt_obj.opts){
        // TODO: fill in this part
        
      }
    }
    console.log(h_options, v_options);

    // now more advanced loop?


    if (it_ctr++ > 2) {
      console.log("too many iterations, stopping");
      console.log(field);
      console.log(h_options, v_options);
      return;
    }
  }

  // console.log(field);

  // set robot to true
  document.getElementById("robot").value = 1;
  const game_brd = document.getElementById("game");
  // first find cell (0,0)
  var cell_zz_box = document.getElementsByClassName("cell selectable")[0].getBoundingClientRect();
  let click_evt_opts = {
    bubbles: true,
    clientX: cell_zz_box.x + 0.5 * cell_zz_box.width,
    clientY: cell_zz_box.y + 0.5 * cell_zz_box.height,
  };

  game_brd.dispatchEvent(new MouseEvent("mousedown", click_evt_opts));
  game_brd.dispatchEvent(new MouseEvent("mouseup", click_evt_opts));

  // <- 37, ^ 38, -> 39, v 40, {0...6} = {48...54}
  // I don't like using keyCode because it is deprecated, but... I haven't been able to make it work otherwise.
  // var dir = 39;
  // var delta_c = 1;
  for (let r_i = 0; r_i < N; r_i++) {
    for (let c_i = 0; c_i < N; c_i++) {
      game_brd.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode: field[r_i][c_i].val + 48 }));
      game_brd.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode: 39 }));
    }
    game_brd.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode: 40 }));
    for (let c_i = 0; c_i < N - 1; c_i++) game_brd.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode: 37 }));
    // dir = (dir === 39) ? 37 : 39;
  }
  btn_Done.click();
}

/**
 * Check the given option arrays 
 * @param {Array} option_array_1  array of options along current axis
 * @param {Array} option_array_2  array of options along other axis
 * @param {Array} field           game field
 * @param {Boolean} prime_axis    indicates primary or secondary axis
 * @returns                       boolean indicating whether a change took place
 */
function basic_pass(option_array_1, option_array_2, field, prime_axis){
  const N = field.length;
  var change = false;

  for (let ax_1_i = 0; ax_1_i < N; ax_1_i++) {
    if (option_array_1[ax_1_i].complete) continue;
    if (option_array_1[ax_1_i].opts.length === 1) option_array_1[ax_1_i].complete = true;
    // update field sets
    for (let ax_2_i = 0; ax_2_i < N; ax_2_i++) {
      let cell = undefined;
      // grab cell from field, dependent on prime axis
      if(prime_axis)  cell = field[ax_1_i][ax_2_i];
      else            cell = field[ax_2_i][ax_1_i];
      // if cell is set, skip it
      if (cell.set) continue;

      let cell_val_opts = option_array_1[ax_1_i].opts.map(opt => opt[ax_2_i]);
      if (cell_val_opts.length === 1) {
        cell.val = cell_val_opts[0];
        cell.set = true;
        change = true;
      } else {
        let new_cell_val_opts = cell.val_options.filter(val => cell_val_opts.includes(val));
        if(cell.val_options.toString() !== new_cell_val_opts.toString()){
          change = true;
          cell.val_options = new_cell_val_opts;
        }
        // cell.val_options = cell.val_options.filter(val => cell_val_opts.includes(val));
      }
      // now update the q_options?
      option_array_2[ax_2_i].opts = option_array_2[ax_2_i].opts.filter(option => cell_val_opts.includes(option[ax_1_i]));
    }
  }
  return change;
}

function count_visible(option) {
  let vis_ctr = 1;
  const n_items = option.length;
  var curr_max = option[0];
  for (let i = 1; i < n_items; i++) {
    if (option[i] > curr_max) {
      curr_max = option[i];
      vis_ctr++;
    }
  }
  return vis_ctr;
}

function count_visible_neg(option) {
  let vis_ctr = 1;
  const n_items = option.length;
  var curr_max = option[n_items - 1];
  for (let i = n_items - 2; i > -1; i--) {
    if (option[i] > curr_max) {
      curr_max = option[i];
      vis_ctr++;
    }
  }
  return vis_ctr;
}

function filter_by_clues(rc_obj_array, clue_array, count_fn) {
  const N = clue_array.length;
  for (let arr_i = 0; arr_i < N; arr_i++) {
    if (clue_array[arr_i] === 0) continue;
    let n_visible = clue_array[arr_i];
    rc_obj_array[arr_i].opts = rc_obj_array[arr_i].opts.filter(option => count_fn(option) === n_visible);
  }
}

function gen_row_options_rec(array, partial_opt, items) {
  const n_opts = items.length;
  if (n_opts === 1) {
    array.push(partial_opt.concat(items));
    return;
  }
  for (let i = 0; i < n_opts; i++) gen_row_options_rec(array, partial_opt.concat(items[i]), items.slice(0, i).concat(items.slice(i + 1)));
}
