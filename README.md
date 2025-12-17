# pdf-page-render

Partial automation of saving all pages as a PDF series

## Installation

* brew install node
  * node -v
  * npm -v
* npm init -y
  * validate existence node_modules/ and package.json in the directory
* npm install playwright
* brew install qpdf

## Usage

* for each web page: ./get.sh <page url>
* after all: qpdf --empty --pages pdf/*.pdf -- result.pdf
