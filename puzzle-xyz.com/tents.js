// tents.js
// designed to work on the page: https://www.puzzle-tents.com/*

document.addEventListener("DOMContentLoaded", () => {
	// wait for the board to be ready
	waitForElm(".tents-cell-back").then((elm) => {
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
 * Main function that calls the solving function, and if successful enters the solved puzzle.
 * could use a better name
 */
function play_game() {
	let btn_Done = document.getElementById("btnReady");
	if (btn_Done === null || document.getElementsByClassName("err").length) return;
	// diabling the timer is only superficial. 
	// var stop_tmr = document.getElementsByName("stopClock")[0];
	// stop_tmr.value = 1;

	var [h_cts, v_cts, field] = field_from_page();
	// console.log(h_cts, v_cts);

	let solved = solve_tents_easy(field, h_cts, v_cts);
	// TODO: expand solver to handle all hard puzzles. 1.5D regex...
	// test on puzzle 15x15 hard # 4,327,459

	// get field dimensions:
	const H = h_cts.length;
	const W = v_cts.length;

	// first get game element:
	const game_brd = document.getElementsByClassName("tents-cell-back")[0];
	var game_box = game_brd.getBoundingClientRect();
	const delta_x = (game_box.width - 4) / W;
	const delta_y = (game_box.height - 4) / H;

	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			if (field[r_i][c_i].is_tent && field[r_i][c_i].clear) {
				console.log(`double marked cell at ${[r_i, c_i]}`);
				alert(`double marked cell at ${[r_i, c_i]}`);
			}
			let evt_opts = {
				bubbles: true,
				// cancelable: false,
				clientX: game_box.x + delta_x / 2 + c_i * delta_x,
				clientY: game_box.y + (r_i + 0.5) * delta_y,
				// pointerType: "mouse",
				// view: window,
			}
			if (field[r_i][c_i].is_tent) {    // field[r_i][c_i].value == 2
				game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
				game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
				continue;
			}
			if (field[r_i][c_i].clear) {      // field[r_i][c_i].value == 1
				game_brd.dispatchEvent(new MouseEvent("mousedown", { ...evt_opts, button: 2 }));
				game_brd.dispatchEvent(new MouseEvent("mouseup", { ...evt_opts, button: 2 }));
			}
		}
	}

	if (solved) {
		// set robot to true
		document.getElementById("robot").value = 1;
		btn_Done.click();
	} else {
		console.log(field);
	}
}

/**
 * Objective is to obtain the horizontal and vertical counts and the initial tree placement
 */
function field_from_page() {
	// horizontal / vertical tent counts:
	const el_to_obj = el => { let val = parseInt(el.innerText); return { done: false, n_tents_total: val, n_tents_rem: val, n_unset: 0 } };
	var h_cts = Array.from(document.getElementsByClassName("cell task h")).map(el_to_obj)
	var v_cts = Array.from(document.getElementsByClassName("cell task v")).map(el_to_obj)

	// dimensions:
	const W = v_cts.length;
	const H = h_cts.length;

	// create base padded field
	// var field = new Array(H+2).fill().map(() => new Array(W+2).fill(0));
	var field = new Array(H).fill().map(() => new Array(W).fill().map(() => { return {} }));

	// also need initial tree locations
	var cells = document.getElementsByClassName("tents-cell-back")[0].children;
	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			let cell = field[r_i][c_i];
			cell.row = r_i;
			cell.col = c_i;
			if (cells[r_i * W + c_i + 1].classList.contains("tree-cell")) {
				cell.clear = true;
				cell.is_tree = true;    // .clear should be redundant. cell.value = 4;
				cell.tent = null;
				// let neighbor_coords = [`${r_i},${c_i-1}`, `${r_i-1},${c_i}`, `${r_i+1},${c_i}`, `${r_i},${c_i+1}`];
				let adj_cells = [];
				if (c_i > 0) 			adj_cells.push(field[r_i][c_i - 1]);
				if (c_i < W - 1)	adj_cells.push(field[r_i][c_i + 1]);
				if (r_i < H - 1)	adj_cells.push(field[r_i + 1][c_i]);
				if (r_i > 0) 			adj_cells.push(field[r_i - 1][c_i]);

				// cell.adjacents = [field[r_i][c_i-1], field[r_i-1][c_i], field[r_i+1][c_i], field[r_i][c_i+1]];  //.filter(el => isFinite(el));
				// cell.tent_spots = adj_cells.filter(el => el !== undefined);
				// filter out any tent spots on 0-rows/columns?
				cell.tent_spots = adj_cells;
			} else {
				// set all non tree cells to clear, then later de-clear the ones adjacent to trees
				cell.clear = true;    // cell.value = 1;
				cell.is_tree = false;
				cell.is_tent = false;
				cell.tree = null;
				cell.card_trees = [];
			}
		}
	}

	return [h_cts, v_cts, field];
}

