// exports.NAME = "Nonogram";
// designed to work on the page: https://www.puzzle-nonograms.com/
// assume nonogram is 5x5. Will make it flexible later

// TODO: examine possible shortcuts using existing array methods
function play_game(){
    let btn_Done = document.getElementById("btnReady");
    if(btn_Done === null || document.getElementsByClassName("err").length)  return;
    // console.log(btn_Done);
    // diabling the timer is only superficial. 
    // var stop_tmr = document.getElementsByName("stopClock")[0];
    // stop_tmr.value = 1;
    // set robot to true
    // document.getElementById("robot").value = 1;
    
    var [h_cts, v_cts] = game_from_page();
    var field = solve_nonogram_bw(h_cts, v_cts);
    enter_solved_nonogram(field);
    
    btn_Done.dispatchEvent(clickEvent);
    console.log(field);
}

/**
 * Objective is to obtain the horizontal and vertical counts as 2D arrays
 */
function game_from_page(){
    // var h_ct_grps = $("#taskLeft .task-group");
    var h_ct_grps = document.getElementById("taskLeft").children;
    var h_cts = counts_from_groups(h_ct_grps);

    // var v_ct_grps = $("#taskTop .task-group");
    var v_ct_grps = document.getElementById("taskTop").children;
    var v_cts = counts_from_groups(v_ct_grps);

    return [h_cts, v_cts];
}

function counts_from_groups(groups){
    const W = groups.length;

    var counts = new Array(W);
    var ct_depth = groups[0].childNodes.length;
    for( let i = 0; i < W; i++){
        counts[i] = new Array(ct_depth);
        for( let j = 0; j < ct_depth; j++){
            counts[i][j] = parseInt(groups[i].childNodes[j].innerText);
        }
    }

    return counts;
}

function solve_nonogram_bw(h_cts, v_cts){
    const H = h_cts.length;
    const W = v_cts.length;

    var field = new Array(H);
    for (let r_i = 0; r_i < H; r_i++){
        field[r_i] = new Array(W);
        field[r_i].fill(0);
    }

    var iter_ctr = 0;
    // start by looping through the initial h_cts/v_cts
    process_rows_basic(h_cts, field);

    field = transpose(field);
    process_rows_basic(v_cts, field);
    field = transpose(field);

    while(field.flat().includes(0) && iter_ctr < 5){
        process_rows_regex(h_cts, field);

        field = transpose(field);
        process_rows_regex(v_cts, field);
        field = transpose(field);
        iter_ctr++;
    }

    // console.log(field);

    return field;
}

function nj_empty_2d(shape){
    const H = shape[0];
    const W = shape[1];

    var varray = new Array(H);

    for(let r_i = 0; r_i < H; r_i++){
        varray[r_i] = new Array(W);
    }
    return varray;
}

function process_rows_basic(h_cts, field){
    const H = field.length;
    const W = field[0].length;

    const ct_depth = h_cts.length;
    for( let r_i = 0; r_i < H; r_i++){
        let curr_ct = h_cts[r_i];
        let min_block = [];
        for(let ct_i = 0; ct_i < ct_depth; ct_i++){
            if(isNaN(curr_ct[ct_i]))    continue;
            for(let ct = curr_ct[ct_i]; ct > 0; ct--){
                min_block.push(2);
            }
            min_block.push(1);
        }
        min_block.pop();
        let min_len = min_block.length;
        if(min_len <= W/2)  continue;
        let n_opts = W + 1 - min_len;

        if(n_opts == 1) field[r_i] = min_block;
        else {
            options = nj_empty_2d([n_opts, W]);

            for(let opt_i = 0; opt_i < n_opts; opt_i++){
                for(let c_i = 0; c_i < min_len; c_i++){
                    options[opt_i][c_i+opt_i] = min_block[c_i];
                }
            }

            process_options(options, r_i, field);
        }
    }
}

