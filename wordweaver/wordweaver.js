// wordweaver.js
// designed to work on the page: https://www.weavergame.org
// debugger;

document.addEventListener("DOMContentLoaded", () => {
	console.log("wordwaffle.js running!");
	// wait for the board to be ready
	waitForElm(".game__board").then((elm) => {
		console.log(elm.textContent);
		solve();
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


class WordGraph {
	constructor() {	this.nodes = {};	}

	add_node(new_node, adjacents=[]) {
		this.nodes[new_node] = {"word": new_node, "adjs": new Set()};
		for (let adj of adjacents) {
			let node = this.nodes[adj];
			if (node == undefined)	continue;
			this.add_edge(new_node, adj);
		}
	}

	add_edge(src_node, tgt_node) {
		this.nodes[src_node]["adjs"].add(this.nodes[tgt_node]);
		this.nodes[tgt_node]["adjs"].add(this.nodes[src_node]);
	}

	remove_edge(src_node, tgt_node) {
		this.nodes[src_node]["adjs"].delete(this.nodes[tgt_node]);
		this.nodes[tgt_node]["adjs"].delete(this.nodes[src_node]);
	}

	dijkstra(src_node, tgt_node, exclude=[]) {
		let unvisited_nodes = [src_node];
		let visited_nodes = [...exclude];
		let shortest_paths = { [src_node]: {"dist": 0, "path": src_node} };
		// the first step would be to add the node with the shortest dist to the shortest_dists list,
		// but all edges have a dist of 1...
		var current_node;
		while ((current_node = unvisited_nodes.shift())) {
			// grab unvisited nodes adjacent to current node
			let adjacents = Array.from(this.nodes[current_node]["adjs"].values())
				.filter(el => !visited_nodes.includes(el.word))
				.map(el => el.word);
			// add neighbors to the list of unvisited nodes
			unvisited_nodes.push(...adjacents);

			let current_path = shortest_paths[current_node];
			// loop through adjacents and add/check/update their entry in shortest_paths
			for (let adjacent of adjacents) {
				let curr_dist_to_adj = shortest_paths[adjacent] && shortest_paths[adjacent].dist;
				let new_dist_to_adj = current_path.dist + 1;

				if (curr_dist_to_adj == undefined || new_dist_to_adj < curr_dist_to_adj) {
					shortest_paths[adjacent] = {
						"dist": new_dist_to_adj,
						"path": current_path.path + '-' + adjacent};
				}
			}
			visited_nodes.push(current_node);
			if (current_node == tgt_node)	break;
		}
		return shortest_paths[current_node];
	}
}

async function load_word_graph(file_name) {
	const url = chrome.runtime.getURL(`data/${file_name}`);
	//console.log(url);
	return fetch(url).then(response => response.json())
		.then(adj_list_array => {
			//console.log(typeof(data));
			var word_graph = new WordGraph();
			//adj_list_array = adj_list_array.slice(0, 100);

			for (let word_obj of adj_list_array) {
				word_graph.add_node(word_obj["word"], word_obj["adjs"].map(idx => { let word_ob = adj_list_array[idx]; if (word_ob) return word_ob["word"]}));
			}
			return word_graph;
	});
}

function enter_words(word_path) {
	// reset board, if not already clear
	clear_board();
	// split path into each node word
	for (let node_word of word_path.split('-')) {
		// eventually will need to build in a way to check for missing words...
		for (let letter of node_word) {
			let letter_event = new KeyboardEvent("keydown", {
				key: letter,
				code: `Key${letter.toUpperCase()}`,
				charCode: letter.codePointAt(),
				keyCode: letter.codePointAt(),
				bubbles: true,
				//cancelable: true,
				//location: 0
			});
			document.body.dispatchEvent(letter_event);
		}
		document.body.dispatchEvent(enter_event);
		// begin error checking
		let err_msg = document.getElementById("error-toast");
		if (err_msg.style.display != "none" && err_msg.style.display != "") {
			// clear the error message before returning the problem word
			document.getElementById("error-toast").style.display = "none";
			//console.log(`oh no! ${node_word} was not accepted`);
			return node_word;
		}
	}
}

function clear_board() {
	// try to clear with the button
	if (document.getElementsByClassName("clearBoardButton").length) {
		document.getElementsByClassName("clearBoardButton")[0].click()
	} else {
		// try clearing via backspace
		let backspace = new KeyboardEvent("keydown", {
			key: "Backspace",
			code: "Backspace",
			charCode: 0,
			keyCode: 8,
			bubbles: true
		});
		for (let i = 0; i < 4; i++) {
			document.body.dispatchEvent(backspace);
		}
	}
}

// function to solve the word-weaver puzzle
async function solve() {
	var excluded_words = ["BING", "BLAD", "BUAT", "CALS", "CAUM", "COLL", "DEEK", "DESI",
		"ERES", "ETEN", "FOUD", "FOUS", "FUST", "KISH", "HELE",
		"PONT", "REAK", "RONG", "ROOS", "SYEN", "TAKS", "TANA", "TEER", "YESK"];
	// console.log("solve starting!");
	// reset board, if not already clear
	clear_board();
	// load word graph from file
	var word_graph = await load_word_graph("word_graph.json");

	const source = Array.from(document.getElementsByClassName("startWordRowContainer")[0].getElementsByClassName("startWordBlock"))
		.reduce((acc, curr) => acc + curr.innerText, "");
	const target = Array.from(document.getElementsByClassName("row endWordRow")[0].children).reduce((acc, curr) => acc + curr.innerText, "");

	console.log(`source word: ${source}, target word: ${target}`);
	//if (source.length != 4 || target.length != 4) {
		//console.log("something is missing!");
		//return;
	//}
	// compute shortest path given source and target words
	let shortest_path = word_graph.dijkstra(source, target, excluded_words);
	// grab path property, and remove source word from path
	let path = shortest_path.path.slice(5);

	var problem_word;
	while (problem_word = enter_words(path)) {
		console.log(`problem word: ${problem_word}, discovered!`);
		excluded_words.push(problem_word);
		shortest_path = word_graph.dijkstra(source, target, excluded_words);
		path = shortest_path.path.slice(5);
	}

	console.log("Done!");
}

const enter_event = new KeyboardEvent("keydown", {
	//key: "Enter",
	code: "Enter",
	charCode: 13,
	keyCode: 13,   // Deprecated but included for compatibility
	bubbles: true,
	//cancelable: true,
	//location: 0
});

// window.addEventListener('keydown', (e) => console.log(e));

setTimeout(solve, 2000);
