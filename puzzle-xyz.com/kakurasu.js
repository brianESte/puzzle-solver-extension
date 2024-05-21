// kakurasu.js
// designed to work on the page: https://www.puzzle-kakurasu.com/*

// TODO: finish alternative options generator fn?

document.addEventListener("DOMContentLoaded", () => {
  // wait for the board to be ready
  waitForElm(".board-back").then((elm) => {
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
  // diabling the timer is only superficial. 
  // var stop_tmr = document.getElementsByName("stopClock")[0];
  // stop_tmr.value = 1;

  const H = document.getElementsByClassName("side-counter").length;
  var v_sums = Array.from(document.getElementsByClassName("sc2")).map(el => parseInt(el.innerText));
  var h_sums = v_sums.splice(0, H);
  const W = v_sums.length;

  var field = solve_kakurasu(h_sums, v_sums);

  // now enter the flags programmatically:
  // set robot to true
  document.getElementById("robot").value = 1;
  // first get game element:
  const game_brd = document.getElementsByClassName("board-back")[0];
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 10) / W;
  const delta_y = (game_box.height - 10) / H;

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      // if(field[r_i][c_i].filled && field[r_i][c_i].clear) console.log(`(${[r_i, c_i]}): filled and cleared...`)
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
 * Solve a Kakurasu puzzle
 * @param {Array} h_options   array of sums along horizontal axis
 * @param {Array} v_options   array of sums along vertical axis
 * @returns                   solved puzzle field
 */
function solve_kakurasu(h_options, v_options) {
  const H = h_options.length;
  const W = v_options.length;

  // assuming the field is square, a single possibilities object can be used
  var possibilities = option_generator(H);
  // console.log(possibilities);

  // loop through each array and update with the possible rows for the given sums
  for (let sum_i = 0; sum_i < H; sum_i++)  h_options[sum_i] = { done: false, opts: possibilities[h_options[sum_i]] };
  for (let sum_i = 0; sum_i < W; sum_i++)  v_options[sum_i] = { done: false, opts: possibilities[v_options[sum_i]] };

  var field = new Array(H).fill().map(() => new Array(W).fill().map(() => { return { clear: false, filled: false } }));

  // var it_ctr = 0;
  // while (!field.flat().every(cell => cell.clear || cell.filled)) {
  while (!h_options.every(obj => obj.done) || !v_options.every(obj => obj.done)) {
    // loop through the horizontal options:
    process_step(h_options, v_options, field, true);

    // loop through the vertical options:
    process_step(v_options, h_options, field, false);

    // if (it_ctr++ > 2 * H) {
    //   console.log("too many iterations, stopping");
    //   break;
    // }
  }

  return field;
}

/**
 * Process the options given in array1, and update the options in array2.
 * 
 * @param {Array} options_array_1   options array for main axis
 * @param {Array} options_array_2   options array for cross axis
 * @param {Array} field             puzzle field
 * @param {Boolean} prime_axis      indicated which axis is the primary axis
 */
function process_step(options_array_1, options_array_2, field, prime_axis) {
  const len_1 = options_array_1.length;
  const len_2 = options_array_2.length;

  for (let ax_itr_1 = 0; ax_itr_1 < len_1; ax_itr_1++) {
    if (options_array_1[ax_itr_1].done) continue;
    // if there is only 1 option: fill it in
    // this first section could be commented out, but I think* it runs faster with it included...
    let options = options_array_1[ax_itr_1].opts;
    if (options.length === 1) {
      for (let ax_itr_2 = 0; ax_itr_2 < len_2; ax_itr_2++) {
        if (options[0].includes(ax_itr_2 + 1)) {
          if (prime_axis) field[ax_itr_1][ax_itr_2].filled = true;
          else field[ax_itr_2][ax_itr_1].filled = true;
          // now filter the cross_options 
          options_array_2[ax_itr_2].opts = options_array_2[ax_itr_2].opts.filter(option => option.includes(ax_itr_1 + 1));
        } else {
          if (prime_axis) field[ax_itr_1][ax_itr_2].clear = true;
          else field[ax_itr_2][ax_itr_1].clear = true;
          options_array_2[ax_itr_2].opts = options_array_2[ax_itr_2].opts.filter(option => !option.includes(ax_itr_1 + 1));
        }
      }
      options_array_1[ax_itr_1].done = true;
    } else {
      let all_opts = options.flat();
      for (let ax_itr_2 = 0; ax_itr_2 < len_2; ax_itr_2++) {
        if (!all_opts.includes(ax_itr_2 + 1)) {
          if (prime_axis) field[ax_itr_1][ax_itr_2].clear = true;
          else field[ax_itr_2][ax_itr_1].clear = true;
          // now filter the cross_options
          options_array_2[ax_itr_2].opts = options_array_2[ax_itr_2].opts.filter(option => !option.includes(ax_itr_1 + 1));
          continue;
        }
        // if a value is contained in every remaining option, fill it, and filter options
        if (options.every(option => option.includes(ax_itr_2 + 1))) {
          if (prime_axis) field[ax_itr_1][ax_itr_2].filled = true;
          else field[ax_itr_2][ax_itr_1].filled = true;
          options_array_2[ax_itr_2].opts = options_array_2[ax_itr_2].opts.filter(option => option.includes(ax_itr_1 + 1));
        }
      }
      // if(options.length === 1)  options_array_1[ax_itr_1].done = true;
    }
  }
}

/**
 * Generate an object with row options for a given sum
 * @param {Number} val_max  the maximum cell value (length of row)
 * @returns                 the object of sum options
 */
function option_generator(val_max) {
  const max_sum = val_max * (val_max + 1) / 2;
  var sum_options = {
    1: [[1]],
    2: [[2]],
    3: [[3], [2, 1]],
    // 4: [[4], [3, 1]],
  };

  // expand the possibilities object with empty arrays
  for (let i = 4; i < max_sum + 1; i++)  sum_options[i] = [];

  var summand;
  var loop_limit = 2 ** val_max;
  for (let i = 5; i < loop_limit; i++) {
    let option = [];
    summand = 1;

    let b_i = i;
    while (b_i > 0) {
      if (b_i % 2 === 1) option.push(summand);
      summand++;
      b_i = b_i >> 1;
      // console.log(`b_i at end of while loop: ${b_i}`);
    }
    sum_options[option.reduce((prev, curr) => prev + curr)].push(option);
  }

  return sum_options;
}

// alternative option gen fn?
function option_generator_2(val_max) {
  const max_sum = val_max * (val_max + 1) / 2;

  // var possibilities = {
  //   1: ['1'],
  //   2: ['2'],
  //   3: ['3', '2,1'],
  //   4: ['4', '3,1'],
  //   5: ['4,1', '3,2'],
  //   6: ['4,2', '3,2,1'],
  //   7: ['4,3'],
  //   8: ['4,3,1'],
  //   9: ['4,3,2'],
  //   10: ['4,3,2,1']
  // }

  // var possibilities = {
  //   1: [[1]],
  //   2: [[2]],
  //   3: [[3], [2, 1]],
  //   4: [[4], [3, 1]],
  //   5: [[4,1], [3,2]],
  //   6: [[4,2], [3,2,1]],
  //   7: [[4,3], [4,2,1]],
  //   8: [[4,3,1]],
  //   9: [[4,3,2]],
  //   10: [[4,3,2,1]]
  // }
  // console.log(possibilities);

  var val_possibilities = {
    1: [[1]],
    2: [[2]],
    3: [[3], [2, 1]],
    4: [[4], [3, 1]],
  };

  for (let i = 5; i < max_sum; i++) {
    console.log(`i = ${i}`);
    let options = [];
    // how to deal with the val_max limit?
  }

  return val_possibilities;
}

function print_field(field, info = null) {
  if (info != null) console.log(info);

  console.log(field.map(row => row.map(cell => {
    if (cell.clear) return 'o';
    if (cell.filled) return '#';
    return ' ';
  }).join('') + '\n').join(''))
}