function process_rows_regex(h_cts, field){
    const H = field.length;

    for( let r_i = 0; r_i < H; r_i++){
        // if there are no unset cells (0s), skip the row
        if( !field[r_i].includes(0))    continue;
        let row_cts = h_cts[r_i];
        let options = [];
        let row_str = field[r_i].join('');
        // create the lazy regex
        let expression_lazy = create_exp(row_cts);
        // create options from lazy regex
        add_options(row_str, new RegExp(expression_lazy, 'g'), options);
        // create greedy regex from lazy, and repeat
        let expression_gre = expression_lazy.replace("]+?", "]+");
        add_options(row_str, new RegExp(expression_gre, 'g'), options);
        let n_opts = options.length;

        if(n_opts == 0)     continue;
        process_options(options, r_i, field);
    }
}

function create_exp(parts){
    var expression = "(?=(?<!2.*)";
    var n_parts = parts.length;
    for( let p_i = 0; p_i < n_parts; p_i++){
        if( parts[p_i] == undefined || isNaN(parts[p_i]))   continue;
        expression += "([02]{" + parts[p_i] + "})[01]+?";
    }
    return expression.slice(0, -6) + "(?!.*2))";
}

/**
 * Expand the options array with options based on the row string and the given expression
 * @param {*} row_str 
 * @param {*} expression 
 * @param {*} options 
 * @returns 
 */
function add_options(row_str, expression, options){
    const W = row_str.length;
    // row_str.matchAll() returns an iterator of the matched solutions, and the anon-fn pops the first entry which is always empty.
    var results = Array.from(row_str.matchAll(expression), x => x.slice(1)); 
    // reminder, results is an array of arrays. (n_opts, n_groups)
    const n_opts = results.length;
    // return if duplicate results found
    if(n_opts > 1 && results[0][0] == results[1][0])    return;
    // loop through each option
    for( let opt_i = 0; opt_i < n_opts; opt_i++){
        let option = new Array(W);
        option.fill(1);
        
        let res_len = results[opt_i][0].length;
        // if only 1 group in the given option, use a basic search
        if(results[opt_i].length == 1){
            // var expr = ;
            let res_pos = row_str.search(results[opt_i][0]);
            option.fill(2, res_pos, res_pos + res_len);
        } else {
            // else build a specific one
            // var expr = new RegExp("(?<!2.*)(" + results[opt_i].join(")[01]+(") + ")(?!.*2)", 'g');
            // I wonder if this section could be replaced with a regex...? 
            // str_start is a ptr 
            let str_start = row_str.indexOf(results[opt_i][0]);
            let group_len = results[opt_i][0].length;
            option.fill(2, str_start, str_start + group_len);
            str_start += group_len;

            let n_groups = results[opt_i].length;
            for( let grp_i = 1; grp_i < n_groups; grp_i++){
                str_start += row_str.slice(str_start).indexOf(results[opt_i][grp_i]);
                group_len = results[opt_i][grp_i].length;
                option.fill(2, str_start, str_start + group_len);
                str_start += group_len;
            }

        }
        options.push(option);
    }
}

/**
 * Process the options for a given field row and update that row
 * @param {*} options   possible outcomes for the row
 * @param {*} r_i       row index
 * @param {*} field     game field
 */
function process_options(options, r_i, field){
    const W = field[0].length;
    const n_opts = options.length;

    // now loop through each column, 
    for(let c_i = 0; c_i < W; c_i++){
        // if the column starts with an undefined, skip it
        if(options[0][c_i] == undefined)    continue;
        let first_val = options[0][c_i];
        for(let opt_i = 0; opt_i < n_opts; opt_i++){
            // if the current value is undefined or does not match the first value of the column, set it to undefined and break to next column
            if(options[opt_i][c_i] != first_val || options[opt_i][c_i] == undefined){
                options[0][c_i] = undefined;
                break;
            }
        }
    }
    // loop through the first row, if !undefined, set the field's cell
    for( let c_i = 0; c_i < W; c_i++){
        if( options[0][c_i] != undefined)   field[r_i][c_i] = options[0][c_i];
    }
}

// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
function transpose(matrix) {
    // console.log(matrix);
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

/**
 * Function to test the nonogram solver. horizontal and vertical counts must be entered manually
 */
function test_nonogram(){
    var h_cts = [[NaN, 1], [1, 1], [NaN, 3], [NaN, 4], [1, 2]];
    var v_cts = [[NaN, 2], [NaN, 3], [NaN, 3], [NaN, 2], [2, 1]];

    console.log(solve_nonogram_bw(h_cts, v_cts));
}

/**
 * 
 * @param {*} field_solved  2d array of a solved nonogram puzzle
 * @param {*} cells         list of cells to be set/unset. should be same length as H*W of field
 */
function enter_solved_nonogram(field_solved){
    // console.log(field_solved);
    // get field dimensions:
    const H = field_solved.length;
    const W = field_solved[0].length;

    // first get game element:
    const game_brd = document.getElementsByClassName("nonograms-cell-back")[0];
    var game_box = game_brd.getBoundingClientRect();
    const delta_x = (game_box.width - 4) / W;
    const delta_y = (game_box.height - 4) / H;
    
    // var cells = document.getElementsByClassName("cell selectable");
    // var game_field = Game.currentState.cellStatus;

    for( let r_i = 0; r_i < H; r_i++){
        for( let c_i = 0; c_i < W; c_i++){
            if( field_solved[r_i][c_i] == 2){
                let evt_opts = {
                    bubbles: true,
                    // cancelable: false,
                    clientX: game_box.x + delta_x/2 + c_i*delta_x,
                    clientY: game_box.y + (r_i + 0.5) * delta_y,
                    // pointerType: "mouse",
                    // view: window,
                }
    
                game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
                game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
            }
        }
    }
}

function new_puzzle(){
    document.getElementById("btnNew").dispatchEvent(clickEvent);
}

// see uievent docs
var clickEvent = new MouseEvent("click", {
    "bubbles": true,
    "cancelable": false,
    clientX: 800,   // 1000
    clientY: 364,   // 650,
    "view": window
});

function point_on_pos(x, y){
    return new PointerEvent("click", {
        bubbles:    true,
        cancelable: true,
        clientX: x,
        clientY: y,
        composed: true,
        pointerType: "mouse",
        view: window
    })
}

var pointEvent = new PointerEvent("click", {
    bubbles:    true,
    cancelable: true,
    clientX: 800,
    clientY: 364,
    composed: true,
    // detail: 1,              // (read-only)?
    // layerX, layerY       (read-only)
    // pointerId: 1,
    pointerType: "mouse",
    // screenX, screenY     (read-only)
    // sourceCapabilities?  (read-only)

    // isTrusted: true,     (read-only)
    view: window
});

function click_zz(){
    const game_brd = document.getElementsByClassName("nonograms-cell-back")[0];
    var game_box = game_brd.getBoundingClientRect();
    const delta_x = (game_box.width - 4) / 5;
    const delta_y = (game_box.height - 4) / 5;
    
    // console.log();
    for(let i = 0; i < 5; i++){
        for(let j = 0; j < 5; j++){
            let evt_opts = {
                bubbles: true,
                // cancelable: false,
                clientX: game_box.x + delta_x/2 + i*delta_x,
                clientY: game_box.y + (j + 0.5) * delta_y,
                // pointerType: "mouse",
                // view: window,
            }

            game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
            game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
        }
    }
}

// function printMousePos(event) {
//     console.log("printMousePos");
//     // document.body.textContent = "clientX: " + event.clientX + " - clientY: " + event.clientY;
//     console.log("clientX: " + event.clientX + " - clientY: " + event.clientY);
//     console.log(event);
// }

// document.addEventListener("click", printMousePos);

test_nonogram();
// play_game();
