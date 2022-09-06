// binario.js

// TODO:
//  consider a recursive function that follows newly placed 1/2s for the easy-solver

// in order to start solver sooner, set 'run_at' in manifest to 'document_start' and 
// use this listener to begin waiting for the board to be ready. 
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
  // set robot to true
  document.getElementById("robot").value = 1;

  // need to use #menuSizes to determine the game level...
  var link_list = document.getElementById("menuSizes").children;
  var level;
  for(let li of link_list){
    let a_el = li.children[0];
    if(a_el.classList.contains("on")) level = a_el.href.split('?')[1];
  }
  level = (level == undefined) ? 0 : parseInt(level.split('=')[1]);
  // odd levels are 'hard', and level 4 is 10x10.

  var [field, h_cts, v_cts] = field_from_page();
  // if(level > 3) debug_output(field, h_cts, v_cts, "fresh from page: ");

  // return;
  if(level % 2 === 0){
    field = solve_binario_easy(field, h_cts, v_cts);
  } else {
    field = solve_binario_hard(field, h_cts, v_cts);
    return;
  }
  
  enter_solved_binairo(field);
  
  // btn_Done.dispatchEvent(clickEvent);
  btn_Done.click();
  // console.log(field);
}

/**
 * Objective is to obtain the initial field state from the page
 * 0: unset, 1: cell-0/white, 2: cell-1/black
 */
 function field_from_page(){
  var cells = document.getElementsByClassName("board-back")[0].children;
  // currently, the field is always square, but could* be non-square...

  // dimensions:
  const L = Math.sqrt(cells.length);
  var size = document.URL.split('?')[1];
  if(!isFinite(size)) size = 0;

  // create base field
  var field = new Array(L).fill('').map(() => new Array(L).fill(0));
  // create base counts. Assuming a square field...
  var h_cts = new Array(2).fill('').map(() => new Array(L).fill(0));
  var v_cts = new Array(2).fill('').map(() => new Array(L).fill(0));

  // loop through cells and set field according to cell
  for(let r_i = 0; r_i < L; r_i++){
    for(let c_i = 0; c_i < L; c_i++){
      if(cells[r_i*L + c_i].classList.contains("cell-0")){
        field[r_i][c_i] = 1;
        h_cts[0][r_i]++;
        v_cts[0][c_i]++;
      } else if(cells[r_i*L + c_i].classList.contains("cell-1")){
        field[r_i][c_i] = 2;
        h_cts[1][r_i]++;
        v_cts[1][c_i]++;
      } 
    }
  }

  return [field, h_cts, v_cts];
}

/**
 * Solve an easy level Binairo
 * @param {*} field   initial field state
 * @param {*} h_cts   initial horizontal 1/2 counts
 * @param {*} v_cts   initial vertical 1/2 counts
 * @returns 
 */
function solve_binario_easy(field, h_cts, v_cts) {
  const H = field.length;
  const W = field[0].length;
  const half_H = H / 2;
  const half_W = W / 2
  const iter_limit = 2*H;

  let it_ct = 0;
  while (field.flat().includes(0)) {
    // first check for rows/cols where one color/(1/2) is completed. 
    // Ie: the number of 1/2s in a row/col == half the length of the row/col
    // Ex: for row 101012, 1's are complete, so the remaining 0's can be filled with 2's
    // whenever a 1/2 is placed, the corresponding h/v_cts are updated 
    //                        1's                 2's
    // const test_h_cts = [[2, 0, 2, 1, 0, 0], [0, 1, 0, 0, 2, 1]];
    // const test_v_cts = [[0, 1, 3, 0, 0, 1], [2, 0, 0, 0, 2, 0]];
    // check h_cts
    for (let r_i = 0; r_i < H; r_i++) {
      if (h_cts[0][r_i] === half_W && h_cts[1][r_i] !== half_W) {
        // replace remaining 0s in row with 2s
        for (let c_i = 0; c_i < W; c_i++)  if (field[r_i][c_i] === 0) { v_cts[1][c_i]++; field[r_i][c_i] = 2; }
        h_cts[1][r_i] = half_W;
      } else if (h_cts[0][r_i] !== half_W && h_cts[1][r_i] === half_W) {
        // replace remaining 0s in row with 1s
        for (let c_i = 0; c_i < W; c_i++)  if (field[r_i][c_i] === 0) { v_cts[0][c_i]++; field[r_i][c_i] = 1; }
        h_cts[0][r_i] = half_W;
      }
    }
    // debug_output(field, h_cts, v_cts, "post v_cts:");

    // check v_cts
    for (let c_i = 0; c_i < W; c_i++) {
      if (v_cts[0][c_i] === half_H && v_cts[1][c_i] !== half_H) {
        // replace remaining 0s in col with 2s
        for (let r_i = 0; r_i < H; r_i++)  if (field[r_i][c_i] === 0) { h_cts[1][r_i]++; field[r_i][c_i] = 2; }
        v_cts[1][c_i] = half_H;
      } else if (v_cts[0][c_i] !== half_H && v_cts[1][c_i] === half_H) {
        // replace remaining 0s in col with 1s
        for (let r_i = 0; r_i < H; r_i++)  if (field[r_i][c_i] === 0) { h_cts[0][r_i]++; field[r_i][c_i] = 1; }
        v_cts[0][c_i] = half_H;
      }
    }
    // debug_output(field, h_cts, v_cts, "post v_cts:");

    // now check each row/col using regex for the 'cases'
    // create an array of strings from the field:
    let row_strs = field.map(row => row.join(''));
    let indices = process_strings_regex(row_strs);

    for (let index of indices) {
      if (field[index[0]][index[1]] !== 0) continue;
      field[index[0]][index[1]] = index[2];
      // update h/v counts
      h_cts[index[2] - 1][index[0]]++;
      v_cts[index[2] - 1][index[1]]++;
    }
    // debug_output(field, h_cts, v_cts, "post row regex:");

    // now repeat with column-strings
    var col_strs = new Array(W).fill('');
    for (let r_i = 0; r_i < H; r_i++) {
      for (let c_i = 0; c_i < W; c_i++) {
        col_strs[c_i] += field[r_i][c_i];
      }
    }
    indices = process_strings_regex(col_strs);

    for (let index of indices) {
      if (field[index[1]][index[0]] !== 0) continue;
      field[index[1]][index[0]] = index[2];
      // update h/v counts
      h_cts[index[2] - 1][index[1]]++;
      v_cts[index[2] - 1][index[0]]++;
    }

    // debug_output(field, h_cts, v_cts, "post column regex:");

    it_ct++;
    if (it_ct > iter_limit) {
      console.log("too many iterations... stopping");
      break;
    }
  }
  // console.log(`Completed in ${it_ct} iterations`);
  return field;
}

