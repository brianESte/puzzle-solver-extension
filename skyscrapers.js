// designed to work on the page: https://www.puzzle-skyscarapers.com/
// assume nonogram is 4x4. Will make it flexible later

// first objective is to influence game state...

function game_from_page(){
    // var h_ct_grps = $("#taskLeft .task-group");
    var h_ct_grps = document.getElementById("taskLeft").children;
    var h_cts = counts_from_groups(h_ct_grps);

    // var v_ct_grps = $("#taskTop .task-group");
    var v_ct_grps = document.getElementById("taskTop").children;
    var v_cts = counts_from_groups(v_ct_grps);

    return [h_cts, v_cts];
}

var stop_tmr = document.getElementsByName("stopClock")[0];
stop_tmr.value = 1;
document.getElementById("robot").value = 1;

var keydown_dn = new KeyboardEvent("keydown", {
    bubbles: true,
    code: "ArrowDown",
    composed: true,
    key: "ArrowDown",
    view: window
});

var game_el = document.getElementById("game");
var cells = document.getElementsByClassName("cell selectable");
var cell_zz = cells[0];
// cell_zz.classList.toggle("active");

var keypress_2 = new KeyboardEvent("keypress", {key: "2"});

document.addEventListener("keypress", e => {
    console.log("keypress");
    console.log(e);
});
document.addEventListener("keydown", e => {
    console.log("keydown");
    console.log(e);
});

function game_dn(){    game_el.dispatchEvent(keydown_dn); game_el.dispatchEvent(keypress_2);   }

setTimeout(game_dn, 3000);
