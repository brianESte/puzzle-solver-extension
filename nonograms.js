// nonograms.js
// designed to work on the page: https://www.puzzle-nonograms.com/

// "https://nonogramsonline.com/*" 

document.addEventListener("DOMContentLoaded", () => {
	// wait for the board to be ready
	waitForElm(".nonograms-cell-back").then((elm) => {
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

// task queue
var kyu = [];

/**
 * Play a game of nonograms
 */
function play_game() {
	let btn_Done = document.getElementById("btnReady");
	if (btn_Done === null || document.getElementsByClassName("err").length) return;
	// diabling the timer is only superficial. 
	// var stop_tmr = document.getElementsByName("stopClock")[0];
	// stop_tmr.value = 1;

	let tasks_left = document.getElementById("taskLeft").children;
	let tasks_top = document.getElementById("taskTop").children;
	// let h_cts = counts_from_groups(document.getElementById("taskLeft").children);
	// let v_cts = counts_from_groups(document.getElementById("taskTop").children);
	let h_opts = gen_line_obs(tasks_top.length, tasks_left);
	let v_opts = gen_line_obs(tasks_left.length, tasks_top);

	const H = h_opts.length;
	const W = v_opts.length;

	var field = new Array(H);
	for (let r_i = 0; r_i < H; r_i++) {
		field[r_i] = new Array(W);
		field[r_i].fill(0);
	}
	// console.log(h_opts);
	// console.log(v_opts);
	solve_nonogram(field, h_opts, v_opts);
	enter_solved_nonogram(field);

	// set robot to true
	document.getElementById("robot").value = 1;
	btn_Done.click();
}

/**
 * Obtain the row/column counts from the DOM
 * @param {Array-like} groups DOM objects that indicate the row/col groups
 * @returns h_cts/v_cts
 */
function counts_from_groups(groups) {
	const W = groups.length;

	var counts = new Array(W);
	// var ct_depth = groups[0].childNodes.length;
	// for (let i = 0; i < W; i++) {
	// 	counts[i] = new Array(ct_depth);
	// 	for (let j = 0; j < ct_depth; j++) {
	// 		counts[i][j] = parseInt(groups[i].childNodes[j].innerText);
	// 	}
	// }
	for (let i = 0; i < W; i++) {
		counts[i] = Array.from(groups[i].childNodes)
			.map(node => parseInt(node.innerText))
			.filter(val => !isNaN(val));
	}

	return counts;
}

/**
 * Generate an array of option-arrays for the given set of rows/columns
 * @param {Number} cross_len dimension normal to the processed dimension
 * @param {Array} groups array of mark-groups along the given line
 * @returns an array of option-arrays for each row/column
 */
function gen_line_obs(cross_len, groups) {
	const n = groups.length;

	var line_obs = new Array(n);
	for (let i = 0; i < n; i++) {
		line_obs[i] = [];
		gen_opts(cross_len, line_obs[i],
			Array.from(groups[i].childNodes)
				.map(node => parseInt(node.innerText))
				.filter(val => !isNaN(val)));
	}
	return line_obs;
}

/**
 * Solve a nonogram puzzle
 * @param {Array} field 2D array representing the game field
 * @param {Array} h_opts array of option-arrays, one for each row
 * @param {Array} v_opts array of option-arrays, one for each column
 */
function solve_nonogram(field, h_opts, v_opts) {
	const H = h_opts.length;
	const W = v_opts.length;

	// start with a pass on each set of row/column options
	for (let r_i = 0; r_i < H; r_i++) {
		process_row_opts(field, h_opts, v_opts, r_i);
	}
	for (let c_i = 0; c_i < W; c_i++) {
		process_col_opts(field, h_opts, v_opts, c_i);
	}
	// process kyu until empty
	while (kyu.length > 0) {
		kyu.shift()();
	}
	// console.log("kyu empty");
	// console.log(field);
	return;

	field = transpose(field);
	process_rows_basic(v_cts, field);
	field = transpose(field);

	while (field.flat().includes(0) && iter_ctr < 5) {
		process_rows_regex(h_cts, field);

		field = transpose(field);
		process_rows_regex(v_cts, field);
		field = transpose(field);
		iter_ctr++;
	}
}

function process_row_opts(field, h_opts, v_opts, r_i) {
	const W = v_opts.length;
	let row_complete = true;
	for (let i = 0; i < W; i++) {
		if (field[r_i][i] === 0) row_complete = false;
	}
	if (row_complete) return;

	let line_opts = h_opts[r_i];
	const n_opts = line_opts.length;
	for (let col_i = 0; col_i < W; col_i++) {
		let cell_val = line_opts[0][col_i];
		for (let opt_i = 1; opt_i < n_opts; opt_i++) {
			if (cell_val != line_opts[opt_i][col_i]) {
				cell_val = 0;
				break;
			}
		}
		if (cell_val === 0) continue;

		field[r_i][col_i] = parseInt(cell_val);
		// now filter v_opts for col_i
		v_opts[col_i] = v_opts[col_i].filter(opt => opt[r_i] == cell_val);
		kyu.push(() => process_col_opts(field, h_opts, v_opts, col_i));
	}
}

function process_col_opts(field, h_opts, v_opts, c_i) {
	const H = h_opts.length;
	let col_complete = true;
	for (let i = 0; i < H; i++) {
		if (field[i][c_i] === 0) col_complete = false;
	}
	if (col_complete) return;

	let line_opts = v_opts[c_i];
	const n_opts = line_opts.length;
	for (let row_i = 0; row_i < H; row_i++) {
		let cell_val = line_opts[0][row_i];
		for (let opt_i = 1; opt_i < n_opts; opt_i++) {
			if (cell_val != line_opts[opt_i][row_i]) {
				cell_val = 0;
				break;
			}
		}
		if (cell_val === 0) continue;

		field[row_i][c_i] = parseInt(cell_val);
		// now filter h_opts for row_i
		h_opts[row_i] = h_opts[row_i].filter(opt => opt[c_i] == cell_val);
		kyu.push(() => process_row_opts(field, h_opts, v_opts, row_i));
	}
}

/*
function process_row(field, h_cts, v_cts, line_i) {
	let regex_str = "(?<!2)([01]*?)";
	// for (let i = 1; i < h_cts[r_i].n_tents_total; i++) regex_str += "[014]+?([02])";
	for (let count of h_cts[line_i]) regex_str += `([02]{${count}})([01]+?)`;
	regex_str = regex_str.slice(0, -3) + "*?)(?!2)";
	// let line_string = field[r_i].map(el => get_cell_value(el)).join('');
	let line_string = field[line_i].reduce((acc, el) => acc + el, "");
	if (line_string.indexOf(0) === -1) return;
	console.log(`Processing row ${line_i}: ${line_string} with regex ${regex_str}`);

	let mark_spot_opts = [];
	let clear_spot_opts = [];
	for (let i = h_cts[line_i].length + 1; i >= 0; i--) {
		regex_line(regex_str, line_string, mark_spot_opts, clear_spot_opts);
		regex_str = remove_qmark(regex_str);
	}
	console.log(mark_spot_opts, clear_spot_opts);

	// const W = v_cts.length;
	let mark_spots = mark_spot_opts.reduce((acc, opt) => acc & opt);
	let clear_spots = clear_spot_opts.reduce((acc, opt) => acc & opt);
	console.log(`&(|) of mark spots: ${mark_spots}, and clear spots ${clear_spots}`);
	// const H = h_cts.length;
	// return;

	let cell_i = -1;
	let mask_limit = Math.max(mark_spots, clear_spots);
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		cell_i++;

		if (mark_spots & mask && field[line_i][cell_i] !== 2) {
			// if (field[line_i][cell_i] === 2) continue;
			field[line_i][cell_i] = 2;
			kyu.push(() => process_col(field, h_cts, v_cts, line_i, cell_i));
			console.log(`process_row() -> just marked cell (${line_i}, ${cell_i}), will process col ${cell_i}`);
			// continue;
		}
	}
	cell_i = -1;
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		cell_i++;

		if ((clear_spots & mask) && field[line_i][cell_i] !== 1) {
			//  && ((cell_i-1 >= 0 && field[line_i][cell_i-1] !== 0) || (cell_i+1 < v_cts.length && field[line_i][cell_i+1] !== 0))) {
			// if (field[line_i][cell_i] === 1) return;
			field[line_i][cell_i] = 1;
			kyu.push(() => process_col(field, h_cts, v_cts, cell_i));
			console.log(`process_row() -> just cleared cell (${line_i}, ${cell_i}), will process col ${cell_i}`);
		}
	}
}
//*/

/*
function process_col(field, h_cts, v_cts, line_i) {
	let regex_str = "(?<!2)([01]*?)";
	// for (let i = 1; i < h_cts[r_i].n_tents_total; i++) regex_str += "[014]+?([02])";
	for (let count of v_cts[line_i]) regex_str += `([02]{${count}})([01]+?)`;
	regex_str = regex_str.slice(0, -3) + "*?)(?!2)";
	// let line_string = field[r_i].map(el => get_cell_value(el)).join('');
	let line_string = field.reduce((acc, el) => acc + el[line_i], "");
	if (line_string.indexOf(0) === -1) return;
	console.log(`Processing col ${line_i}: ${line_string} with regex ${regex_str}`);

	let mark_spot_opts = [];
	let clear_spot_opts = [];
	for (let i = v_cts[line_i].length + 1; i >= 0; i--) {
		regex_line(regex_str, line_string, mark_spot_opts, clear_spot_opts);
		regex_str = remove_qmark(regex_str);
	}
	// console.log(mark_spot_opts, clear_spot_opts);

	// const W = v_cts.length;
	let mark_spots = mark_spot_opts.reduce((acc, opt) => acc & opt);
	let clear_spots = clear_spot_opts.reduce((acc, opt) => acc & opt);
	console.log(`&(|) of mark spots: ${mark_spots}, and clear spots ${clear_spots}`);

	let cell_i = -1;
	let mask_limit = Math.max(mark_spots, clear_spots);
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		cell_i++;

		if (mark_spots & mask && field[cell_i][line_i] !== 2) {
			// kyu.push(() => fill_cell(field, h_cts, v_cts, r_i, cell_i));
			// if (field[cell_i][line_i] === 2) continue;
			field[cell_i][line_i] = 2;
			kyu.push(() => process_row(field, h_cts, v_cts, cell_i));
			console.log(`process_col() -> just marked cell (${cell_i}, ${line_i}), will process row ${cell_i}`);
			// continue;
		}
	}
	cell_i = -1;
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		cell_i++;

		if ((clear_spots & mask) && field[cell_i][line_i] !== 1 &&
			((cell_i - 1 >= 0 && field[cell_i - 1][line_i] !== 0) || (cell_i + 1 < h_cts.length && field[cell_i + 1][line_i] !== 0))) {
			// if (field[cell_i][line_i] === 1) return;
			field[cell_i][line_i] = 1;
			console.log(`process_col() -> just cleared cell (${cell_i}, ${line_i}), will process row ${cell_i}`);
			kyu.push(() => process_row(field, h_cts, v_cts, cell_i));
		}
	}
}
//*/

/*
function regex_line(regex_str, line_string, mark_spot_opts, clear_spot_opts) {
	let matches = line_string.match(new RegExp(regex_str, 'd'));
	let matched_mark_spots = 0;
	let matched_clear_spots = 0;
	let match_indices = matches.indices;
	match_indices.shift();
	// console.log(`match indices for line string ${line_string}: ${match_indices}`);
	for (let ii = match_indices.length - 1; ii >= 0; ii--) {
		let [ind_start, ind_end] = match_indices[ii];
		if (ii % 2 !== 0) {
			matched_mark_spots |= (((1 << (ind_end - ind_start)) - 1) << ind_start);
		} else {
			if (ind_start !== ind_end) {
				// matched_clear_spots |= (1 << ind_start);
				matched_clear_spots |= (((1 << (ind_end - ind_start)) - 1) << ind_start);
			}
		}
	}

	mark_spot_opts.push(matched_mark_spots);
	clear_spot_opts.push(matched_clear_spots);
}
//*/

/*
function remove_qmark(str) {
	for (let i = str.length - 6; i > 0; i--) {
		if (str[i] == '?') {
			return str.slice(0, i) + str.slice(i + 1);
		}
	}
	return str;
}
//*/

/*
function nj_empty_2d(shape) {
	const H = shape[0];
	const W = shape[1];

	var varray = new Array(H);

	for (let r_i = 0; r_i < H; r_i++) {
		varray[r_i] = new Array(W);
	}
	return varray;
}
//*/

/*
function calc_n_opts(width, groups){
	if(groups.length === 1){
		return width + 1 - groups[0];
	}
	
	var p_ct = 0;
	let max_start = width + 1 - groups.reduce((acc, curr) => acc + curr + 1, -1);
	// console.log(`calc_n_opts(${width}, ${groups}), max start = ${max_start}`);

	for(let i = 0; i < max_start; i++){
		p_ct += calc_n_opts(width - (groups[0] + 1 + i), groups.slice(1));
	}

	return p_ct;
}
//*/

function gen_opts(width, opts, groups) {
	if (width === (groups.reduce((acc, el) => acc + el + 1, 0) - 1)) {
		opts.push(groups.reduce((acc, el) => acc + '2'.repeat(el) + 1, "").slice(0, -1));
		return;
	}
	// add a 1 (clear)
	gen_opts_rec(width, opts, groups, '1');
	// add the next group (mark)
	gen_opts_rec(width, opts, groups.slice(1), '2'.repeat(groups[0]) + '1');
}

function gen_opts_rec(width, opts, groups, base_str) {
	// console.log(`gen_opts_rec(${width}, opts, ${groups}, ${base_str})`);
	if (groups.length === 0) {
		base_str += '1'.repeat(width - base_str.length);
		opts.push(base_str);
		return;
	}
	if (width - base_str.length === (groups.reduce((acc, el) => acc + el + 1, 0) - 1)) {
		base_str = base_str.slice(0, -1);
		for (const group of groups) base_str += '1' + '2'.repeat(group);
		opts.push(base_str);
		return;
	}
	// add a 1 (clear)
	gen_opts_rec(width, opts, groups, base_str + '1');
	// add the next group (mark)
	gen_opts_rec(width, opts, groups.slice(1), base_str + '2'.repeat(groups[0]) + '1');
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

function process_rows_regex(h_cts, field) {
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
 * Enter a solved nonogram into the webpage
 * @param {Array} field_solved  2D array of a solved nonogram puzzle
 */
function enter_solved_nonogram(field_solved) {
	// get field dimensions:
	const H = field_solved.length;
	const W = field_solved[0].length;

	// get game element:
	const game_brd = document.getElementsByClassName("nonograms-cell-back")[0];
	var game_box = game_brd.getBoundingClientRect();
	const delta_x = (game_box.width - 4) / W;
	const delta_y = (game_box.height - 4) / H;

	// var cells = document.getElementsByClassName("cell selectable");
	// var game_field = Game.currentState.cellStatus;

	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			if (field_solved[r_i][c_i] == 2) {
				let evt_opts = {
					bubbles: true,
					// cancelable: false,
					clientX: game_box.x + (c_i + 0.5) * delta_x,
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
