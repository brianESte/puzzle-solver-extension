#!/bin/python3

import bs4
import requests
import sys


def print_usage():
    print("Usage: \n$ python3 word_scraper.py <n letters> <output_file>")

if len(sys.argv) < 3:
    print("Missing argument(s)!")
    print_usage()
    sys.exit(1)

try:
    arg_n_letters = int(sys.argv[1])
except ValueError:
    print("Invalid number of letters!")
    print_usage()
    sys.exit(2)

def scrape_words(url):
    pass

url_base = f"https://www.thewordfinder.com/wordlist/{arg_n_letters}-letter-words/"
headers = {'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0"}
res = requests.get(url_base, headers=headers)
if res.status_code != 200:
    print(f"Something went wrong with the request! Response code: {res.status_code}")
    sys.exit(3)

# get number of pages
page_soup = bs4.BeautifulSoup(res.text, "html.parser")    # , "lxml")
nav_links = page_soup.find("h3", string="Pagination").find_next_sibling("nav", class_="links")
nav_links = list(filter(lambda el: el != '\n', nav_links))
# pagination = story_soup.select("div.detail-block")
n_pages = len(nav_links)

for i in range(n_pages):
    url = f"https://www.thewordfinder.com/wordlist/{arg_n_letters}-letter-words/?dir=ascending&field=word&pg={i+1}&size={arg_n_letters}"
    res = requests.get(url, headers=headers)
    page_soup = bs4.BeautifulSoup(res.text, "html.parser")    # , "lxml")
    word_ul = page_soup.find("ul", class_="clearfix")
    word_spans = word_ul.find_all("span", style="letter-spacing: 1px;")

    with open(sys.argv[2], 'a') as text_file:
        # print(dir(text_file))
        # print(text_file.mode)

        for span in word_spans:
            text_file.write(span.string + '\n')
print("script complete")

