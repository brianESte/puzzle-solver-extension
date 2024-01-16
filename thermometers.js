// thermometers.js
// designed to work on page: https://www.puzzle-thermometers.com/

document.addEventListener("DOMContentLoaded", () => {
	// wait for the board to be ready
	waitForElm(".thermometers-cell-back").then((elm) => {
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

var kyu = [];

function play_game() {
	let btn_Done = document.getElementById("btnReady");
	if (btn_Done === null || document.getElementsByClassName("err").length) return;

	// parse game type / dimensions from menuSizes element:
	let game_mode = 0;
	let game_mode_str = document.getElementById("menuSizes")
		.getElementsByClassName("on")[0].href.substring(36);
	if (game_mode_str.length > 0) {
		game_mode = parseInt(game_mode_str.substring(6));
	}

	let base_shapes = {
		"start": 2,
		"curve": 3,
		"straight": 10,
		"end": 2
	};

	var grid = {
		rows: Array.from(document.getElementsByClassName("task h")).map(el => {
			return {
				cells: [],
				count: parseInt(el.textContent), n_clear: 0, n_filled: 0, complete: false
			}
		}),
		cols: Array.from(document.getElementsByClassName("task v")).map(el => {
			return {
				cells: [],
				count: parseInt(el.textContent), n_clear: 0, n_filled: 0, complete: false
			}
		})
	};

	const H = grid.rows.length;
	const W = grid.cols.length;

	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			let cell = {
				row: r_i, col: c_i,
				prev: undefined, next: undefined,
				clear: false, filled: false,
				thermometer: undefined, therm_pos: 0
			};
			grid.rows[r_i].cells.push(cell);
			grid.cols[c_i].cells.push(cell);
		}
	}

	var thermometers = [];
	var cells = document.getElementsByClassName("selectable");

	let current_thermometer = [];
	let cell_therm_pos = 0;
	let therm_dir = 0;
	for (let cell of cells) {
		let styles = cell.style;
		let width = parseInt(styles.width);
		let height = parseInt(styles.height);
		let row_i = parseInt(styles.top.slice(0, -2) / height);
		let col_i = parseInt(styles.left.slice(0, -2) / width);

		let grid_cell = grid.rows[row_i].cells[col_i];
		current_thermometer.push(grid_cell);
		grid_cell.therm_pos = cell_therm_pos++;
		grid_cell.thermometer = current_thermometer;
		let class_list = Array.from(cell.classList).filter(el => el != "cell" && el != "selectable" && el != "cell-off");
		let rotation = 0;
		// if a rotation was applied, obtain it, and remove it from the class list
		if (class_list.length > 1) {
			rotation = parseInt(class_list[0].substring(1));
			class_list.shift();
		}
		let cell_type = class_list[0];
		// if an end cell, add current therm to therm_list, reset therm_dir, therm_array
		if (class_list.includes("end")) {
			thermometers.push(current_thermometer);
			current_thermometer = [];
			cell_therm_pos = 0;
			therm_dir = 0;
			continue;
		}
		// calculate new direction
		therm_dir = ROR_4b(therm_dir, 2) ^ ROR_4b(base_shapes[cell_type], rotation);
		switch (therm_dir) {
			case 1:
				grid_cell.next = grid.rows[row_i].cells[col_i + 1];
				grid.rows[row_i].cells[col_i + 1].prev = grid_cell;
				break;
			case 2:
				grid_cell.next = grid.rows[row_i - 1].cells[col_i];
				grid.rows[row_i - 1].cells[col_i].prev = grid_cell;
				break;
			case 4:
				grid_cell.next = grid.rows[row_i].cells[col_i - 1];
				grid.rows[row_i].cells[col_i - 1].prev = grid_cell;
				break;
			case 8:
				grid_cell.next = grid.rows[row_i + 1].cells[col_i];
				grid.rows[row_i + 1].cells[col_i].prev = grid_cell;
				break;
		}
	}
	console.log(thermometers);

	for (let i = 0; i < H; i++) {
		kyu.push(() => process_line(grid, grid.rows[i]));
		kyu.push(() => process_line(grid, grid.cols[i]));
	}

	// process kyu until empty:
	while (kyu.length > 0) {
		kyu.shift()();
	}

	// enter completed board
	// first get game element:
	const game_brd = document.getElementsByClassName("thermometers-cell-back")[0];
	var game_box = game_brd.getBoundingClientRect();
	const delta_x = (game_box.width - 4) / W;
	const delta_y = (game_box.height - 4) / H;

	for (let r_i = 0; r_i < H; r_i++) {
		for (let c_i = 0; c_i < W; c_i++) {
			let evt_opts = {
				bubbles: true,
				// cancelable: false,
				clientX: game_box.x + delta_x / 2 + c_i * delta_x,
				clientY: game_box.y + (r_i + 0.5) * delta_y,
				// pointerType: "mouse",
				// view: window,
			}
			if (grid.rows[r_i].cells[c_i].filled) {
				game_brd.dispatchEvent(new MouseEvent("mousedown", evt_opts));
				game_brd.dispatchEvent(new MouseEvent("mouseup", evt_opts));
				continue;
			}
		}
	}

	document.getElementById("robot").value = 1;
	btn_Done.click();
}

function ROR_4b(x, n) {
	return ((x + (x << 4)) >> n) & 0xF;
}

function process_line(grid, line) {
	if (line.complete)
		return;
	// check for nigh completeness
	if (line.n_clear + line.n_filled === line.cells.length) {
		line.complete = true;
		return;
	}
	if (line.n_filled === line.count) {
		// implies that the remaining unset cells can be cleared
		for (let cell of line.cells) {
			if (cell.clear || cell.filled)
				continue;
			kyu.push(() => clear_cell(grid, cell));
		}
		line.complete = true;
		return;
	}
	if (line.count === line.cells.length - line.n_clear) {
		// fill remaining cells
		for (let cell of line.cells) {
			if (cell.clear || cell.filled)
				continue;
			kyu.push(() => fill_cell(grid, cell));
		}
		// preemptively set line to complete?
		line.complete = true;
		return;
	}
	// create an array of arrays of therms, in ascending temp
	let row_therms = [];
	let last_therm = undefined;
	let last_idx = -1;
	for (let cell of line.cells) {
		if (cell.clear || cell.filled)
			continue;
		if (cell.thermometer == last_therm) {
			// determine whether the new cell is before or after the current cells in the current/last therm
			if (row_therms[row_therms.length - 1][0].therm_pos > cell.therm_pos) {
				row_therms[last_idx].unshift(cell);
			} else {
				row_therms[last_idx].push(cell);
			}
		} else {
			row_therms.push([cell]);
			last_therm = cell.thermometer;
			last_idx++;
		}
	}

	// check for clearable cells
	let clear_threshold = line.count - line.n_filled;
	for (let therm_arr of row_therms) {
		if (therm_arr.length > clear_threshold) {
			kyu.push(() => clear_cell(grid, therm_arr[clear_threshold]));
		}
	}

	let row_therm_max = row_therms.reduce((prev, curr) => (curr.length > prev) ? curr.length : prev, 0);
	let rem_merc = line.count - line.n_filled;
	let rem_space = line.cells.length - (line.n_clear + line.n_filled + row_therm_max);
	if (rem_merc <= rem_space)
		return;
	let fill_amt = rem_merc - rem_space;
	for (let row_therm of row_therms) {
		if (row_therm.length == row_therm_max) {
			kyu.push(() => fill_cell(grid, row_therm[fill_amt - 1]));
		}
	}
}

function clear_cell(grid, cell) {
	if (cell.clear)
		return;
	cell.clear = true;
	grid.rows[cell.row].n_clear++;
	grid.cols[cell.col].n_clear++;
	// clear dependent cell, if it exists
	if (cell.next != undefined && !cell.next.clear) {
		kyu.unshift(() => clear_cell(grid, cell.next));
	}
	// recheck row/col
	kyu.push(() => process_line(grid, grid.rows[cell.row]))
	kyu.push(() => process_line(grid, grid.cols[cell.col]))
}

function fill_cell(grid, cell) {
	if (cell.filled)
		return;
	cell.filled = true;
	grid.rows[cell.row].n_filled++;
	grid.cols[cell.col].n_filled++;
	// fill dependent cell, if it exists
	if (cell.prev != undefined && !cell.prev.filled) {
		kyu.unshift(() => fill_cell(grid, cell.prev));
	}
	// recheck row/col
	kyu.push(() => process_line(grid, grid.rows[cell.row]))
	kyu.push(() => process_line(grid, grid.cols[cell.col]))
}