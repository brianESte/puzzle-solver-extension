# WordWeaver Solver

A browser extension to automatically solve the word weaver puzzle on the site [weavergame.org](https://www.weavergame.org/). The objective of the puzzle is to fill in the words that link the start word to the end word. From one word to the next only one letter may be changed. As a short example, a path from `lick` to `late` looks like:
```
LICK
LICE
LACE
LATE
```

## Function
It uses a list of all english 4 letter words, builds a graph/network from those words with connections between words that differ by only one letter. Dijkstra's algorithm is used to find a shortest path from the given starting word and target word, while ignoring / avoiding the words that were included in "all english 4 letter words" but are not accepted by the site. It works, but could possibly be faster, with a more intelligent algorithm...

## Utilities
Utility programs / scripts are found in `util/`.
- `word_scraper.py` was created to gather all 4 letter english words via web-scraping from the site [www.thewordfinder.com](https://www.thewordfinder.com/). 
- `word_graph.py` facilitates generating and managing the word graph.

## Development
Currently only set up to run on Chromium. A version for Firefox is planned. 