/**
 * Solves a tents puzzle. It uses a task queue. As long as a task is in the queue,
 * the next task is shifted out and run / completed. The task queue is primed with
 * a task to check each tree cell, as well as each row and column. When the queue is
 * empty the h/v_cts arrays are checked to confirm the puzzle's completion. 
 * @param {Array} field 2D array representing the initial state of the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @returns true if the solve was successful, false otherwise
 */
function solve_tents_easy(field, h_cts, v_cts) {
	const H = h_cts.length;
	const W = v_cts.length;
	var tree_list = [];

	tree_list = field.flat().filter(el => el.is_tree);    // el.value == 4

	let n_trees = tree_list.length;
	for (let tree_i = 0; tree_i < n_trees; tree_i++) {
		tree_list[tree_i].tent_spots = tree_list[tree_i].tent_spots.filter(
			cell => h_cts[cell.row].n_tents_rem && v_cts[cell.col].n_tents_rem && !cell.is_tree);   // cell.value != 4
	}
	// set h/v_cts with a value of 0 to done ... could be turned into a function
	for (let r_i = 0; r_i < H; r_i++) {
		if (h_cts[r_i].n_tents_rem == 0) h_cts[r_i].done = true;
	}
	for (let c_i = 0; c_i < H; c_i++) {
		if (v_cts[c_i].n_tents_rem == 0) v_cts[c_i].done = true;
	}

	const nei_range = [-1, 0, 1];
	// de-clear tree-adjacent cells
	for (let tree_cell of tree_list) {
		// clear the cells stored in each tree's adjacent array
		// but first, filter it for adjacent trees...
		// tree_cell.tent_spots = tree_cell.tent_spots.filter(el => !el.is_tree);
		for (let tent_spot of tree_cell.tent_spots) {
			// unclear the tent spot
			tent_spot.clear = false;    // tent_spot.value = 0; or.. --
			// add the tree to the adjacent cell's list of adjacent trees
			tent_spot.card_trees.push(tree_cell);
		}
	}
	// update the number of unset cells in each h/v counts
	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			h_cts[r_i].n_unset += !(field[r_i][c_i].clear || field[r_i][c_i].is_tree);    // !(field[r_i][c_i].value == 1 || 4)
			v_cts[c_i].n_unset += !(field[r_i][c_i].clear || field[r_i][c_i].is_tree);    // same
			// console.log(`obj.values: ${Object.values(field[r_i][c_i])}`);
		}
	}

	// start with a few process_row()s in the kyu
	for (let tree_cell of tree_list) {
		kyu.push(() => check_tree(field, h_cts, v_cts, tree_cell));
	}
	for (let r_i = 0; r_i < H; r_i++) {
		kyu.push(() => process_row(field, h_cts, v_cts, r_i));
	}
	for (let c_i = 0; c_i < W; c_i++) {
		kyu.push(() => process_col(field, h_cts, v_cts, c_i));
	}

	while (kyu.length > 0) {
		kyu.shift()();
	}
	// console.log("kyu empty");
	if (h_cts.every(el => el.done) && v_cts.every(el => el.done)) return true;
	return false;
}

/**
 * Processes a row of the grid, indicated by the row index.
 * 1. checks if the column was completed by a different function
 * 2. checks if the number of remaining unset cells equals the number of remaining tents
 * 3. checks for unset cells if all tents have been pitched
 * 4. Uses RegExp to determine tentable cells and clearable cells
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Number} row_i Row index
 * @returns
 */
