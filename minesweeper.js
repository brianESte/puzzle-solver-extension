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

  // game dimensions from url:
  let game_type = document.URL.substring(47)
  const [H, W] = game_type.split('-')[0].split('x').map(c => parseInt(c));

  var field = new Array(H);
  for (let r_i = 0; r_i < H; r_i++){
    field[r_i] = new Array(W);
    field[r_i].fill(0);
  }

  // var cell_nums = $('div.number');
  var cell_nums = document.getElementsByClassName("number");

  for(let r_i = 0; r_i < H; r_i++){
    for(let c_i = 0; c_i < W; c_i++){
      field[r_i][c_i] = cell_nums[r_i*W + c_i + 1].innerHTML;   // +1 to skip the first element
    }
  }

  // check if easy/hard. if not hard, solve it...
  if(game_type.endsWith('hard/')){
    console.log("nope, not yet, too hard");
    console.log(field);
    return;
  }

  field = solve_minesweeper_easy(field);

  // first get game element:
  const game_brd = document.getElementById("game");
  var game_box = game_brd.getBoundingClientRect();
  const delta_x = (game_box.width - 10) / W;
  const delta_y = (game_box.height - 10) / H;

  for( let r_i = 0; r_i < H; r_i++){
    for( let c_i = 0; c_i < W; c_i++){
      if( field[r_i][c_i] == 'x'){
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
 * cell values are: 
 *  '': unknown, 'x': flag, ' ': clear
 * 
 * @param {*} field   initial state of the puzzle grid
 * @returns           solved state of the puzzle grid
 */
function solve_minesweeper_easy(field){
  const H = field.length;
  const W = field[0].length;

  const nay_range = [-1, 0, 1];
  var loop_ct = 0;
  // loop through each cell and fill in what can be, until complete
  while(field.flat().reduce((prev, curr) => prev + (curr == '' ? 1 : 0),0) > 0){
    for(let r_i = 0; r_i < H; r_i++){
      for(let c_i = 0; c_i < W; c_i++){
        let cell_val = parseInt(field[r_i][c_i])
        if(isNaN(cell_val)) continue;
        
        // build list of neighbor coordinates
        let neighbor_coords = [];
        for(let dy of nay_range){
          let y = r_i+dy;
          if(y >= H || y < 0)  continue;
          for(let dx of nay_range){
            if(dx == 0 && dy == 0)  continue;
            let x = c_i+dx;
            if(x >= W || x < 0)  continue;
            neighbor_coords.push([y, x])
          }
        }
        
        // obtain counts of flags and unknowns from neighbor cells
        let n_flag = 0;
        let n_unknown = 0;
        // loop through each neighbor and update flag/unknown counts
        neighbor_coords.forEach(pair => {
          let val = field[pair[0]][pair[1]];
          if(val == ''){ n_unknown++; return;}
          if(val == 'x') n_flag++;
        })
        
        // if count of 'x' among neighbors == cell value, clear remaining '' cells
        if(cell_val == n_flag){
          neighbor_coords.forEach(pair => { if(field[pair[0]][pair[1]] == '') field[pair[0]][pair[1]] = ' '})
        } 
        // if the count of '' + 'x' among neighbors == cell value, set remaining '' to 'x'
        else if(cell_val == n_flag + n_unknown){
          neighbor_coords.forEach(pair => { if(field[pair[0]][pair[1]] == '') field[pair[0]][pair[1]] = 'x'})
        }
      }
    }
    loop_ct++;
    if(loop_ct > H+3){
      console.log("too many iterations. breaking");
      console.log(field);
      return;
    }
  }

  return field;
}
