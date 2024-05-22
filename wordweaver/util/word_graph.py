#!/bin/python3

import sys
import json
import networkx as nx
import matplotlib.pyplot as plt


def print_usage():
    print("""Usage:
$ python3 word_graph.py g[enerate] <word_list> <output_file>
    -> Generate a word_graph from a given word list
$ python3 word_graph.py p[lot] <word_graph> [n_src_nodes=200]
    -> Plot a given word graph
$ python3 word_graph.py r[emove] <word_graph> <word to be removed>
    -> Remove a given word from the graph
$ python3 word_graph.py s[hortest] <word_graph> <source word> <target word>
    -> Determine the shortest distance from the source to target words""")


if len(sys.argv) < 2:
    print("Missing argument(s)!")
    print_usage()
    sys.exit(1)

def find_word_in_dict_list(dict_list, word):
    for d_i, w_dict in enumerate(dict_list):
        if w_dict["word"] == word:
            return d_i
    return None

def gen_word_graph(word_list_fp, word_graph_fp):
    word_graph = []
    # open wordlist and create word_graph outline
    with open(word_list_fp, 'r') as text_file:
        for line in text_file:
            # print(line, end='')
            word_graph.append({ "word": line.rstrip(), "adjs": []})

    print("Beginning graph creation")
    for n_i, node in enumerate(word_graph):
        print(f'\rProcessing: {node["word"]}', end='')
        for l_i, letter in enumerate(node["word"]):
            alpha_set = [c for c in range(65, 98) if c != ord(letter)]
            for letter_opt in alpha_set:
                target_word = node["word"][:l_i] + chr(letter_opt) + node["word"][l_i+1:]
                target_index = find_word_in_dict_list(word_graph, target_word)
                if target_index is not None:
                    word_graph[n_i]["adjs"].append(target_index)
    print("Done processing! Writing to file")
    with open(word_graph_fp, 'w') as text_file:
        json.dump(word_graph, text_file)


def load_word_graph(word_graph_fp, graph, node_limit=None):
    with open(word_graph_fp, 'r') as json_file:
        word_graph = json.load(json_file)
    # if word_graph is None:
        # return
    if node_limit is not None and node_limit > len(word_graph):
        node_limit = None

    # add nodes
    if node_limit is None:
        for node in word_graph:
            for adj_i in node["adjs"]:
                graph.add_edge(node["word"], word_graph[adj_i]["word"])
        return

    for n_i in range(node_limit):
        for adj_i in word_graph[n_i]["adjs"]:
            graph.add_edge(word_graph[n_i]["word"], word_graph[adj_i]["word"])
        

def plot_word_graph(word_graph_fp, n_src_nodes=200):
    word_net = nx.Graph()
    load_word_graph(word_graph_fp, word_net, n_src_nodes)
    nx.draw(word_net, with_labels=True)
    plt.show()


def remove_word_from_graph(word_graph_fp, removal_target):
    dict_list = []
    with open(word_graph_fp, 'r') as json_file:
        dict_list = json.load(json_file)
    target_idx = find_word_in_dict_list(dict_list, removal_target)
    if target_idx is None:
        print("target word not found. Nothing to do...")
        return
    target_adjs = dict_list[target_idx]["adjs"]
    for adj_idx in target_adjs:
        dict_list[adj_idx]["adjs"].remove(target_idx)
    # clear the target's adjs list
    dict_list[target_idx]["adjs"] = []
    with open(word_graph_fp, 'w') as text_file:
        json.dump(dict_list, text_file)


def shortest_path(word_graph_fp, src_node, target_node):
    word_net = nx.Graph()
    load_word_graph(word_graph_fp, word_net)
    path = nx.shortest_path(word_net, source=src_node.upper(), target=target_node.upper())
    print(path)


def main():
    if sys.argv[1].startswith('g'):
        if len(sys.argv) < 4:
            print("word graph generation requires word list and output file!")
            sys.exit(2)
        gen_word_graph(sys.argv[2], sys.argv[3])
    elif sys.argv[1].startswith('p'):
        if len(sys.argv) < 3:
            print("word graph plot requires word graph file!")
            sys.exit(3)
        if len(sys.argv) >= 4:
            plot_word_graph(sys.argv[2], sys.argv[3])
        else:
            plot_word_graph(sys.argv[2])
    elif sys.argv[1].startswith('r'):
        if len(sys.argv) < 4:
            print("Removing a word node from word graph requires more arguments!")
            sys.exit(4)
        remove_word_from_graph(sys.argv[2], sys.argv[3].upper())
    elif sys.argv[1].startswith('s'):
        if len(sys.argv) < 5:
            print("shortest path query requires 3 arguments!")
            sys.exit(5)
        shortest_path(sys.argv[2], sys.argv[3], sys.argv[4])

    print("word_graph.py complete")

if __name__ == "__main__":
    main()
