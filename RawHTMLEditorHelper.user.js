// ==UserScript==
// @name         Raw HTML Editor Helper
// @namespace    http://tampermonkey.net/
// @version      2026-01-27
// @description  Help detect certain parts of HTML quicker in the raw HTML editor.
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*/edit
// @match        https://byuis.instructure.com/courses/*/edit
// @match        https://byuismastercourses.instructure.com/courses/*/edit
// @match        https://byuohs.instructure.com/courses/*/edit
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @grant        none
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/RawHTMLEditorHelper.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/RawHTMLEditorHelper.user.js
// ==/UserScript==

(function () {
    "use strict";

    const SEARCH_PATTERNS = [
        { regex: /aria-label=&quot;(?:[^&]|&(?:quot|amp|#39);)*?&quot;/gi, style: "background: rgba(0,255,204,0.4);" },
        { regex: /title=&quot;(?:[^&]|&(?:quot|amp|#39);)*?&quot;/gi, style: "background: rgba(255,164,0,0.45);" },
        { regex: /aria-description=&quot;(?:[^&]|&(?:quot|amp|#39);)*?&quot;/gi, style: "background: rgba(255,0,0,0.30);" },
        { regex: /alt=&quot;(?:[^&]|&(?:quot|amp|#39);)*?&quot;/gi, style: "background: rgba(0, 255, 90, 0.35);" },
        { regex: /&lt;table\b(?:[^&]|&(?:quot|amp|#39);)*?&gt;/gi, style: "background: rgba(255,219,0,0.45);" },
        { regex: /&lt;h1\b[\s\S]*?&gt;[\s\S]*?&lt;\/h1&gt;/gi, style: "background: rgba(128,0,128,0.55);" },
        { regex: /&lt;h2\b[\s\S]*?&gt;[\s\S]*?&lt;\/h2&gt;/gi, style: "background: rgba(128,0,128,0.43);" },
        { regex: /&lt;h3\b[\s\S]*?&gt;[\s\S]*?&lt;\/h3&gt;/gi, style: "background: rgba(128,0,128,0.35);" },
        { regex: /&lt;h4\b[\s\S]*?&gt;[\s\S]*?&lt;\/h4&gt;/gi, style: "background: rgba(128,0,128,0.28);" },
        { regex: /&lt;h5\b[\s\S]*?&gt;[\s\S]*?&lt;\/h5&gt;/gi, style: "background: rgba(128,0,128,0.2);" },
        { regex: /&lt;h6\b[\s\S]*?&gt;[\s\S]*?&lt;\/h6&gt;/gi, style: "background: rgba(128,0,128,0.15);" }
    ];

    function enhanceTextarea(textarea) {
        if (textarea.dataset.overlayHighlight) return;
        textarea.dataset.overlayHighlight = "true";

        const style = getComputedStyle(textarea);

        // --- wrapper ---
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "block";
        wrapper.style.width = "100%";
        wrapper.style.boxSizing = "border-box";

        // Make textarea transparent and layer above overlays
        textarea.style.position = "relative";
        textarea.style.zIndex = "100";
        textarea.style.background = "transparent";

        // Insert wrapper into DOM
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);

        // --- SEARCH UI ---
        const searchState = { term: "", ranges: [], index: -1 };
        const searchBar = document.createElement("div");
        searchBar.style.position = "absolute";
        searchBar.style.top = "-30px";
        searchBar.style.right = "0";
        searchBar.style.display = "flex";
        searchBar.style.alignItems = "center";
        searchBar.style.gap = "4px";
        searchBar.style.fontSize = "12px";
        searchBar.style.zIndex = "200";

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Find…";
        searchInput.style.width = "140px";
        searchInput.style.padding = "2px 4px";

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "▲";
        prevBtn.type = "button";

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "▼";
        nextBtn.type = "button";

        const counter = document.createElement("span");
        counter.textContent = "0 / 0";

        searchBar.append(searchInput, prevBtn, nextBtn, counter);
        wrapper.appendChild(searchBar);

        const mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.wordWrap = "break-word";
        mirror.style.overflowWrap = "break-word";
        mirror.style.boxSizing = "border-box";

        mirror.style.fontFamily = style.fontFamily;
        mirror.style.fontSize = style.fontSize;
        mirror.style.fontWeight = style.fontWeight;
        mirror.style.fontStyle = style.fontStyle;
        mirror.style.letterSpacing = style.letterSpacing;
        mirror.style.lineHeight = style.lineHeight;
        mirror.style.padding = `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;

        wrapper.appendChild(mirror);

        // --- OVERLAYS ---
        function createOverlay(zIndex) {
            const ov = document.createElement("div");
            ov.style.position = "absolute";
            ov.style.top = "0";
            ov.style.left = "0";
            ov.style.right = "0";
            ov.style.bottom = "0";
            ov.style.pointerEvents = "none";
            ov.style.overflow = "hidden";
            ov.style.zIndex = zIndex;
            ov.style.color = "transparent";
            ov.style.whiteSpace = "pre-wrap";
            ov.style.wordWrap = "break-word";

            const content = document.createElement("div");
            ov.appendChild(content);

            // copy font styles
            content.style.fontFamily = style.fontFamily;
            content.style.fontSize = style.fontSize;
            content.style.fontWeight = style.fontWeight;
            content.style.fontStyle = style.fontStyle;
            content.style.letterSpacing = style.letterSpacing;
            content.style.textAlign = style.textAlign;
            content.style.textIndent = style.textIndent;
            content.style.tabSize = style.tabSize;
            content.style.lineHeight = style.lineHeight === "normal"
                ? (parseFloat(style.fontSize) * 1.2) + "px"
            : style.lineHeight;
            content.style.paddingTop = style.paddingTop;
            content.style.paddingRight = style.paddingRight;
            content.style.paddingBottom = style.paddingBottom;
            content.style.paddingLeft = style.paddingLeft;
            content.style.boxSizing = style.boxSizing;
            content.style.overflowWrap = "break-word";
            content.style.wordBreak = "normal";

            return { container: ov, content };
        }

        const findOverlay = createOverlay(50);
        wrapper.appendChild(findOverlay.container);

        const patternOverlays = SEARCH_PATTERNS.map(() => createOverlay(0));
        patternOverlays.forEach(ov => wrapper.appendChild(ov.container));

        // --- HELPERS ---
        function syncAllOverlayWidths() {
            const innerWidth = textarea.getBoundingClientRect().width - (textarea.offsetWidth - textarea.clientWidth);
            findOverlay.content.style.width = innerWidth + "px";
            patternOverlays.forEach(ov => {
                ov.content.style.width = innerWidth + "px";
            });
        }

        function escapeHtml(str) {
            return str.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function escapeRegex(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        function mapRawIndexToEscaped(raw, escaped, rawIndex) {
            let r = 0, e = 0;
            while (r < rawIndex && r < raw.length) {
                const ch = raw[r];
                if (ch === "&") e += 5;
                else if (ch === "<" || ch === ">") e += 4;
                else if (ch === '"') e += 6;
                else if (ch === "'") e += 5;
                else e += 1;
                r++;
            }
            return e;
        }

        function injectHighlights(html, ranges, activeIndex = -1, color = "rgba(0,128,255,0.35)", activeColor = "rgba(0,128,255,0.75)") {
            if (!ranges.length) return html;
            let out = "", last = 0;
            ranges.forEach((r, i) => {
                out += html.slice(last, r.start);
                const style = i === activeIndex
                ? `background: ${activeColor};`
                : `background: ${color};`;
                out += `<span style="${style}">${html.slice(r.start, r.end)}</span>`;
                last = r.end;
            });
            out += html.slice(last);
            return out;
        }

        function focusSearchBox() {
            searchInput.focus();
            searchInput.select();
            searchBar.style.boxShadow = "0 0 0 2px rgba(0,128,255,0.6)";
            setTimeout(() => searchBar.style.boxShadow = "", 300);

            // Ensure highlights stay in sync even if term was already there
            searchState.term = searchInput.value;
            searchState.index = searchState.term ? 0 : -1;
            syncOverlays();
        }


        function syncOverlays() {
            syncAllOverlayWidths();

            const raw = textarea.value;
            const rawEscaped = escapeHtml(raw);

            // --- find overlay ---
            searchState.ranges = [];
            if (searchState.term) {
                const re = new RegExp(escapeRegex(searchState.term), "gi");
                let m;
                while ((m = re.exec(raw)) !== null) {
                    searchState.ranges.push({ start: m.index, end: m.index + m[0].length });
                }
            }
            const mappedFind = searchState.ranges.map(r => ({
                start: mapRawIndexToEscaped(raw, rawEscaped, r.start),
                end: mapRawIndexToEscaped(raw, rawEscaped, r.end)
            }));
            findOverlay.content.innerHTML = injectHighlights(rawEscaped, mappedFind, searchState.index);

            // --- pattern overlays ---
            SEARCH_PATTERNS.forEach((p, i) => {
                patternOverlays[i].content.innerHTML = rawEscaped.replace(p.regex, match => {
                    return `<span style="${p.style}">${match}</span>`;
                });
            });

            // sync scroll
            overlaysScrollSync();
            counter.textContent = searchState.ranges.length
                ? `${searchState.index + 1} / ${searchState.ranges.length}`
            : "0 / 0";
        }

        function overlaysScrollSync() {
            const scrollTop = textarea.scrollTop;
            const scrollLeft = textarea.scrollLeft;
            findOverlay.container.scrollTop = scrollTop;
            findOverlay.container.scrollLeft = scrollLeft;
            patternOverlays.forEach(ov => {
                ov.container.scrollTop = scrollTop;
                ov.container.scrollLeft = scrollLeft;
            });
        }

        function scrollToMatch(index) {
            if (!searchState.ranges.length) return;

            const r = searchState.ranges[index];

            // Selection (still correct)
            textarea.setSelectionRange(r.start, r.end);
            textarea.focus();

            // Sync mirror width
            mirror.style.width = textarea.clientWidth + "px";

            // Measure caret position
            mirror.textContent = textarea.value.slice(0, r.start);

            const caretY = mirror.scrollHeight;

            // Scroll so caret is comfortably visible
            textarea.scrollTop = Math.max(0, caretY - textarea.clientHeight / 3);

            overlaysScrollSync();
        }

        function jumpToMatch(dir) {
            if (!searchState.ranges.length) return;
            searchState.index = (searchState.index + dir + searchState.ranges.length) % searchState.ranges.length;
            syncOverlays();
            scrollToMatch(searchState.index);
        }

        // --- EVENTS ---
        textarea.addEventListener("input", syncOverlays);
        textarea.addEventListener("scroll", overlaysScrollSync);
        textarea.addEventListener("focus", syncOverlays);
        textarea.addEventListener("mouseenter", syncOverlays);

        textarea.addEventListener("mouseenter", syncAllOverlayWidths);
        textarea.addEventListener("focus", syncAllOverlayWidths);

        searchInput.addEventListener("input", () => {
            searchState.term = searchInput.value;
            searchState.index = searchState.term ? 0 : -1;
            syncOverlays();
        });
        prevBtn.addEventListener("click", () => jumpToMatch(-1));
        nextBtn.addEventListener("click", () => jumpToMatch(1));

        new ResizeObserver(syncOverlays).observe(textarea);

        function globalCtrlFHandler(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                // Only hijack if this textarea is visible
                if (!wrapper.isConnected) return;

                e.preventDefault();
                focusSearchBox();
            }
        }

        document.addEventListener("keydown", globalCtrlFHandler);

        // initial sync
        syncOverlays();
    }

    function scan() {
        document.querySelectorAll('textarea[data-rich_text="true"]').forEach(enhanceTextarea);
    }

    scan();

    new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.addedNodes.length) {
                scan();
                break;
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

})();