function process_row(field, h_cts, v_cts, row_i) {
	if (h_cts[row_i].done) return;
	// console.log(`process_row(${r_i})`);
	// if the row/col was completed on a cross-pass, set it to done now
	if (h_cts[row_i].n_tents_rem === 0 && h_cts[row_i].n_unset === 0) {
		h_cts[row_i].done = true;
		return;
	}

	// if the number of tents left for a row == the number unset, set them to tents. 
	if (h_cts[row_i].n_tents_rem === h_cts[row_i].n_unset) {
		let W = v_cts.length;
		// fill in those uncleared cells with tents...
		for (let c_i = 0; c_i < W; c_i++) {
			let cell = field[row_i][c_i];
			if (cell.is_tree || cell.is_tent || cell.clear) continue;   // cell.value > 0
			// console.log(`process_row -> Will pitch a tent at (${r_i}, ${c_i})`);
			kyu.push(() => pitch_tent(field, h_cts, v_cts, cell));
		}
		h_cts[row_i].done = true;
		return;
	}
	// if h_cts is 0 and n_unclear > 0. clear the remaining cells
	if (h_cts[row_i].n_tents_rem === 0 && h_cts[row_i].n_unset > 0) {
		let W = v_cts.length;
		for (let c_i = 0; c_i < W; c_i++) {
			let cell = field[row_i][c_i];
			if (cell.is_tree || cell.is_tent || cell.clear) continue;   // cell.value > 0
			// console.log(`process_row() -> clearing remaining cells in row ${r_i} will clear cell at (${r_i}, ${c_i})`);
			kyu.push(() => clear_cell(field, h_cts, v_cts, cell));
		}
		h_cts[row_i].done = true;
		return;
	}

	// now perform regex on the row...
	let regex_str = "(?<!2)[014]*?([02])";
	for (let i = 1; i < h_cts[row_i].n_tents_total; i++) regex_str += "[014]+?([02])";
	regex_str += "[014]*?(?!2)";
	let line_string = field[row_i].map(el => get_cell_value(el)).join('');
	// console.log(`regex called on row ${r_i}: ${line_string} and regex str: ${regex_str}`);

	let tent_spot_opts = [];
	let clear_spot_opts = [];
	for (let i = h_cts[row_i].n_tents_total + 1; i >= 0; i--) {
		regex_line(regex_str, line_string, tent_spot_opts, clear_spot_opts);
		regex_str = remove_qmark(regex_str);
	}
	// console.log(tent_spot_opts, clear_spot_opts);

	const W = v_cts.length;
	let tent_spots = tent_spot_opts.reduce((acc, opt) => acc & opt);
	let clear_spots = clear_spot_opts.reduce((acc, opt) => acc & opt) & ((1 << W) - 1);
	// console.log(`&(|) of tent spots: ${tent_spots}, of hypothetical clears ${clear_spots}`);
	const H = h_cts.length;
	let adj_line_offsets = [row_i > 0 ? -1 : undefined, row_i < H - 1 ? 1 : undefined].filter(el => el);

	let line_i = 0;
	let mask_limit = Math.max(tent_spots, clear_spots);
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		if (tent_spots & mask) {
			let new_tent = field[row_i][line_i];
			kyu.push(() => pitch_tent(field, h_cts, v_cts, new_tent));
			// console.log(`process_row regex -> will pitch tent at (${new_tent.row}, ${new_tent.col})`);
		}
		if (clear_spots & mask) {
			for (let offset of adj_line_offsets) {
				let new_clear = field[row_i + offset][line_i];
				kyu.push(() => clear_cell(field, h_cts, v_cts, new_clear));
				// console.log(`process_row regex -> will clear cell at (${new_clear.row}, ${new_clear.col})`);
			}
		}
		line_i++;
	}
}

/**
 * Processes a column of the grid, indicated by the column index.
 * 1. checks if the column was completed by a different function
 * 2. checks if the number of remaining unset cells equals the number of remaining tents
 * 3. checks for unset cells if all tents have been pitched
 * 4. Uses RegExp to determine tentable cells and clearable cells
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Number} col_i Column index
 * @returns
 */
