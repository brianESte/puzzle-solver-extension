A Chromium extension that automatically solves some puzzle games. The status of each site/game is listed below. The manifest may need to be modified / ammended slightly to work with other browsers, but the code should transfer without issue; unless you are using an absurdly old browser version. 

To use this browser extension, download the code. Then follow the browser specific instructions below:

Chrome/Chromium: [Follow these instructions](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked)

Firefox: First set the "manifest_version" number according to Mozilla's [current standard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/manifest_version). Then follow [these instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)

---

www.puzzle-binairo.com/ (binairo.js)
---
Successfully completes all 'easy' puzzles.

Size  | Difficulty | Time [s]
------|------------|-----
6x6   | Easy       | 0.417
6x6   | Hard       | ??
8x8   | Easy       | 0.514
8x8   | Hard       | ??
10x10 | Easy       | 0.552
10x10 | Hard       | ??
14x14 | Easy       | 0.564
14x14 | Hard       | ??
20x20 | Easy       | 0.776
20x20 | Hard       | ??

---

www.puzzle-minesweeper.com/minesweeper (minesweeper.js)
---
Successfully solves all 'easy' minesweeper puzzles. The minesweeper puzzles on this site are unambiguous, in that all information necessary to solve them is presented to the user from the beginning.

Size  | Difficulty | Time [s]
------|------------|-----
5x5   | Easy       | 0.387
5x5   | Hard       | 0.412
7x7   | Easy       | 0.387
7x7   | Hard       | 0.407
10x10 | Easy       | 0.420
10x10 | Hard       | 0.429
15x15 | Easy       | 0.550
15x15 | Hard       | 0.580
20x20 | Easy       | 0.747
20x20 | Hard       | 0.763

---

www.puzzle-minesweeper.com/mosaic (mosaic.js)
---
Successfully solves all 'easy' mosaic puzzles.

Size  | Difficulty | Time [s]
------|------------|-----
5x5   | Easy       | 0.553
5x5   | Hard       | ??
7x7   | Easy       | 0.580
7x7   | Hard       | ??
10x10 | Easy       | 0.589
10x10 | Hard       | ??
15x15 | Easy       | 0.884
15x15 | Hard       | ??
20x20 | Easy       | 1.344
20x20 | Hard       | ??

---

www.puzzle-nonograms.com (nonograms.js)
---
(usually) works for 5x5. All other game styles / sizes are untested. Sometimes goes into a loop of solving incompletely and clicking the done button... When it works, solve-time is usually sub 0.8 s. Which could probably be better.

www.puzzle-skyscrapers.com (skyscrapers.js)
---
Basically only a stub. 

www.puzzle-tents.com (tents.js)
---
Currently a stub.