/**
 * Currently a stub...
 * @param {*} field 
 * @param {*} h_cts 
 * @param {*} v_cts 
 * @returns 
 */
function solve_binario_hard(field, h_cts, v_cts){
  console.log("hard solve fn stub called");

  return field;
}

/**
 * 
 * @param {*} strings array of strings to check with the given regexes
 * @returns           an Nx3 array, where each entry contains the string index (s_i), char index (c_i) and replacement value
 */
function process_strings_regex(strings) {
  // credit to Fabricio Matté and Bergi for the regex help: 
  // https://stackoverflow.com/questions/14863026/javascript-regex-find-all-possible-matches-even-in-already-captured-matches/14863268#14863268

  const n_str = strings.length;

  // var regex_1l = /0([12])\1/g;    // 0xx
  // var regex_1r = /([12])\1[0]/g;  // xx0
  // var regex_2  = /([12])0\1/g;    // x0x
  var regexes = [/0([12])\1/g, /([12])0\1/g, /([12])\1[0]/g];
  // [s_i, c_i, val]
  var indices = [];

  for (let s_i = 0; s_i < n_str; s_i++) {
    for (let re_i = 0; re_i < 3; re_i++) {
      // iteratively check the string to find all matches
      let found;
      while (found = regexes[re_i].exec(strings[s_i])) {
        indices.push([s_i, found.index + re_i, 3 - Math.max(...found[0].split(''))]);
        regexes[re_i].lastIndex = found.index + 1;
      }
      // console.log(`s_i:${s_i}, re_i:${re_i} -> ${indices}`);
    }
  }
  return indices;
}

/**
 * Enter the game field to the webpage
 * @param {*} field solved game field
 * 
 * an alternative to the mousedown/up would be arrowkeys/wasd and spacebar presses...
 */
function enter_solved_binairo(field) {
  const H = field.length;
  const W = field[0].length;
  // first get game element:
  const game_brd = document.getElementById("game");
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 1) / W;
  const delta_y = (game_box.height - 1) / H;

  for (let r_i = 0; r_i < H; r_i++) {
    for (let c_i = 0; c_i < W; c_i++) {
      let evt_opts = {
        bubbles: true,
        // cancelable: false,
        clientX: game_box.x + (c_i + 0.5) * delta_x,
        clientY: game_box.y + (r_i + 0.5) * delta_y,
        // pointerType: "mouse",
        // view: window,
      }
      if (field[r_i][c_i] === 1) {
        game_brd.dispatchEvent(new MouseEvent("mousedown", { ...evt_opts, button: 2 }));
        game_brd.dispatchEvent(new MouseEvent("mouseup", { ...evt_opts, button: 2 }));
      } else if (field[r_i][c_i] === 2) {
        game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
        game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
      }
    }
  }
}

//    Helper functions
const print_2d = (array2d) => console.log(array2d.map(el => el.join('')));
function debug_output(field, h_cts, v_cts, message){
  console.log(message);
  print_2d(field);
  print_2d(h_cts);
  print_2d(v_cts);
}
// const str_splice = (str, index, val) => str.slice(0,index) + val + str.slice(index+1);

function test_binairo(){
  const test_field = [
    "020000",
    "100101",
    "200000",
    "020200",
    "001010",
    "100000"];

  const test_field_2d = [
    [0, 0, 1, 0, 0, 1],
    [0, 0, 0, 0, 2, 0],
    [0, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [2, 0, 0, 0, 2, 0],
    [2, 0, 0, 0, 0, 0],
  ];
  //                    1's                 2's
  const test_h_cts = [[2, 0, 2, 1, 0, 0], [0, 1, 0, 0, 2, 1]];
  const test_v_cts = [[0, 1, 3, 0, 0, 1], [2, 0, 0, 0, 2, 0]];

  field_solution = solve_binario_easy(test_field_2d, test_h_cts, test_v_cts);
  console.log(field_solution);
}