function process_col(field, h_cts, v_cts, col_i) {
	if (v_cts[col_i].done) return;
	// console.log(`process_col(${col_index})`);
	if (v_cts[col_i].n_tents_rem === 0 && v_cts[col_i].n_unset === 0) {
		// console.log("setting column", col_index, "to done");
		v_cts[col_i].done = true;
		return;
	}
	if (v_cts[col_i].n_tents_rem === v_cts[col_i].n_unset) {
		let H = h_cts.length;
		// fill in those uncleared cells with tents...
		for (let r_i = 0; r_i < H; r_i++) {
			let cell = field[r_i][col_i];
			if (cell.is_tree || cell.is_tent || cell.clear) continue;   // cell.value > 0
			// console.log(`Will pitch a tent at (${cell.row}, ${cell.col})`);
			kyu.push(() => pitch_tent(field, h_cts, v_cts, cell));
		}
		v_cts[col_i].done = true;
		return;
	}
	// if v_cts is 0 and n_unset > 0. clear the remaining cells
	if (v_cts[col_i].n_tents_rem === 0 && v_cts[col_i].n_unset > 0) {
		let H = h_cts.length;
		// console.log(`clearing the remaining cells in column ${col_index}`);
		for (let r_i = 0; r_i < H; r_i++) {
			let cell = field[r_i][col_i];
			if (cell.is_tree || cell.is_tent || cell.clear) continue;   // cell.value > 0
			// console.log(`process_col() clearing remaining cells in column ${col_index} including (${r_i}, ${col_index})`);
			kyu.push(() => clear_cell(field, h_cts, v_cts, cell));
		}
		v_cts[col_i].done = true;
		return;
	}
	// now perform regex on the column...
	let regex_str = "(?<!2)[014]*?([02])";
	for (let i = 1; i < v_cts[col_i].n_tents_total; i++) regex_str += "[014]+?([02])";
	regex_str += "[014]*?(?!2)";
	let line_string = field.map(el => get_cell_value(el[col_i])).join('');
	// console.log(`regex called on col ${col_index}: ${line_string} and regex str: ${regex_str}`);

	let tent_spot_opts = [];
	let clear_spot_opts = [];
	for (let i = v_cts[col_i].n_tents_total + 1; i >= 0; i--) {
		regex_line(regex_str, line_string, tent_spot_opts, clear_spot_opts);
		regex_str = remove_qmark(regex_str);
	}
	// console.log(tent_spot_opts, clear_spot_opts);

	const H = h_cts.length;
	const W = v_cts.length;
	let tent_spots = tent_spot_opts.reduce((acc, opt) => acc & opt);
	let clear_spots = clear_spot_opts.reduce((acc, opt) => acc & opt) & ((1 << H) - 1);
	let adj_line_offsets = [col_i > 0 ? -1 : undefined, col_i < W - 1 ? 1 : undefined].filter(el => el);
	// console.log(`&(|) of tent spots: ${tent_spots}, of hypothetical clears ${clear_spots}, with offsets ${adj_line_offsets}`);

	let line_i = 0;
	let mask_limit = Math.max(tent_spots, clear_spots);
	for (let mask = 1; mask <= mask_limit; mask <<= 1) {
		if (tent_spots & mask) {
			let new_tent = field[line_i][col_i];
			kyu.push(() => pitch_tent(field, h_cts, v_cts, new_tent));
			// console.log(`process_row regex -> will pitch tent at (${new_tent.row}, ${new_tent.col})`);
		}
		if (clear_spots & mask) {
			for (let offset of adj_line_offsets) {
				let new_clear = field[line_i][col_i + offset];
				kyu.push(() => clear_cell(field, h_cts, v_cts, new_clear));
				// console.log(`process_col regex -> will clear cell (${new_clear.row}, ${new_clear.col})`);
			}
		}
		line_i++;
	}
}

/**
 * Clears the given cell, updates h/v_cts. Also adds a process_row(cell.row)
 * and process_col(cell.col) to the queue.
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Object} cell Object representing the cell to be cleared
 * @returns
 */
function clear_cell(field, h_cts, v_cts, cell) {
	if (cell.clear) return;     // cell.value == 1
	// console.log(`clear_cell(${cell.row}, ${cell.col})`);
	cell.clear = true;          // cell.value = 1;
	h_cts[cell.row].n_unset--;
	v_cts[cell.col].n_unset--;
	// when a cell is cleared or tented, it should be removed from the tent_spot arrays of nearby trees
	for (let tree_cell of cell.card_trees) {
		// console.log(`clear_cell() -> will check tree ${tree_cell.row}, ${tree_cell.col}`);
		kyu.push(() => check_tree(field, h_cts, v_cts, tree_cell));
	}
	kyu.push(() => process_row(field, h_cts, v_cts, cell.row));
	kyu.push(() => process_col(field, h_cts, v_cts, cell.col));
}

/**
 * Pitch a tent at the given cell. Clears all uncleared adjacent/diagonal cells
 * Adds check_tent(cell), process_row(cell.row), and process_col(cell.col) to the queue
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Object} cell Object representing the cell where a tent should be pitched
 * @returns
 */
