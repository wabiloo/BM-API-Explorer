![JSONViewer Logo](https://github.com/wabiloo/BM-API-Explorer/raw/master/extension/icons/128.png)

Bitmovin API Explorer
==============

Chrome extension for exploring and navigating Bitmovin APIs in a browser tab.
Also quite useful for printing and formatting any JSON and JSONP nicely directly.

Based on the quite excellent [dardesantis DJSON-Viewer](https://github.com/dardesantis/DJSON-Viewer), itself based off the formatter from: [callumlocke json-formatter](https://github.com/callumlocke/json-formatter)
Makes heavy use of [dchester JSONPath](https://github.com/dchester/jsonpath)

Features
--------
* Beautify the Bitmovin API JSON responses
* Decorates them with various links to navigate to related objects
* Optionally calls links to extract information about related objects
* All decorations and mappings flexibly configured through a JSON file

The following are the original features from [dardesantis DJSON-Viewer](https://github.com/dardesantis/DJSON-Viewer):
* Format JSON and JSONP input or responses
* Minify or Beautify JSON
* Theme support
* Syntax highlighting
* Collapsible trees, with indent guides
* Recursive collapsible elements
* Clickable URLs
* Toggle between raw and parsed JSON
* Works on any valid JSON page – URL doesn't matter
* Works on local files too (if you enable this in `chrome://extensions`)
* You can inspect the JSON by typing `djson` in the console
* Counts items and properties in a collection
* Show JSON path of the elements on hover and copy it with the context menu
* Option to start with JSON collapsed (always or if the file is big)
* Recognize nested JSON strings in properties value

A background worker is used to prevent the UI freezing when processing very long JSON pages.

Installation
------------

**Option 1** – install it from source:

* clone/download this repo,
* open Chrome and go to `chrome://chrome/extensions/`,
* enable "Developer mode",
* click "Load unpacked extension",
* select the `extension` folder in this repo.

**Option 2** - Nope, not at this stage... ;)

Pro Tip
--------
* Hold down control (or cmd on Mac) while collapsing a tree if you want to collapse all its siblings too.
* Hold down shift while collapsing a tree if you want to collapse also all his children

FAQ
---
* Go to the extension options (gears in the top right corner) to disable XHR calls if the formatting is too slow for large JSON payloads

LICENCE
-------
Bitmovin API Explorer | MIT License

Copyright for portions of this code are held by [Dario De Santis, 2017] as part of project [DJSON-Viewer](https://github.com/dardesantis/DJSON-Viewer). 
All other copyright for this code are held by [Fabre Lambeau, 2019].

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.