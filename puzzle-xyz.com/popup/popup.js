// first thing it should do is determine if the current page is listed 
// as targeted in the manifest under content scripts
// document.getElementById("jquery-loader").src = "https://ajax.googleapis.com/ajax/libs/jquery/3.6.3/jquery.min.js";
var valid_pages = browser.runtime.getManifest()["content_scripts"].reduce((arr, obj) => arr.concat(obj.matches), []);

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
  var valid = false;
  let active_url = tabs[0].url;
  for(let page of valid_pages){
    page = page.replace("*", ".*");
    let re = new RegExp(page);
    if(re.test(active_url)){
      valid = true;
    }
  }
  if(!valid){
    window.stop();
    return;
  }
  // toggle the hidden / shown pop-up divs
  document.getElementById("popup-content").classList.toggle("hidden");
  document.getElementById("non-game-content").classList.toggle("hidden");

  // get cookie, check for existence of game_records
  browser.cookies.get({
    url: tabs[0].url,
    name: "game_records"
  }).then(cookie => {
    var game_records;
    if(cookie == null || cookie.value == ""){
      console.log("no cookie found! will need to retrieve data from content script/ page, and set a new cookie");
      // TODO: retrieve game types programmatically from content script / DOM
      // Currently, this only works with the minesweeper puzzles...
      // browser.tabs.sendMessage(tabs[0].id, {msg: "bruh"});
      game_records = [
        {puzzle_type: "5x5 easy", avg_time: 0, n_solves: 0},
        {puzzle_type: "5x5 hard", avg_time: 0, n_solves: 0},
        {puzzle_type: "7x7 easy", avg_time: 0, n_solves: 0},
        {puzzle_type: "7x7 hard", avg_time: 0, n_solves: 0},
        {puzzle_type: "10x10 easy", avg_time: 0, n_solves: 0},
        {puzzle_type: "10x10 hard", avg_time: 0, n_solves: 0},
        {puzzle_type: "15x15 easy", avg_time: 0, n_solves: 0},
        {puzzle_type: "15x15 hard", avg_time: 0, n_solves: 0},
        {puzzle_type: "20x20 easy", avg_time: 0, n_solves: 0},
        {puzzle_type: "20x20 hard", avg_time: 0, n_solves: 0},
      ];
    } else {
      game_records = JSON.parse(cookie.value);
    }
    // generate the game record table:
    var record_table_body = document.getElementById("record-table").querySelector("tbody");
    game_records.forEach(record => {
      let tr = document.createElement("tr");
      let td_type = document.createElement("td");
      td_type.textContent = record["puzzle_type"];
      let td_time = document.createElement("td");
      td_time.textContent = (record["avg_time"] / 1000).toPrecision(4);
      let td_ct = document.createElement("td");
      td_ct.textContent = record["n_solves"];
      // for(const attr in record) {
      //   let td = document.createElement("td");
      //   td.textContent = record[attr];
      //   tr.append(td);
      // }
      tr.append(td_type, td_time, td_ct);
      record_table_body.append(tr);
    });

    // store game_records for future use:
    browser.cookies.set({
      url: tabs[0].url,
      name: "game_records",
      value: JSON.stringify(game_records),
      path: "/"
    });
    // var record_table_body = $("#record-table tbody");
  });
});

// Start or stop the solver, depending on the new button state
document.getElementById("toggle-solver").onchange = (ev) => {
  if (ev.target.checked) {
    // start the solver
    browser.storage.local.set({
      "solver_state": JSON.stringify({
        active: true,
        solves_remaining: document.getElementById("n_solve_ctr").value
      })
    });
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
      browser.tabs.sendMessage(tabs[0].id,
        {start: true});
    });
  } else {
    browser.storage.local.set({
      "solver_state": JSON.stringify({
        active: false
      })
    });
  }
};