function pitch_tent(field, h_cts, v_cts, cell) {
	// If the cell was already handled and removed by an earlier task, the cell will be undefined,
	// and there is nothing to do
	if (cell == undefined || cell.is_tent) return;   // cell.value == 2
	// console.log(`pitch_tent(${cell.row}, ${cell.col})`);
	cell.is_tent = true;    // cell.value = 2;
	h_cts[cell.row].n_tents_rem--;
	h_cts[cell.row].n_unset--;
	v_cts[cell.col].n_tents_rem--;
	v_cts[cell.col].n_unset--;
	// clear adjacent cells
	const nei_range = [-1, 0, 1];
	let H = h_cts.length;
	let W = v_cts.length;
	for (let dy of nei_range) {
		let y = cell.row + dy;
		if (y >= H || y < 0) continue;
		for (let dx of nei_range) {
			// if (dx === 0 && dy === 0) continue;
			let x = cell.col + dx;
			// let potential_neighbor = field[y][x];
			if (x >= W || x < 0 || field[y][x].clear || field[y][x].is_tree || field[y][x].is_tent) continue;   // field[y][x].value > 0
			// console.log(`pitch tent() -> will clear cell ${y}, ${x}`)
			kyu.push(() => clear_cell(field, h_cts, v_cts, field[y][x]));
		}
	}
	// clear the adjacent uncleared, then filter the tent_spot lists of adjacent trees
	// cell.unset_adjacents.forEach(adj_el => {
	// 	if (!adj_el.clear) {
	// 		adj_el.clear = true;
	// 		h_cts[adj_el.row].n_unset--;
	// 		v_cts[adj_el.col].n_unset--;
	// 		for (let tree_cell of adj_el.card_trees) {
	// 			tree_cell.tent_spots = tree_cell.tent_spots.filter(el => !el.clear && !el.is_tent);
	// 			if (tree_cell.tent_spots.length === 1) {
	// 				// set that cell to tent
	// 				pitch_tent(tree_cell.tent_spots[0], h_cts, v_cts);
	// 			}
	// 		}
	// 	}
	// });

	// add to the kyu:
	kyu.push(() => check_tent(field, h_cts, v_cts, cell));
	kyu.push(() => process_row(field, h_cts, v_cts, cell.row));
	kyu.push(() => process_col(field, h_cts, v_cts, cell.col));
}

/**
 * Check a tent cell if a single tree remains among its card_trees array, and if so
 * set the tent's tree property to it, and the tree's tent property to the tent
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Object} cell Object representing the cell whose tent should be checked
 * @returns
 */
function check_tent(field, h_cts, v_cts, cell) {
	if (!cell.is_tent) return;
	// console.log(`check_tent(${cell.row}, ${cell.col}): n cardinal trees: ${cell.card_trees.length}`);

	if (cell.card_trees.length === 1) {
		let cardinal_tree = cell.card_trees[0];
		// set the cell's tree to the cardinal tree, and the tree's tent to this cell
		cell.tree = cardinal_tree;
		cardinal_tree.tent = cell;
		// check the tree for further tent_spots to be processed
		kyu.push(() => check_tree(field, h_cts, v_cts, cardinal_tree));
	}
}

/**
 * Checks a tree cell for cleared /remaining tent spots. If a tent has already been assigned
 * to the tree, process the remaining tent_spots, checking and clearing as needed. Otherwise
 * if there is only one tent spot remaining, pitch a tent there or, if there is already a tent
 * there, set it to the tree's tent property, and the tree to the tent's tree property.
 * @param {Array} field 2D array representing the puzzle field
 * @param {Array} h_cts Array of objects describing each row
 * @param {Array} v_cts Array of objects describing each column
 * @param {Object} tree_cell Object representing the tree cell to be checked
 * @returns 
 */
