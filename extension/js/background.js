/** @license
 DJSON Viewer and Formatter | MIT License
 Copyright 2017 Dario De Santis

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

 */

(function () {

    "use strict";

    var obj,
        path,
        numChildClasses,
        pageDecorations,
        fns = {
            copyPath: function () {
                copy(path)
            },
            copyValue: function() {
                if(path && path.length > 1 && obj) {
                    var prop = path.substring(1);
                    if(path.charAt(1) === "."){
                        prop = prop.substring(1);
                    }
                    var result = Object.byString(obj, prop);
                    if(typeof result === "object"){
                        result = JSON.stringify(Object.byString(obj, prop));
                    }
                    copy(result);
                }
            },
            copyKey: function () {
                if(path && path.length > 1) {
                    if(path.slice(-1) === "]") {
                        path = path.replace(/\[\d\]$/, '');
                    }
                    if(path.length > 1) {
                        copy(path.substring(path.lastIndexOf(".") + 1));
                    }
                }
            },
            _viewJSON: function (info, stripSlashes) {
                if(typeof info.selectionText === "undefined") return;
                var str = info.selectionText;
                if(!str || str.length === 0) return;
                try {
                    if(stripSlashes) {
                        str = str.replace(/\\(.)/mg, "$1");
                    }
                    if( typeof JSON.parse(str) === "undefined" ) return;
                    openJsonTab(str);
                } catch (e) {}
            },
            viewJSON: function (info) {
                this._viewJSON(info, false);
            },
            viewStripedJSON: function (info) {
                this._viewJSON(info, true);
            }
        };

    // Constants
    var
        TYPE_STRING = 1,
        TYPE_NUMBER = 2,
        TYPE_OBJECT = 3,
        TYPE_ARRAY = 4,
        TYPE_BOOL = 5,
        TYPE_NULL = 6
        ;

    // URL regexes
    var
        URLREGEXES = {
            'uuid': "\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12}",
            'type': "[\\w-]+"
        },
        UUID_REGEX = "(\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12})";

    // Utility functions
    function removeComments(str) {
        str = ('__' + str + '__').split('');
        var mode = {
            singleQuote: false,
            doubleQuote: false,
            regex: false,
            blockComment: false,
            lineComment: false,
            condComp: false
        };
        for (var i = 0, l = str.length; i < l; i++) {
            if (mode.regex) {
                if (str[i] === '/' && str[i - 1] !== '\\') {
                    mode.regex = false;
                }
                continue;
            }
            if (mode.singleQuote) {
                if (str[i] === "'" && str[i - 1] !== '\\') {
                    mode.singleQuote = false;
                }
                continue;
            }
            if (mode.doubleQuote) {
                if (str[i] === '"' && str[i - 1] !== '\\') {
                    mode.doubleQuote = false;
                }
                continue;
            }
            if (mode.blockComment) {
                if (str[i] === '*' && str[i + 1] === '/') {
                    str[i + 1] = '';
                    mode.blockComment = false;
                }
                str[i] = '';
                continue;
            }
            if (mode.lineComment) {
                if (str[i + 1] === '\n' || str[i + 1] === '\r') {
                    mode.lineComment = false;
                }
                str[i] = '';
                continue;
            }
            if (mode.condComp) {
                if (str[i - 2] === '@' && str[i - 1] === '*' && str[i] === '/') {
                    mode.condComp = false;
                }
                continue;
            }
            mode.doubleQuote = str[i] === '"';
            mode.singleQuote = str[i] === "'";
            if (str[i] === '/') {
                if (str[i + 1] === '*' && str[i + 2] === '@') {
                    mode.condComp = true;
                    continue;
                }
                if (str[i + 1] === '*') {
                    str[i] = '';
                    mode.blockComment = true;
                    continue;
                }
                if (str[i + 1] === '/') {
                    str[i] = '';
                    mode.lineComment = true;
                    continue;
                }
                mode.regex = true;
            }
        }
        return str.join('').slice(2, -2);
    }

    function firstJSONCharIndex(s) {
        var arrayIdx = s.indexOf('['),
            objIdx = s.indexOf('{'),
            idx = 0
            ;
        if (arrayIdx !== -1) {
            idx = arrayIdx;
        }
        if (objIdx !== -1) {
            if (arrayIdx === -1) {
                idx = objIdx;
            } else {
                idx = Math.min(objIdx, arrayIdx);
            }
        }
        return idx;
    }

    // Template elements
    var baseSpan = document.createElement('span');

    function getSpanBoth(innerText, className) {
        var span = baseSpan.cloneNode(false);
        span.className = className;
        span.innerText = innerText;
        return span;
    }

    function getSpanClass(className) {
        var span = baseSpan.cloneNode(false);
        span.className = className;
        return span;
    }

    // Create template nodes
    var templatesObj = {
        t_dObj: getSpanClass('dObj'),
        t_exp: getSpanClass('expander'),
        t_key: getSpanClass('key'),
        t_string: getSpanClass('s'),
        t_number: getSpanClass('n'),
        t_nested: getSpanClass('nested'),

        t_null: getSpanBoth('null', 'nl'),
        t_true: getSpanBoth('true', 'bl'),
        t_false: getSpanBoth('false', 'bl'),

        t_oBrace: getSpanBoth('{', 'b'),
        t_cBrace: getSpanBoth('}', 'b lastB'),
        t_oBracket: getSpanBoth('[', 'b'),
        t_cBracket: getSpanBoth(']', 'b lastB'),

        t_ellipsis: getSpanClass('ellipsis'),
        t_blockInner: getSpanClass('blockInner'),

        t_colonAndSpace: document.createTextNode(':\u00A0'),
        t_commaText: document.createTextNode(','),
        t_dblqText: document.createTextNode('"')
    };

    // Core recursive DOM-building function
    function getdObjDOM(value, keyName, startCollapsed, isRoot, decorations) {
        var type,
            dObj,
            nonZeroSize,
            templates = templatesObj, // bring into scope for tiny speed boost
            objKey,
            keySpan,
            valueElement,
            dObjChildLength = 0
            ;

        // Establish value type
        if (typeof value === 'string') {
            type = TYPE_STRING;
        } else if (typeof value === 'number') {
            type = TYPE_NUMBER;
        } else if (value === false || value === true) {
            type = TYPE_BOOL;
        } else if (value === null) {
            type = TYPE_NULL;
        } else if (value instanceof Array) {
            type = TYPE_ARRAY;
        } else {
            type = TYPE_OBJECT;
        }

        // intercept decorations
        if ((type === TYPE_OBJECT) && (value.hasOwnProperty('bmDecorations'))) {
            try {
                // recurse with only the value
                return getdObjDOM(value['bmDecorations'].actualValue, keyName, startCollapsed, false, value.bmDecorations)
            } catch (e) {
                console.error(e)
            }
        }

        // Root node for this dObj
        dObj = templates.t_dObj.cloneNode(false);

        // Add an 'expander' first (if this is object/array with non-zero size)
        if (type === TYPE_OBJECT || type === TYPE_ARRAY) {
            nonZeroSize = false;
            for (objKey in value) {
                if (value.hasOwnProperty(objKey)) {
                    nonZeroSize = true;
                    break; // no need to keep counting; only need one
                }
            }
            if (nonZeroSize) {
                dObj.appendChild(templates.t_exp.cloneNode(false));
            }
        }

        // If there's a key, add that before the value
        if (keyName !== false) { // NB: "" is a legal keyname in JSON
            // This dObj must be an object property
            dObj.classList.add('dObjProp');
            // Create a span for the key name
            keySpan = templates.t_key.cloneNode(false);
            keySpan.textContent = JSON.stringify(keyName).slice(1, -1); // remove quotes
            // Add it to dObj, with quote marks
            dObj.appendChild(templates.t_dblqText.cloneNode(false));
            dObj.appendChild(keySpan);
            dObj.appendChild(templates.t_dblqText.cloneNode(false));
            // Also add ":&nbsp;" (colon and non-breaking space)
            dObj.appendChild(templates.t_colonAndSpace.cloneNode(false));
        }
        else {
            // This is an array element instead
            dObj.classList.add('arrElem');
        }

        // Generate DOM for this value
        var blockInner, childdObj;
        switch (type) {
            case TYPE_STRING:
                // If string is a URL, get a link, otherwise get a span
                var innerStringEl = baseSpan.cloneNode(false),
                    escapedString = JSON.stringify(value)
                    ;
                escapedString = escapedString.substring(1, escapedString.length - 1); // remove quotes
                if (value.charAt(0) === 'h' && value.substring(0, 4) === 'http') { // crude but fast - some false positives, but rare, and UX doesn't suffer terribly from them.
                    var innerStringA = document.createElement('A');
                    innerStringA.href = value;
                    innerStringA.innerText = escapedString;
                    innerStringEl.appendChild(innerStringA);
                }
                // Add a link if the decorations stipulate one
                if (decorations && decorations.hasOwnProperty('href')) {
                  var innerStringA = document.createElement('A');
                  innerStringA.href = decorations.href;
                  innerStringA.innerText = escapedString;
                  innerStringEl.appendChild(innerStringA);
                }
                else {
                    innerStringEl.innerText = escapedString;
                }

                if (decorations && decorations.hasOwnProperty('classnames')) {
                    //innerStringEl.classList = innerStringEl.classList.add.apply(innerStringEl.classList, decorations['classnames']);
                    innerStringEl.classList.add.apply(innerStringEl.classList, decorations['classnames']);
                }

                valueElement = templates.t_string.cloneNode(false);
                valueElement.appendChild(templates.t_dblqText.cloneNode(false));
                valueElement.appendChild(innerStringEl);
                valueElement.appendChild(templates.t_dblqText.cloneNode(false));

                // check if is nested json
                try {
                    if( (value.charAt(0) === '{' || value.charAt(0) === '[') && typeof JSON.parse(escapedString.replace(/\\(.)/mg, "$1")) !== "undefined" ) {
                        valueElement.appendChild(templates.t_nested.cloneNode(false));
                    }
                } catch (e){}

                dObj.appendChild(valueElement);
                break;

            case TYPE_NUMBER:
                // Simply add a number element (span.n)
                valueElement = templates.t_number.cloneNode(false);
                valueElement.innerText = value;
                dObj.appendChild(valueElement);
                break;

            case TYPE_OBJECT:
                // Add opening brace
                dObj.appendChild(templates.t_oBrace.cloneNode(true));
                // If any properties, add a blockInner containing k/v pair(s)
                if (nonZeroSize) {
                    // Add ellipsis (empty, but will be made to do something when dObj is collapsed)
                    dObj.appendChild(templates.t_ellipsis.cloneNode(false));
                    // Create blockInner, which indents (don't attach yet)
                    blockInner = templates.t_blockInner.cloneNode(false);
                    // For each key/value pair, add as a dObj to blockInner
                    var count = 0, k, comma;
                    for (k in value) {
                        if (value.hasOwnProperty(k)) {
                            count++;
                            childdObj = getdObjDOM(value[k], k, startCollapsed, false);
                            // Add comma
                            comma = templates.t_commaText.cloneNode(false);
                            childdObj.appendChild(comma);
                            blockInner.appendChild(childdObj);
                        }
                    }
                    dObjChildLength = count;
                    // Now remove the last comma
                    childdObj.removeChild(comma);
                    // Add blockInner
                    dObj.appendChild(blockInner);
                }

                // Add closing brace
                dObj.appendChild(templates.t_cBrace.cloneNode(true));
                break;

            case TYPE_ARRAY:
                // Add opening bracket
                dObj.appendChild(templates.t_oBracket.cloneNode(true));
                // If non-zero length array, add blockInner containing inner vals
                if (nonZeroSize) {
                    // Add ellipsis
                    dObj.appendChild(templates.t_ellipsis.cloneNode(false));
                    // Create blockInner (which indents) (don't attach yet)
                    blockInner = templates.t_blockInner.cloneNode(false);
                    // For each key/value pair, add the markup
                    dObjChildLength = value.length;
                    for (var i = 0, lastIndex = dObjChildLength - 1; i < dObjChildLength;
                         i++) {
                        // Make a new dObj, with no key
                        childdObj = getdObjDOM(value[i], false, startCollapsed, false);
                        // Add comma if not last one
                        if (i < lastIndex) {
                            childdObj.appendChild(templates.t_commaText.cloneNode(false));
                        }
                        // Append the child dObj
                        blockInner.appendChild(childdObj);
                    }
                    // Add blockInner
                    dObj.appendChild(blockInner);
                }
                // Add closing bracket
                dObj.appendChild(templates.t_cBracket.cloneNode(true));
                break;

            case TYPE_BOOL:
                if (value) {
                    dObj.appendChild(templates.t_true.cloneNode(true));
                } else {
                    dObj.appendChild(templates.t_false.cloneNode(true));
                }
                break;

            case TYPE_NULL:
                dObj.appendChild(templates.t_null.cloneNode(true));
                break;
        }

        if (dObjChildLength > 0) {
            if(typeof startCollapsed !== "undefined" && startCollapsed != null && !isRoot) {
                dObj.classList.add('collapsed');
            }
            dObj.classList.add('numChild' + dObjChildLength);
            numChildClasses[dObjChildLength] = 1;
        }

        // add additional links/buttons if relevant
        if (decorations && decorations.hasOwnProperty('related')) {
            var links = relatedDecorationsToDOM(decorations['related']);

            dObj.appendChild(links)
        }
        return dObj;
    }

    // Function to convert object to an HTML string
    function jsonObjToHTML(obj, jsonpFunctionName, startCollapsed) {
        // reset number of children
        numChildClasses = {};
        pageDecorations = {};

        // extract page decorations
        if (obj.hasOwnProperty('__bmPageDecorations')) {
            pageDecorations = obj['__bmPageDecorations'];
            delete obj['__bmPageDecorations'];
        }

        // Format object (using recursive dObj builder)
        var rootDObj = getdObjDOM(obj, false, startCollapsed, true);

        // The whole DOM is now built.

        // Set class on root node to identify it
        rootDObj.classList.add('rootDObj');

        // Make div#formattedJson and append the root dObj
        var divFormattedJson = document.createElement('DIV');
        divFormattedJson.id = 'formattedJson';
        divFormattedJson.appendChild(rootDObj);

        // Convert it to an HTML string (shame about this step, but necessary for passing it through to the content page)
        var returnHTML = divFormattedJson.outerHTML;

        // Add page decorations
        if (pageDecorations) {
            var divPageHeader = document.createElement('DIV');
            divPageHeader.classList.add('jsonHeader');

            // add title
            if (pageDecorations.hasOwnProperty('pagetitle')) {
                var title = document.createElement('H1');
                title.innerText = pageDecorations.pagetitle;
                divPageHeader.appendChild(title);
            }

            // add breadcrumbs
            var breadcrumbs = document.createElement('DIV');
            breadcrumbs.classList.add('breadcrumbs');
            // parse it
            var crumbs = pageDecorations.pagepath.split('/');

            // we replace each with a new element
            crumbs = crumbs.forEach(function(c, i, all) {
                var crumbSpan = undefined;
                // find it in the page decorations, from the related array
                var relIndex = pageDecorations['related'].findIndex(function(r) {
                    return r['title'] === c
                });
                if (relIndex>=0) {
                    crumbSpan = document.createElement('A');
                    crumbSpan.href = pageDecorations['related'][relIndex]['href'];
                } else {
                    crumbSpan = document.createElement('SPAN');
                }
                crumbSpan.classList.add('crumb');
                crumbSpan.innerText = c;

                // and add to the trail
                breadcrumbs.appendChild(crumbSpan);
                if (i < all.length-1) {
                    breadcrumbs.appendChild(getSpanBoth('/','slash'));
                }

                // and finally remove that related item
                pageDecorations['related'].splice(relIndex,1);
            });
            divPageHeader.appendChild(breadcrumbs);

            // add related objects
            if (pageDecorations.hasOwnProperty('related')) {
                var headerLinks = document.createElement('DIV');
                headerLinks.classList.add('headerLinks');
                divPageHeader.appendChild(headerLinks);

                var links = relatedDecorationsToDOM(pageDecorations['related']);
                headerLinks.appendChild(links);
            }
            returnHTML = divPageHeader.outerHTML + returnHTML;
        }

        // Top and tail with JSONP padding if necessary
        if (jsonpFunctionName !== null) {
            returnHTML =
                '<div id="jsonpOpener">' + jsonpFunctionName + ' ( </div>' +
                returnHTML +
                '<div id="jsonpCloser">)</div>';
        }

        // Return the HTML
        return returnHTML;
    }

    function relatedDecorationsToDOM(decorations) {
        // we group them
        var groups = decorations.reduce(function (acc, d) {
            var name = d.group || "none";
            acc[name] = acc[name] || [];
            acc[name].push(d);
            return acc;
        }, Object.create(null));

        var links = getSpanClass('links');

        // we iterate through the groups to render them
        Object.keys(groups).forEach(function(k) {
            // an element for the group of links
            var linkgroup;
            if (k !== "none") {
                // we add a title for the group
                linkgroup = getSpanClass('group');
                var title = getSpanClass('title');
                title.innerText = k;
                linkgroup.appendChild(title);
                links.appendChild(linkgroup);
            } else {
                linkgroup = links;
            }

            // to which we add the various links
            for (let rel of groups[k]) {
                if (rel.hasOwnProperty('show-if-exists')) {
                    // skip if the value is useless
                    if (hasNoValue(rel['show-if-exists'])) {
                        continue;
                    }
                }

                var button;
                if (rel.hasOwnProperty('href')) {
                    button = document.createElement('A');
                    button.href = rel['href'];
                } else {
                    button = getSpanClass('info')
                }
                button.innerText = rel["title"];

                // we add a suffix value if there is one
                if (rel.hasOwnProperty('suffix')) {
                    button.innerText += ": ";
                    var val = getSpanClass('suffix');
                    val.innerText = rel.suffix;
                    button.appendChild(val);

                    // we evaluate that value to define the element's class
                    if (rel.suffix.match('error|ERROR')) {
                        button.classList.add("error");
                    } else if (rel.suffix.match('invalid')) {
                        button.classList.add("invalid");
                    } else
                        if (hasNoValue(rel.suffix)) {
                        button.classList.add("null");
                    }
                }

                // if other classes are defined, we use them
                if (rel.hasOwnProperty('classname')) {
                    button.classList.add(rel.classname)
                }
                linkgroup.appendChild(button);
            }
        });
        return links
    }

    /*console.log(isMatchingUrl(
        "/fdhjfhs/d17b22c0-a1e7-418a-a19d-92dd6a6328af/fdfs/d17b22c0-a1e7-418a-a19d-92dd6a6328af/fmp4/{t}",
        "/fdhjfhs/{stra:uuid}/{gla:type}/{bla:uuid}/{type}/.*"));
    */
    function isMatchingUrl(thisUrl, candidate) {
        var varnames = [];
        // extract variable placeholders and replace them to create a full regex
        var rx = candidate.replace(/({((\w+?):)?(\w+)})/g, function(n, p1, p2, p3, p4) {
            // each extracted placeholder can have multiple names
            var names = ["url_" + varnames.length];
            if (p3) {
                names.push(p3);
            }
            varnames.push(names);

            // and we replace it with the appropriate sub-regex
            if (URLREGEXES[p4]) {
                return "(" + URLREGEXES[p4] + ")";
            } else {
                return n
            }
        });

        // test the Regex on the URL
        var mat = thisUrl.match(new RegExp(rx));

        if (!mat) {
            return null
        } else {
            // assign variable values
            var variables = {};
            for (let i=0; i < varnames.length; i++) {
                if (varnames[i]) {
                    // it's an array of names
                    for (let n of varnames[i]) {
                        variables[n] = mat[i+1]
                    }
                }
            }
            return variables;
        }
    }

    function hasNoValue(str) {
        return ['0', 'undefined', 'null', 'false', "", '[]'].includes(str);
    }

    function copy(value) {
        if(value && (typeof value === "number" || value.length > 0)){
            var selElement, selRange, selection;
            selElement = document.createElement("span");
            selRange = document.createRange();
            selElement.innerText = value;
            document.body.appendChild(selElement);
            selRange.selectNodeContents(selElement);
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(selRange);
            document.execCommand("Copy");
            document.body.removeChild(selElement);
        }
    }

    function createContextMenu() {
        var swallowErorrs = function(){
            var err = chrome.runtime.lastError;
            if(err && err.hasOwnProperty('message') && err.message.indexOf('Cannot create item with duplicate id') === -1) {
                console.warn('Context menu error ignored:', err);
            }
        };

        chrome.contextMenus.create({
            title : "DJSON",
            id: "djson",
            contexts : [ "page", "selection", "link" ]
        }, swallowErorrs);

        chrome.contextMenus.create({
            title : "Copy Value",
            id: "copyValue",
            parentId: "djson",
            contexts : [ "page", "selection", "link" ]
        }, swallowErorrs);

        chrome.contextMenus.create({
            title : "Copy Key",
            id: "copyKey",
            parentId: "djson",
            contexts : [ "page", "selection", "link" ]
        }, swallowErorrs);

        chrome.contextMenus.create({
            title : "Copy Path",
            id: "copyPath",
            parentId: "djson",
            contexts : [ "page", "selection", "link" ]
        }, swallowErorrs);

        chrome.contextMenus.create({
            title : "View JSON",
            id: "viewJSON",
            parentId: "djson",
            contexts : [ "selection" ]
        }, swallowErorrs);

        chrome.contextMenus.create({
            title : "View JSON (Strip slashes)",
            id: "viewStripedJSON",
            parentId: "djson",
            contexts : [ "selection" ]
        }, swallowErorrs);
    }

    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        fns[info.menuItemId](info);
    });

    function openJsonTab(json) {
        var viewTabUrl = chrome.extension.getURL('json.html');
        chrome.tabs.query({active: true}, function (tabs) {
            var index = tabs[0].index;
            chrome.tabs.create({url: viewTabUrl, active: true, index: index + 1}, function (tab) {
                chrome.tabs.executeScript(tab.id, {file: "js/content.js", runAt: "document_start"}, function () {
                    chrome.tabs.sendMessage(tab.id, {json: json});
                });
            });
        });
    }

    function loadBitmovinApiJSON(callback) {
        var path = chrome.runtime.getURL("resources/bitmovin-api-mapping.json");
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', path, true); // Replace 'my_data' with the path to your file
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                callback(xobj.responseText);
            }
        };
        xobj.send(null);
    }

    function decorateBitmovinJson(json, callback) {
        var makeXhrCalls = localStorage.getItem('makeRelatedXhrCalls') || false;

        loadBitmovinApiJSON(function(definition) {
            var def = JSON.parse(definition);
            console.log("Bitmovin API Definition", def);

            // find relevant URL
            chrome.tabs.query({currentWindow: true, active: true}, async function (tabs) {
                var thisUrl = tabs[0].url;

                var nodeDecorations = {};  // hash table of decoration objects, with application path as key
                var pageExtracts = {};

                // we go through every relevant page definition
                for (let pagedef of def.pages) {
                    // test the URL and return extracted variables
                    var thisUrlExtracts = isMatchingUrl(thisUrl, pagedef.url);
                    if (!thisUrlExtracts) {
                        continue;
                    }
                    pageExtracts = Object.assign(thisUrlExtracts, pageExtracts);

                    // record it for later
                    var pageRelativePath = nodeDecorations['$'] || getBitmovinDecoration();
                    var path = resolvePlaceholders(pagedef.url, pageExtracts, 'url');
                    pageRelativePath = addBitmovinDecoration(pageRelativePath, 'pagepath', path);
                    nodeDecorations['$'] = pageRelativePath;

                    console.log(`Processing definition for page: ${pagedef.url}`);
                    var context = {pageUrl: thisUrl};

                    // we extract page variables
                    var thisPageExtracts = {};
                    if (pagedef.hasOwnProperty('variables')) {
                        thisPageExtracts = await extractVariables(context, pagedef.variables, json);
                        pageExtracts = Object.assign(thisPageExtracts, pageExtracts)
                    }

                    // we process the page title
                    if (pagedef.hasOwnProperty('title')) {
                        var pagetitle = nodeDecorations['$'] || getBitmovinDecoration();
                        var title = resolvePlaceholders(pagedef.title, pageExtracts);
                        pagetitle = addBitmovinDecoration(pagetitle, 'pagetitle', title);
                        nodeDecorations['$'] = pagetitle;
                    }

                    // from this, there are 1 or more re-mappings to perform
                    if (pagedef.hasOwnProperty('mappings')) {
                        for (let mapdef of pagedef.mappings) {
                            console.log(`Processing re-mapping: ${mapdef.description}`);

                            // we use JSON path to find relevant nodes in the JSON payload
                            var nodes = jsonpath.nodes(json, mapdef.jsonpath);

                            // we iterate through the nodes
                            for (let node of nodes) {
                                var nodePath = jsonpath.stringify(node.path);

                                // we add contextual info to the node
                                node = Object.assign(node, context);

                                // We extract (and possibly overwrite) all additional relevant variables
                                var extracts = await extractVariables(node, mapdef.variables, json);
                                extracts = Object.assign(extracts, pageExtracts);

                                var targetUrl = "";
                                if (mapdef['target'] && mapdef['target']['url']) {
                                    // replace all placeholders by the extracted value
                                    var resolvedUrl = resolvePlaceholders(mapdef['target']['url'], extracts);
                                    targetUrl = createBitmovinApiURL(thisUrl, resolvedUrl, false);

                                    // some variables may have to be extracted from the target URL
                                    var xhrResponse = {};
                                    if (makeXhrCalls && mapdef['target']['variables']) {
                                        try {
                                            // Pre-request the URL
                                            xhrResponse = await requestBitmovinApiURL(targetUrl);
                                        } catch (e) {
                                        }
                                        var targetExtracts = await extractVariables(node, mapdef['target']['variables'], xhrResponse);
                                        extracts = Object.assign(extracts, targetExtracts)
                                    }
                                }

                                // Generate the decoration
                                // we find or generate a decoration template
                                var deco;
                                if (nodeDecorations.hasOwnProperty(nodePath)) {
                                    deco = nodeDecorations[nodePath];
                                } else {
                                    deco = getBitmovinDecoration(extracts['value']);
                                }

                                // ... and add the relevant decorations
                                var resolved = {};
                                if (mapdef.title) {
                                    resolved['title'] = resolvePlaceholders(mapdef.title, extracts)
                                }
                                if (mapdef.group) {
                                    resolved['group'] = mapdef.group
                                }

                                // ... and add any presentation information
                                if (mapdef['presentation']) {
                                    Object.keys(mapdef['presentation']).forEach(function (p) {
                                        resolved[p] = resolvePlaceholders(mapdef['presentation'][p], extracts)
                                    })
                                }

                                // add other decorations based on the type defined
                                switch (mapdef.type) {
                                    case "href":
                                        deco = addBitmovinDecoration(deco, "href", targetUrl);
                                        break;

                                    case "related":
                                        if (targetUrl != "") {
                                            resolved['href'] = targetUrl;
                                        }

                                        // Generate a decoration
                                        deco = addBitmovinDecoration(deco, "related", resolved);
                                        break;

                                    case "highlight":
                                        deco = addBitmovinDecoration(deco, "cssclass", resolved);
                                }

                                // and we add the decoration to the dictionary, with the path being the key
                                nodeDecorations[jsonpath.stringify(node.path)] = deco;

                            }
                        }
                    }
                } // end of pagedef processing

                // When all is done, we apply all the decorations to the JSON node
                console.log("Decorations:", nodeDecorations);

                // Needs to apply from trees to root (most specific first) to avoid overwrites
                // that would invalidate JSON paths
                var paths = Object.keys(nodeDecorations);
                paths = paths.sort(function (p1, p2) {
                    return (jsonpath.parse(p2).length - jsonpath.parse(p1).length);
                });
                console.log("Order of application:", paths);

                paths.forEach(function (p) {
                    // special treatment for root, due to bug in jsonpath and not wanting to modify the root object
                    if (p === '$') {
                        json['__bmPageDecorations'] = nodeDecorations[p]
                    } else {
                        jsonpath.value(json, p, {'bmDecorations': nodeDecorations[p]});
                    }
                });

                callback(json);

                return true;
            })
        })
    }

    async function extractVariables(context, variableDefinitions, fulljson) {
        // ... extract some variables
        var extracts = {};
        if (context.hasOwnProperty('value')) {
            extracts['value'] = context.value;
        }
        if (context.hasOwnProperty('path')) {
            extracts['path'] = context.path;
            extracts['jsonpath'] = jsonpath.stringify(context.path);
        }

        // some of which need extra processing
        if (variableDefinitions) {
            for (let vardef of variableDefinitions) {
                var value;
                switch (vardef.type) {
                    case "url":
                        // extract a component from the page URL
                        var rx = vardef.regex.replace("{uuid}", UUID_REGEX);
                        var res = context.pageUrl.match(rx);
                        if (res) {
                            value = res[1];
                        }
                        break;

                    case "xhr":
                        // prepare URL to call
                        var urltocall = resolvePlaceholders(vardef.url, extracts);
                        urltocall = createBitmovinApiURL(context.pageUrl, urltocall, false);
                        // make the call and parse the result
                        var response = await requestBitmovinApiURL(urltocall);
                        value = jsonpath.value(response, vardef.jsonpath);

                        break;

                    case "sibling":
                        // extract a sibling node
                        // create a copy of the path and replace the last element
                        var siblingpath = extracts['path'].slice();
                        siblingpath.pop();
                        siblingpath.push(vardef.key);
                        siblingpath = jsonpath.stringify(siblingpath);
                        value = jsonpath.value(fulljson, siblingpath);
                        break;

                    case "jsonpath":
                        // extract a value from the payload
                        value = jsonpath.value(fulljson, vardef.jsonpath);
                        break;
                }

                // reformat the response accordingly
                if (vardef.transformation) {
                    value = reformatValues(value, vardef.transformation)
                }
                extracts[vardef.name] = value;
            }
        }
        return extracts
    }

    function getBitmovinDecoration(actualValue) {
        var deco = {
            "related": [],
            "classnames": []
        };
        if (actualValue) {
            // pass the actual value down
            deco['actualValue'] = actualValue;
        }

        return deco
    }

    function addBitmovinDecoration(deco, type, info) {
        switch (type) {
            case "href":
                deco['href'] = info;
                break;

            case "related":
                deco['related'].push(info);
                break;

            case "cssclass":
                deco['classnames'].push(info.highlight);
                break;

            default:
                deco[type] = info;
        }
        return deco;
    }

    function createBitmovinApiURL(fromurl, path) {
        var apikey, orgid;
        // get api and org IDs
        var res1 = fromurl.match("X-Api-Key=" + UUID_REGEX);
        if (res1) {
            apikey = res1[1]
        }

        var res2 = fromurl.match("X-Tenant-Org-Id=" + UUID_REGEX);
        if (res2) {
            apikey = res2[1]
        }

        var newurl;
        newurl = "https://api.bitmovin.com/v1";
        newurl += path;
        if (path.search(/\?/) === -1) {
            newurl += "?"
        } else {
            newurl += "&"
        }

        if (apikey) {
            newurl += "X-Api-Key=" + apikey
        }
        if (orgid) {
            newurl += "&X-Tenant-Org-Id=" + orgid
        }

        return newurl
    }

    function requestBitmovinApiURL(url) {
        return new Promise(function(resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.response))
                    } else {
                        reject(xhr.status)
                    }
                }
            }
            xhr.ontimeout = function () {
                reject('timeout')
            }
            xhr.open('get', url, true)
            xhr.send()
        })
    }

    function resolvePlaceholders(string, variables, type) {
        /*return string.replace(/\{\w+\}/g, function(match) {
            var varname = match.substr(1, match.length-2);
            return variables[varname]
        });*/
        var i = -1;
        var res = string.replace(/({(\w+?)(:(\w+))?})/g, function(n, p1, p2, p3, p4) {
            i++;
            var varname = p2;
            if (variables.hasOwnProperty(varname)) {
                return variables[varname]
            } else if (type === 'url'){
                return variables['url_' + i];
            }
        });
        // we remove other parts of regex that may remain in the case of URL patterns
        if (type === 'url') {
            res = res.replace(/\(.*?\)/, '');
        }
        return res;
    }

    function reformatValues(value, method) {
        switch (method) {
            case "lowerCase":
                value = value.toLowerCase();
                return value.replace(/_/g,'-');
                break;

            case "codecType":
                var t = value.toLowerCase();
                var audio = ['aac', 'he-aac-v1', 'he-aac-v2', 'vorbis', 'opus', 'ac3', 'eac3', 'mp2', 'mp3'];
                var video = ['h264', 'h265', 'vp8', 'vp9', 'av1', 'mjpeg'];
                if (audio.includes(t)) {
                    return "audio/" + t
                }
                if (video.includes(t)) {
                    return "video/" + t
                }
                break;

            case "count":
                if (typeof value === 'number') {
                    return value
                } else {
                    try {
                        return value.length
                    } catch (e) {
                        return 'invalid'
                    }
                }
                break;

            case "boolean": {
                if (value) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    }

    // Listen for requests from content pages wanting to set up a port
    chrome.extension.onConnect.addListener(function (port) {

        if (port.name !== 'djson') {
            console.log('DJSON Viewer error - unknown port name ' + port.name, port);
            return;
        }

        port.onMessage.addListener(function (msg) {
            var jsonpFunctionName = null,
                validJsonText
                ;

            if (msg.type === 'OPEN JSON TAB') {
                openJsonTab(msg.json);
            }

            else if (msg.type === 'OPEN OPTION TAB') {
                var viewTabUrl = chrome.extension.getURL('options.html');
                chrome.tabs.query({url: viewTabUrl, currentWindow: true}, function (tabs) {
                    var tabLenght = tabs.length;
                    if (tabLenght > 0) {
                        chrome.tabs.update(tabs[0].id, {'active': true});
                    } else {
                        chrome.tabs.query({active: true}, function (tabs) {
                            var index = tabs[0].index;
                            chrome.tabs.create({url: viewTabUrl, active: true, index: index + 1});
                        });
                    }
                });
            }

            else if (msg.type === 'VIEW NESTED') {
                var prop = msg.path.substring(1);
                if(msg.path.charAt(1) === "."){
                    prop = prop.substring(1);
                }
                var result = Object.byString(msg.obj, prop);
                openJsonTab(result);
            }

            else if (msg.type === 'SENDING TEXT') {
                // Try to parse as JSON
                var text = msg.text;

                // Strip any leading garbage, such as a 'while(1);'
                var strippedText = text.substring(firstJSONCharIndex(text));

                try {
                    obj = JSON.parse(strippedText);
                    validJsonText = strippedText;
                }
                catch (e) {

                    // Not JSON; could be JSONP though.
                    // Try stripping 'padding' (if any), and try parsing it again
                    text = text.trim();
                    // Find where the first paren is (and exit if none)
                    var indexOfParen;
                    if (!(indexOfParen = text.indexOf('(') )) {
                        port.postMessage(['NOT JSON', 'no opening parenthesis']);
                        port.disconnect();
                        return;
                    }

                    // Get the substring up to the first "(", with any comments/whitespace stripped out
                    var firstBit = removeComments(text.substring(0, indexOfParen)).trim();
                    if (!firstBit.match(/^[a-zA-Z_$][\.\[\]'"0-9a-zA-Z_$]*$/)) {
                        // The 'firstBit' is NOT a valid function identifier.
                        port.postMessage(['NOT JSON', 'first bit not a valid function name']);
                        port.disconnect();
                        return;
                    }

                    // Find last parenthesis (exit if none)
                    var indexOfLastParen;
                    if (!(indexOfLastParen = text.lastIndexOf(')') )) {
                        port.postMessage(['NOT JSON', 'no closing paren']);
                        port.disconnect();
                        return;
                    }

                    // Check that what's after the last parenthesis is just whitespace, comments, and possibly a semicolon (exit if anything else)
                    var lastBit = removeComments(text.substring(indexOfLastParen + 1)).trim();
                    if (lastBit !== "" && lastBit !== ';') {
                        port.postMessage(
                            ['NOT JSON', 'last closing paren followed by invalid characters']);
                        port.disconnect();
                        return;
                    }

                    // So, it looks like a valid JS function call, but we don't know whether it's JSON inside the parentheses...
                    // Check if the 'argument' is actually JSON (and record the parsed result)
                    text = text.substring(indexOfParen + 1, indexOfLastParen);
                    try {
                        obj = JSON.parse(text);
                        validJsonText = text;
                    }
                    catch (e2) {
                        // Just some other text that happens to be in a function call.
                        // Respond as not JSON, and exit
                        port.postMessage(['NOT JSON',
                                          'looks like a function call, but the parameter is not valid JSON']);
                        return;
                    }

                    jsonpFunctionName = firstBit;
                }

                // If still running, we now have obj, which is valid JSON.

                // Ensure it's not a number or string (technically valid JSON, but no point prettifying it)
                if (typeof obj !== 'object') {
                    port.postMessage(['NOT JSON', 'technically JSON but not an object or array']);
                    port.disconnect();
                    return;
                }

                // And send it the message to confirm that we're now formatting (so it can show a spinner)
                port.postMessage(['FORMATTING', JSON.stringify(localStorage)]);

                // Decorate the JSON response with Bitmovin API specific information
                window.undecoratedJSON = obj;
                decorateBitmovinJson(obj, function(newobj) {
                    window.decoratedJSON = newobj;

                    // Do formatting
                    var startCollapsed = localStorage.getItem('startCollapsed') || (localStorage.getItem('startCollapsedIfBig') && text.length > 1000000)
                    var html = jsonObjToHTML(newobj, jsonpFunctionName, localStorage.getItem('startCollapsed'));

                    // Post the HTML string to the content script
                    port.postMessage(['FORMATTED', html, validJsonText, JSON.stringify(localStorage), JSON.stringify(Object.keys(numChildClasses))]);
                });
            }

            else if (msg.type === 'COPY PATH') {
                path = msg.path;
                obj = msg.obj;
            }
        });
    });

    // on app update show change log
    chrome.runtime.onInstalled.addListener(function(details) {
        if(details.reason === "update") {
            chrome.tabs.create({url: chrome.extension.getURL('changelog.html'), active: true});
        }
    });

    createContextMenu();

    Object.byString = function(o, s) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        var a = s.split('.');
        for (var i = 0, n = a.length; i < n; ++i) {
            var k = a[i];
            if (k in o) {
                o = o[k];
            } else {
                return;
            }
        }
        return o;
    }
}());