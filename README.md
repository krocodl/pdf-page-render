# pdf-page-render

Partial automation of saving all pages as a PDF series.

I also added a setting so that the embedded source code would be rendered in normal black on a normal white background, rather than the pretty, empty black cartridge.

DISCLAIMER: This was created in 20 minutes using ChatGPT. I don't know JS or Node, so discussing the code details with me is pointless—I barely looked inside.

## Installation

* brew install node
  * node -v
  * npm -v
* npm init -y
  * validate existence node_modules/ and package.json in the directory
* npm install playwright
* brew install qpdf

## Usage

* for each web page
  * ./get.sh <page url>
* after all: qpdf --empty --pages pdf/*.pdf -- result.pdf