function check_tree(field, h_cts, v_cts, tree_cell) {
	if (!tree_cell.is_tree || tree_cell.tent_spots.length === 0) return;   // tree_cell.value != 4		// || tree_cell.tent != null
	// console.log(`check_tree(${tree_cell.row}, ${tree_cell.col}): n spots: ${tree_cell.tent_spots.length}, tent: ${tree_cell.tent}`);
	tree_cell.tent_spots = tree_cell.tent_spots.filter(el => !(el.clear || el == tree_cell.tent));        // el.value != 1
	// console.log(`check_tree() n_tent_spots = ${tree_cell.tent_spots.length}`);
	if (tree_cell.tent != null) {
		// tree_cell.tent_spots = tree_cell.tent_spots.filter(el => el != tree_cell.tent);
		// console.log(`check_tree(${tree_cell.row}, ${tree_cell.col}) -> tent exists, and there are more than 1 tent spots left...`);
		for (let tent_spot of tree_cell.tent_spots) {
			// console.log(`tent spot remaining at (${tent_spot.row}, ${tent_spot.col}) -> its card_trees array will be filtered...`);
			tent_spot.card_trees = tent_spot.card_trees.filter(el => el.tent == null);
			if (tent_spot.is_tent) {
				// console.log(`tent spot is a tent. need to recheck() it...?`);
				kyu.push(() => check_tent(field, h_cts, v_cts, tent_spot));
				continue;
			}
			if (tent_spot.card_trees.length === 0) {
				// console.log(`check_tree(${tree_cell.row}, ${tree_cell.col}) -> will clear cell at (${tent_spot.row}, ${tent_spot.col})`);
				kyu.push(() => clear_cell(field, h_cts, v_cts, tent_spot));
			}
		}
		// then clear the remaining tent_spots of the tree_cell to mark it as complete:
		tree_cell.tent_spots = [];
		return;
	}

	if (tree_cell.tent_spots.length === 1) {
		let last_tent_spot = tree_cell.tent_spots[0];
		// if the last tent spot is already a tent, set the tree's tent to the tent cell,
		// and the tent's tree to the tree cell
		if (last_tent_spot.is_tent) {					// last_tent_spot.value == 2
			last_tent_spot.tree = tree_cell;
			tree_cell.tent = last_tent_spot;
			tree_cell.tent_spots = [];		// might be unnecessary
		} else {
			// console.log(`check_tree -> will pitch tent at (${tree_cell.tent_spots[0].row}, ${tree_cell.tent_spots[0].col})`);
			kyu.push(() => pitch_tent(field, h_cts, v_cts, tree_cell.tent_spots[0]));
		}
	}
}

/**
 * Perform regex on a string representation of a row/column (line),
 * convert the results to a binary coded number and push to the results to the provided arrays
 * @param {String} regex_str String to be used as a regular expression
 * @param {String} line_string String to be searched with the regex
 * @param {Array} tent_spot_opts Array to which new possible tent spots will be pushed
 * @param {Array} clear_spot_opts Array to which new possible clear spots will be pushed
 */
function regex_line(regex_str, line_string, tent_spot_opts, clear_spot_opts) {
	let matches = line_string.match(new RegExp(regex_str, 'd'));
	let possible_tent_spots = 0;
	let match_indices = matches.indices;
	match_indices.shift();
	match_indices.forEach(el => possible_tent_spots |= (1 << el[0]));
	let hypothetical_clears = 0;
	match_indices.forEach(el => hypothetical_clears |= (7 << el[0]));

	tent_spot_opts.push(possible_tent_spots);
	clear_spot_opts.push(hypothetical_clears >>> 1);
}

/**
 * Removes the last quantifier modifying question mark in a regex string
 * @param {String} str string to be processed
 * @returns processed string
 */
function remove_qmark(str) {
	for (let i = str.length - 6; i > 0; i--) {
		if (str[i] == '?') {
			return str.slice(0, i) + str.slice(i + 1);
		}
	}
	return str;
}

/**
 * Returns the value of the cell based on which fields of the cell are set.
 * @param {Object} cell An object representing a puzzle cell
 * @returns The value of the cell
 */
function get_cell_value(cell) {
	if (cell.is_tree)	return 4;
	if (cell.is_tent)	return 2;
	if (cell.clear)		return 1;
	return 0;
}

function print_state(field, h_cts, v_cts, msg) {
	console.log("h/v_cts, ", msg);
	console.log(h_cts.map(el => el.done ? 'd' : el.n_tents_rem), v_cts.map(el => el.done ? 'd' : el.n_tents_rem));
	console.log(field.map(row => row.map(el => {
		// could replace with a switch/case
		if (el.is_tree) return 'T';
		if (el.clear) return '.';
		if (el.is_tent) return 'A';
		return '?';
	}).join(' ')).join('\n'));
}

function list_trees(tree_list) {
	tree_list.forEach(tree => {
		let open_spots = tree.tent_spots.reduce((acc_string, tent_spot) => acc_string + `(${tent_spot.row},${tent_spot.col}) `, "");
		console.log(`tree (${tree.row}, ${tree.col}) with open spots at: ${open_spots}`);
	});
}
