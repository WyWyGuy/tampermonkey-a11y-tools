// ==UserScript==
// @name         Auto A11y Tools
// @namespace    http://tampermonkey.net/
// @version      2026-02-17.1
// @description  A set of accessibility tools to use for BYU's Accessibility Team
// @author       Wyatt Nilsson
// @match        *://*/*
// @match        file:///*
// @icon         https://www.bookmarks.design//media/image/a11yproject.jpg
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_unregisterMenuCommand
// @grant        GM_getResourceText
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/AutoA11yTools.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/AutoA11yTools.user.js
// @resource     EN_WORDS https://raw.githubusercontent.com/WyWyGuy/tampermonkey-a11y-tools/refs/heads/main/englishWords.txt
// ==/UserScript==

(function () {
    'use strict';

    // Prevent multiple instances of the script running
    if (window.top !== window.self) return;

    const autoRunDomains = [
        'byu.instructure.com',
        'byuis.instructure.com',
        'byuismastercourses.instructure.com',
        'byuohs.instructure.com'
    ];

    const excludedPaths = [
        /^https:\/\/byu\.instructure\.com\/courses\/1026(\/|$)/, // Training course
        /^(https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/courses\/\d+\/modules)$/, // Any course's modules page
        /^(https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/courses\/\d+\/(pages|assignments|quizzes)\/[^/]+\/edit)(?:[?#].*)?$/, // Any course's edit view
        /^(https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/courses\/\d+\/files(?:\/.*)?)$/, // Any course's files page or subfolder
        /^https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/courses$/, // Canvas courses page
        /^https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/?$/, // Canvas main page
        /^https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/calendar(?:\/.*|[#?].*)?$/, // Canvas calendar page
        /^https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/conversations(?:\/.*|[#?].*)?$/, // Canvas inbox page
        /^https:\/\/(?:byu|byuis|byuismastercourses|byuohs)\.instructure\.com\/courses\/\d+\/?$/ // Any course's home page
    ];
    const currentHost = window.location.hostname;
    const isAutoRunDomain = autoRunDomains.includes(currentHost);
    const isExcludedPage = excludedPaths.some(pattern => pattern.test(window.location.href));
    const shouldAutoRun = isAutoRunDomain && !isExcludedPage;

    let tempToolStates = {};

    // Central tool tracking object
    const TOOLS = {
        IMG: {
            id: "img",
            label: "Image Alt Text",
            key: "a11y_img",
            run: runImageAltOverlay,
            remove: removeImageAltOverlay
        },
        IFRAME: {
            id: "iframe",
            label: "Iframe Labels",
            key: "a11y_iframe",
            run: runIframeLabelOverlay,
            remove: removeIframeLabelOverlay
        },
        HEADING: {
            id: "heading",
            label: "Heading Tags",
            key: "a11y_heading",
            run: runHeadingTagOverlay,
            remove: removeHeadingTagOverlay
        },
        /*
        IB: {
            id: "ib",
            label: "<i>/<b> Usage",
            key: "a11y_ib",
            run: runIBTagHighlights,
            remove: removeIBTagHighlights
        },
        */
        CONTRAST: {
            id: "contrast",
            label: "Contrast Issues",
            key: "a11y_contrast",
            run: runContrastHighlights,
            remove: removeContrastHighlights
        },
        LANG: {
            id: "lang",
            label: "Lang Attributes",
            key: "a11y_lang",
            run: runLangHighlights,
            remove: removeLangHighlights
        },
        TABLE: {
            id: "table",
            label: "Table Problems",
            key: "a11y_table",
            run: runTableOverlay,
            remove: removeTableOverlay
        }
    };

    // Global styles
    function ensureGlobalStyles() {
        if (document.getElementById('a11y-overlay-styles')) return;
        const style = document.createElement('style');
        style.id = 'a11y-overlay-styles';
        style.textContent = `
      .AccessibilityHelper { font-family: Arial, Helvetica, sans-serif; }
      .A11y-img-label { position: absolute; background: #FFF; border: 3px solid #CCC; border-radius: 7px; padding: 5px; text-align: left; white-space: pre-wrap; font-size: 12px; width: 150px; z-index: 9999; color: black; display: none; transition: all 0.2s ease; }
      .A11y-img-border { position: absolute; border: 3px solid #CCC; border-radius: 7px; z-index: 9998; display: none; pointer-events: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .A11y-iframe-label { position: absolute; background: #FFF; border: 3px solid #CCC; border-radius: 7px; padding: 5px; text-align: left; white-space: pre-wrap; font-size: 12px; width: 300px; z-index: 9999; color: black; display: none; transition: all 0.2s ease; }
      .A11y-iframe-border { position: absolute; border: 3px solid #CCC; border-radius: 7px; z-index: 9998; display: none; pointer-events: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .A11y-header-label { position: absolute; background: #FFF; border: 3px solid #CCC; border-radius: 4px; padding: 2px 4px; text-align: left; white-space: nowrap; font-size: 12px; z-index: 10000; color: black; display: none; transition: all 0.2s ease; }
      .A11y-header-border { position: absolute; border: 3px solid #CCC; border-radius: 4px; z-index: 9998; display: none; pointer-events: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .A11y-ib-border { position: absolute; border: 2px solid red; border-radius: 4px; z-index: 10001; pointer-events: none; transition: all 0.2s ease; display: none; }
      .A11y-ib-highlight { border-color: #c00 !important; box-shadow: 1px 2px 5px #f99; z-index: 10001; }
      .A11y-contrast-border { position: absolute; border: 2px solid blue; border-radius: 4px; z-index: 10001; pointer-events: none; transition: all 0.2s ease; display: none; }
      .A11y-contrast-highlight { border-color: #339 !important; box-shadow: 1px 2px 5px #99f; z-index: 10001; }
      .A11y-table-label { position: absolute; background: #FFF; border: 3px solid #CCC; border-radius: 7px; padding: 5px; text-align: left; white-space: pre-wrap; font-size: 12px; width: 300px; z-index: 9999; color: black; display: none; transition: all 0.2s ease; }
      .A11y-table-border { position: absolute; border: 3px solid #CCC; border-radius: 7px; z-index: 9998; display: none; pointer-events: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .A11y-lang-border { position: absolute; border: 2px solid green; border-radius: 4px; z-index: 10001; pointer-events: none; transition: all 0.2s ease; display: none; }
      .A11y-lang-highlight { border-color: #2b2 !important; box-shadow: 1px 2px 6px #7f7; z-index: 10001; }
    `;
        document.head.appendChild(style);
    }

    ensureGlobalStyles();

    // Initialize persistent settings
    Object.values(TOOLS).forEach(tool => {
        if (GM_getValue(tool.key) === undefined) {
            GM_setValue(tool.key, true);
        }
    });

    let menuIds = {};

    // Menu command management
    function updateMenuCommands() {
        Object.values(menuIds).forEach(id => {
            try { if (id) GM_unregisterMenuCommand(id); } catch (e) { /* ignore */ }
        });
        menuIds = {};

        menuIds.activateAll = GM_registerMenuCommand('✅Activate All A11y Tools', () => {
            runAll();
        });

        menuIds.removeAll = GM_registerMenuCommand('❌Remove All A11y Tools', () => {
            removeAll();
        });

        Object.values(TOOLS).forEach(tool => {
            const state = getToolState(tool);
            menuIds[tool.id] = GM_registerMenuCommand(
                `${state ? '🟩' : '⬜'} ${tool.label}: ${state ? 'ON' : 'OFF'}`,
                () => toggleTool(tool)
            );
        });
    }

    function runAll() {
        const container = document.body;
        Object.values(TOOLS).forEach(tool => tool.remove());
        Object.values(TOOLS).forEach(tool => {
            setToolState(tool, true);
            tool.run(container);
        });
        updateMenuCommands();
    }

    function removeAll() {
        Object.values(TOOLS).forEach(tool => {
            setToolState(tool, false);
            tool.remove();
        });
        document.querySelectorAll('.AccessibilityHelper').forEach(e => e.remove());
        updateMenuCommands();
    }

    function getToolState(tool) {
        return shouldAutoRun
            ? GM_getValue(tool.key, false)
        : tempToolStates[tool.key] ?? false;
    }

    function setToolState(tool, value) {
        if (shouldAutoRun) {
            GM_setValue(tool.key, value);
        } else {
            tempToolStates[tool.key] = value;
        }
    }

    function toggleTool(tool) {
        const currentState = getToolState(tool);
        const newState = !currentState;

        setToolState(tool, newState);
        updateMenuCommands();

        try {
            if (newState) {
                tool.run(document.body);
            } else {
                tool.remove();
            }
        } catch (e) { /* ignore */ }
    }

    function keyHandler(e) {
        try {
            if (e.code === 'NumpadAdd' || e.keyCode === 107) {
                runAll();
                return;
            }
            if (e.code === 'NumpadSubtract' || e.keyCode === 109) {
                removeAll();
                return;
            }
        } catch (err) { /* ignore */ }
    }
    document.addEventListener('keydown', keyHandler, true);

    // Helper functions
    function isActuallyVisible(el) {
        if (!(el instanceof Element)) return false;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') return false;

        const rect = el.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return false;

        let current = el;
        while (current) {
            if (current.closest('.AccessibilityHelper')) return false;

            if (current.tagName === 'DETAILS' && !current.open) return false;

            const style = getComputedStyle(current);

            if (style.display === 'none' || style.visibility === 'hidden') return false;

            if (current.className && current.className.toString().toLowerCase().includes('screenreadercontent')) return false;

            if (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowX === 'auto' || style.overflowY === 'auto' || style.overflowX === 'scroll' || style.overflowY === 'scroll') {
                const parentRect = current.getBoundingClientRect();
                if (
                    rect.bottom < parentRect.top ||
                    rect.top > parentRect.bottom ||
                    rect.right < parentRect.left ||
                    rect.left > parentRect.right
                ) {
                    return false;
                }
            }

            current = current.parentElement;
        }

        return true;
    }

    const updateFunctions = [];

    // Tool implementations
    function runImageAltOverlay(container) {
        const tool = TOOLS.IMG;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }
        overlayContainer.innerHTML = '';

        function scanImages() {
            const images = container.querySelectorAll('img');
            images.forEach(img => {
                if (img.closest('.AccessibilityHelper')) return;
                if (img._a11yImgProcessed) return;
                img._a11yImgProcessed = true;

                const roleAttr = (img.getAttribute && (img.getAttribute('role') || '')).toLowerCase();
                const altText = roleAttr === 'presentation' ? '[Decorative]' : (img.alt?.trim() || '[Missing]');

                const label = document.createElement('div');
                label.className = 'A11y-img-label';
                label.textContent = 'Alt Text: ' + altText;
                overlayContainer.appendChild(label);

                const border = document.createElement('div');
                border.className = 'A11y-img-border';
                overlayContainer.appendChild(border);

                function updatePositions() {
                    const r = img.getBoundingClientRect();
                    const visible = isActuallyVisible(img);
                    if (visible) {
                        label.style.display = 'block';
                        border.style.display = 'block';
                        label.style.top = window.scrollY + r.top - label.offsetHeight - 8 + 'px';
                        label.style.left = window.scrollX + r.left + 'px';
                        border.style.top = window.scrollY + r.top - 8 + 'px';
                        border.style.left = window.scrollX + r.left - 8 + 'px';
                        border.style.width = r.width + 16 + 'px';
                        border.style.height = r.height + 16 + 'px';
                    } else {
                        label.style.display = 'none';
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    border.style.borderColor = '#393';
                    border.style.boxShadow = '1px 2px 5px #CCC';
                    label.style.borderColor = '#393';
                    label.style.boxShadow = '1px 2px 5px #CCC';
                }
                function unhighlight() {
                    border.style.borderColor = '#CCC';
                    border.style.boxShadow = 'none';
                    label.style.borderColor = '#CCC';
                    label.style.boxShadow = 'none';
                }

                img.addEventListener('mouseover', highlight);
                img.addEventListener('mouseout', unhighlight);
                img._highlightFunction = highlight;
                img._unhighlightFunction = unhighlight;
                label.addEventListener('mouseover', highlight);
                label.addEventListener('mouseout', unhighlight);

                updatePositions();

                const imgObserver = new MutationObserver(updatePositions);
                imgObserver.observe(img, { attributes: true, attributeFilter: ['src', 'alt', 'role', 'style', 'class', 'hidden'] });
                img._a11yImgObserver = imgObserver;
                img._updateFunction = updatePositions;

                document.addEventListener('scroll', img._updateFunction, { capture: true, passive: true });
                window.addEventListener('resize', img._updateFunction, { passive: true });
                updateFunctions.push(img._updateFunction);
            });
        }

        scanImages();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }
        const observer = new MutationObserver(scanImages);
        observer.observe(container, { childList: true, subtree: true });
        overlayContainer._observer = observer;
    }

    function removeImageAltOverlay() {
        const tool = TOOLS.IMG;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) overlayContainer._observer.disconnect();
            overlayContainer.remove();
        }

        document.querySelectorAll('img').forEach(img => {
            if (img._a11yImgObserver) {
                img._a11yImgObserver.disconnect();
                delete img._a11yImgObserver;
            }

            document.removeEventListener('scroll', img._updateFunction, { capture: true, passive: true });
            window.removeEventListener('resize', img._updateFunction, { passive: true });

            img.removeEventListener('mouseover', img._highlightFunction);
            img.removeEventListener('mouseout', img._unhighlightFunction);

            const index = updateFunctions.indexOf(img._updateFunction);
            if (index > -1) updateFunctions.splice(index, 1);

            delete img._updateFunction;
            delete img._highlightFunction;
            delete img._unhighlightFunction;
            delete img._a11yImgProcessed;
        });
    }

    function runIframeLabelOverlay(container) {
        const tool = TOOLS.IFRAME;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }

        overlayContainer.innerHTML = '';

        function getLabelText(f) {
            let title = f.title?.trim() || '[Empty]';

            let ariaLabel = f.getAttribute('aria-label');
            let ariaLabelFrom = '';
            if (!ariaLabel && f.hasAttribute('aria-labelledby')) {
                ariaLabel = f.getAttribute('aria-labelledby')
                    .split(' ')
                    .map(id => document.getElementById(id)?.textContent?.trim() || '[Missing]')
                    .join(', ');
                ariaLabelFrom = ' (uses labelledby)';
            }
            if (!ariaLabel) ariaLabel = '[Missing]';

            let ariaDesc = f.getAttribute('aria-description');
            let ariaDescFrom = '';
            if (!ariaDesc && f.hasAttribute('aria-describedby')) {
                ariaDesc = f.getAttribute('aria-describedby')
                    .split(' ')
                    .map(id => document.getElementById(id)?.textContent?.trim() || '[Empty]')
                    .join(', ');
                ariaDescFrom = ' (uses describedby)';
            }
            if (!ariaDesc) ariaDesc = '[Empty]';

            const ariaLabelEmoji = ariaLabel !== '[Missing]' ? '🔊' : '🔇';
            const ariaDescEmoji = ariaDesc !== '[Empty]' ? '🔊' : '🔇';
            const titleEmoji =
                  title !== '[Empty]' && ariaLabel === '[Missing]' && ariaDesc === '[Empty]'
            ? '🔊'
            : '🔇';

            const ariaLabelColor = ariaLabel !== '[Missing]' ? '#060' : '#c00';
            const ariaDescColor = ariaDesc !== '[Empty]' ? '#c00' : '#060';
            const titleColor = titleEmoji === '🔊' ? '#c00' : '#060';

            return (
                `<span style="color:${ariaLabelColor}; font-weight: bold">${ariaLabelEmoji} Aria-label: ${ariaLabel}${ariaLabelFrom}</span>\n` +
                `<span style="color:${ariaDescColor}">${ariaDescEmoji} Aria-description: ${ariaDesc}${ariaDescFrom}</span>\n` +
                `<span style="color:${titleColor}">${titleEmoji} Title: ${title}</span>`
            );
        }

        function scanIframes() {
            container.querySelectorAll('iframe').forEach(f => {
                if (f.closest('.AccessibilityHelper')) return;
                if (f._a11yIframeProcessed) return;
                f._a11yIframeProcessed = true;

                const label = document.createElement('div');
                label.className = 'A11y-iframe-label';
                label.innerHTML = getLabelText(f);
                overlayContainer.appendChild(label);

                const border = document.createElement('div');
                border.className = 'A11y-iframe-border';
                overlayContainer.appendChild(border);

                function updatePositions() {
                    const r = f.getBoundingClientRect();
                    const visible = isActuallyVisible(f);

                    if (visible) {
                        label.style.display = 'block';
                        border.style.display = 'block';

                        label.style.top = window.scrollY + r.top - label.offsetHeight - 8 + 'px';
                        label.style.left = window.scrollX + r.left + 'px';

                        border.style.top = window.scrollY + r.top - 8 + 'px';
                        border.style.left = window.scrollX + r.left - 8 + 'px';
                        border.style.width = r.width + 16 + 'px';
                        border.style.height = r.height + 16 + 'px';
                    } else {
                        label.style.display = 'none';
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    label.style.borderColor = '#393';
                    label.style.boxShadow = '1px 2px 5px #CCC';
                    border.style.borderColor = '#393';
                    border.style.boxShadow = '1px 2px 5px #CCC';
                }

                function unhighlight() {
                    label.style.borderColor = '#CCC';
                    label.style.boxShadow = 'none';
                    border.style.borderColor = '#CCC';
                    border.style.boxShadow = 'none';
                }

                f.addEventListener('mouseover', highlight);
                f.addEventListener('mouseout', unhighlight);
                label.addEventListener('mouseover', highlight);
                label.addEventListener('mouseout', unhighlight);

                f._highlightFunction = highlight;
                f._unhighlightFunction = unhighlight;

                updatePositions();

                const iframeObserver = new MutationObserver(updatePositions);
                iframeObserver.observe(f, {
                    attributes: true,
                    attributeFilter: [
                        'title',
                        'aria-label',
                        'aria-labelledby',
                        'aria-description',
                        'aria-describedby',
                        'style',
                        'class',
                        'hidden',
                        'open'
                    ]
                });

                f._a11yIframeObserver = iframeObserver;
                f._updateFunction = updatePositions;

                document.addEventListener('scroll', updatePositions, { capture: true, passive: true });
                window.addEventListener('resize', updatePositions, { passive: true });
                updateFunctions.push(updatePositions);
            });
        }

        scanIframes();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }

        const observer = new MutationObserver(scanIframes);
        observer.observe(container, { childList: true, subtree: true });
        overlayContainer._observer = observer;
    }

    function removeIframeLabelOverlay() {
        const tool = TOOLS.IFRAME;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) overlayContainer._observer.disconnect();
            overlayContainer.remove();
        }

        document.querySelectorAll('iframe').forEach(f => {
            if (f._a11yIframeObserver) {
                f._a11yIframeObserver.disconnect();
                delete f._a11yIframeObserver;
            }

            document.removeEventListener('scroll', f._updateFunction, { capture: true, passive: true });
            window.removeEventListener('resize', f._updateFunction, { passive: true });

            f.removeEventListener('mouseover', f._highlightFunction);
            f.removeEventListener('mouseout', f._unhighlightFunction);

            const index = updateFunctions.indexOf(f._updateFunction);
            if (index > -1) updateFunctions.splice(index, 1);

            delete f._updateFunction;
            delete f._highlightFunction;
            delete f._unhighlightFunction;
            delete f._a11yIframeProcessed;
        });
    }

    function runHeadingTagOverlay(container) {
        const tool = TOOLS.HEADING;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }
        overlayContainer.innerHTML = '';

        function scanHeaders() {
            const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headers.forEach(h => {
                if (h.closest('.AccessibilityHelper')) return;
                if (h._a11yHeaderProcessed) return;
                h._a11yHeaderProcessed = true;

                const label = document.createElement('div');
                label.className = 'A11y-header-label';
                label.textContent = h.tagName;
                overlayContainer.appendChild(label);

                const border = document.createElement('div');
                border.className = 'A11y-header-border';
                overlayContainer.appendChild(border);

                function updatePositions() {
                    const r = h.getBoundingClientRect();
                    const visible = isActuallyVisible(h);
                    if (visible) {
                        label.style.display = 'block';
                        border.style.display = 'block';
                        label.style.top = window.scrollY + r.top - label.offsetHeight + 3 + 'px';
                        label.style.left = window.scrollX + r.left + 'px';
                        border.style.top = window.scrollY + r.top + 'px';
                        border.style.left = window.scrollX + r.left + 'px';
                        border.style.width = r.width + 'px';
                        border.style.height = r.height + 'px';
                    } else {
                        label.style.display = 'none';
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    border.style.borderColor = '#393';
                    border.style.boxShadow = '1px 2px 5px #CCC';
                    label.style.borderColor = '#393';
                    label.style.boxShadow = '1px 2px 5px #CCC';
                }
                function unhighlight() {
                    border.style.borderColor = '#CCC';
                    border.style.boxShadow = 'none';
                    label.style.borderColor = '#CCC';
                    label.style.boxShadow = 'none';
                }

                h.addEventListener('mouseover', highlight);
                h.addEventListener('mouseout', unhighlight);
                h._highlightFunction = highlight;
                h._unhighlightFunction = unhighlight;
                label.addEventListener('mouseover', highlight);
                label.addEventListener('mouseout', unhighlight);

                updatePositions();

                const headerObserver = new MutationObserver(updatePositions);
                headerObserver.observe(h, { attributes: true, attributeFilter: ['style', 'class', 'hidden', 'open'] });
                h._a11yHeaderObserver = headerObserver;
                h._updateFunction = updatePositions;

                document.addEventListener('scroll', h._updateFunction, { capture: true, passive: true });
                window.addEventListener('resize', h._updateFunction, { passive: true });
                updateFunctions.push(h._updateFunction);
            });
        }

        scanHeaders();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }
        const observer = new MutationObserver(scanHeaders);
        observer.observe(container, { childList: true, subtree: true });
        overlayContainer._observer = observer;
    }

    function removeHeadingTagOverlay() {
        const tool = TOOLS.HEADING;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) overlayContainer._observer.disconnect();
            overlayContainer.remove();
        }

        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
            if (h._a11yHeaderObserver) {
                h._a11yHeaderObserver.disconnect();
                delete h._a11yHeaderObserver;
            }

            document.removeEventListener('scroll', h._updateFunction, { capture: true, passive: true });
            window.removeEventListener('resize', h._updateFunction, { passive: true });

            h.removeEventListener('mouseover', h._highlightFunction);
            h.removeEventListener('mouseout', h._unhighlightFunction);

            const index = updateFunctions.indexOf(h._updateFunction);
            if (index > -1) updateFunctions.splice(index, 1);

            delete h._updateFunction;
            delete h._highlightFunction;
            delete h._unhighlightFunction;
            delete h._a11yHeaderProcessed;
        });
    }

    function runIBTagHighlights(container) {
        const tool = TOOLS.IB;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }
        overlayContainer.innerHTML = '';

        function hasText(el) {
            return Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .join('').length > 0;
        }

        function scanIB() {
            const nodes = container.querySelectorAll('i, b');

            nodes.forEach(el => {
                if (el.closest('.AccessibilityHelper')) return;
                if (el._a11yIBProcessed) return;
                if (!hasText(el)) return;

                el._a11yIBProcessed = true;

                const border = document.createElement('div');
                border.className = 'A11y-ib-border';
                overlayContainer.appendChild(border);

                function updatePosition() {
                    const r = el.getBoundingClientRect();
                    const visible = isActuallyVisible(el);

                    if (visible) {
                        border.style.display = 'block';
                        border.style.top = Math.round(window.scrollY + r.top - 4) + 'px';
                        border.style.left = Math.round(window.scrollX + r.left - 4) + 'px';
                        border.style.width = Math.round(r.width + 8) + 'px';
                        border.style.height = Math.round(r.height + 8) + 'px';
                    } else {
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    border.classList.add('A11y-ib-highlight');
                }

                function unhighlight() {
                    border.classList.remove('A11y-ib-highlight');
                }

                el.addEventListener('mouseover', highlight);
                el.addEventListener('mouseout', unhighlight);

                el._highlightFunction = highlight;
                el._unhighlightFunction = unhighlight;
                el._updateFunction = updatePosition;

                updatePosition();

                const observer = new MutationObserver(updatePosition);
                observer.observe(el, {
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });

                el._a11yIBObserver = observer;

                document.addEventListener('scroll', updatePosition, { capture: true, passive: true });
                window.addEventListener('resize', updatePosition, { passive: true });
                updateFunctions.push(updatePosition);
            });
        }

        scanIB();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }

        const observer = new MutationObserver(scanIB);
        observer.observe(container, { childList: true, subtree: true });
        overlayContainer._observer = observer;
    }

    function removeIBTagHighlights() {
        const tool = TOOLS.IB;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) overlayContainer._observer.disconnect();
            overlayContainer.remove();
        }

        document.querySelectorAll('i, b').forEach(el => {
            if (el._a11yIBObserver) {
                el._a11yIBObserver.disconnect();
                delete el._a11yIBObserver;
            }

            document.removeEventListener('scroll', el._updateFunction, { capture: true, passive: true });
            window.removeEventListener('resize', el._updateFunction, { passive: true });

            el.removeEventListener('mouseover', el._highlightFunction);
            el.removeEventListener('mouseout', el._unhighlightFunction);

            const idx = updateFunctions.indexOf(el._updateFunction);
            if (idx > -1) updateFunctions.splice(idx, 1);

            delete el._updateFunction;
            delete el._highlightFunction;
            delete el._unhighlightFunction;
            delete el._a11yIBProcessed;
        });
    }

    function runContrastHighlights(container) {
        const tool = TOOLS.CONTRAST;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }

        overlayContainer.innerHTML = '';
        if (overlayContainer._trackedElements) {
            overlayContainer._trackedElements.clear();
        } else {
            overlayContainer._trackedElements = new Set();
        }

        function isFullyTransparent(color) {
            if (!color) return true;

            if (color === 'transparent') return true;

            if (color.startsWith('rgba')) {
                const parts = color.match(/[\d.]+/g);
                if (!parts) return false;
                const alpha = parseFloat(parts[3]);
                return alpha === 0;
            }

            if (color.startsWith('hsla')) {
                const parts = color.match(/[\d.]+/g);
                if (!parts) return false;
                const alpha = parseFloat(parts[3]);
                return alpha === 0;
            }

            return false;
        }

        function luminance(r, g, b) {
            const a = [r, g, b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        }

        function contrastRatio(rgb1, rgb2) {
            const [r1, g1, b1] = rgb1.match(/\d+/g).map(Number);
            const [r2, g2, b2] = rgb2.match(/\d+/g).map(Number);

            const l1 = luminance(r1, g1, b1);
            const l2 = luminance(r2, g2, b2);

            return l1 > l2
                ? (l1 + 0.05) / (l2 + 0.05)
            : (l2 + 0.05) / (l1 + 0.05);
        }

        function getEffectiveColor(el) {
            let current = el;

            while (current && current !== document.documentElement) {
                const c = getComputedStyle(current).color;
                if (c && c !== 'transparent') return c;
                current = current.parentElement;
            }

            return getComputedStyle(document.body).color || 'rgb(0,0,0)';
        }

        function getEffectiveBackground(el) {
            let current = el;

            while (current && current !== document.documentElement) {
                const bg = getComputedStyle(current).backgroundColor;

                if (bg && !isFullyTransparent(bg)) {
                    return bg;
                }

                current = current.parentElement;
            }

            return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
        }

        function passesContrast(el) {
            const style = getComputedStyle(el);
            const color = getEffectiveColor(el);
            const bg = getEffectiveBackground(el);

            const ratio = contrastRatio(color, bg);

            const fontSize = parseFloat(style.fontSize) || 0;
            const fontWeight = parseInt(style.fontWeight, 10) || 400;

            const isLargeText =
                  fontSize >= 18 ||
                  (fontSize >= 14 && fontWeight >= 700);

            const threshold = isLargeText ? 3.0 : 4.5;

            return ratio >= threshold;
        }

        function scanContrast() {
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;

                        if (!isActuallyVisible(parent)) return NodeFilter.FILTER_REJECT;

                        if (
                            parent.closest('.AccessibilityHelper') ||
                            parent.closest('.AccessibilityHelper') ||
                            parent.closest('.sr-only, .screenreader-only')
                        ) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            const processedParents = new Set();

            while (walker.nextNode()) {
                const el = walker.currentNode.parentElement;
                if (!el || processedParents.has(el)) continue;

                processedParents.add(el);

                if (el._a11yContrastProcessed) continue;
                if (!isActuallyVisible(el)) continue;

                const text = Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .join('');

                if (!text) continue;

                if (passesContrast(el)) continue;

                el._a11yContrastProcessed = true;
                overlayContainer._trackedElements.add(el);

                const border = document.createElement('div');
                border.className = 'A11y-contrast-border';
                overlayContainer.appendChild(border);

                function updatePosition() {
                    const r = el.getBoundingClientRect();

                    if (isActuallyVisible(el)) {
                        if (passesContrast(el)) {
                            border.style.display = 'none';
                            return;
                        }
                        border.style.display = 'block';
                        border.style.top = Math.round(window.scrollY + r.top - 4) + 'px';
                        border.style.left = Math.round(window.scrollX + r.left - 4) + 'px';
                        border.style.width = Math.round(r.width + 8) + 'px';
                        border.style.height = Math.round(r.height + 8) + 'px';
                    } else {
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    border.classList.add('A11y-contrast-highlight');
                }

                function unhighlight() {
                    border.classList.remove('A11y-contrast-highlight');
                }

                el._contrastBorder = border;
                el._contrastUpdate = updatePosition;
                el._contrastHighlight = highlight;
                el._contrastUnhighlight = unhighlight;

                el.addEventListener('mouseover', highlight);
                el.addEventListener('mouseout', unhighlight);

                const attrObserver = new MutationObserver(updatePosition);
                attrObserver.observe(el, {
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });

                el._contrastObserver = attrObserver;

                document.addEventListener('scroll', updatePosition, { capture: true, passive: true });
                window.addEventListener('resize', updatePosition, { passive: true });

                updateFunctions.push(updatePosition);

                updatePosition();
            }
        }

        scanContrast();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }

        const domObserver = new MutationObserver(scanContrast);
        domObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'open', 'hidden']
        });

        overlayContainer._observer = domObserver;
    }

    function removeContrastHighlights() {
        const tool = TOOLS.CONTRAST;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) {
                overlayContainer._observer.disconnect();
            }
            const trackedElements = overlayContainer._trackedElements;

            if (trackedElements) {
                trackedElements.forEach(el => {
                    if (el._contrastObserver) {
                        el._contrastObserver.disconnect();
                        delete el._contrastObserver;
                    }

                    document.removeEventListener('scroll', el._contrastUpdate, { capture: true, passive: true });
                    window.removeEventListener('resize', el._contrastUpdate, { passive: true });

                    el.removeEventListener('mouseover', el._contrastHighlight);
                    el.removeEventListener('mouseout', el._contrastUnhighlight);

                    const idx = updateFunctions.indexOf(el._contrastUpdate);
                    if (idx > -1) updateFunctions.splice(idx, 1);

                    if (el._contrastBorder) {
                        el._contrastBorder.remove();
                    }

                    delete el._contrastBorder;
                    delete el._contrastUpdate;
                    delete el._contrastHighlight;
                    delete el._contrastUnhighlight;
                    delete el._a11yContrastProcessed;
                });
                trackedElements.clear();
            }
            overlayContainer.remove();
        }

    }

    function runLangHighlights(container) {
        const tool = TOOLS.LANG;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }

        overlayContainer.innerHTML = '';

        overlayContainer._trackedMatches = new Map();

        const dictText = GM_getResourceText('EN_WORDS');

        if (!dictText) {
            console.error('A11y dictionary not loade. Lang tool disabled');
            return;
        }

        const englishWords = new Set(
            dictText
            .split('\n')
            .map(w => w.trim().toLowerCase())
            .filter(Boolean)
        );

        function getNearestLang(el) {
            while (el && el.nodeType === 1) {
                if (el.hasAttribute('lang')) {
                    return el.getAttribute('lang').toLowerCase();
                }
                el = el.parentElement;
            }
            return null;
        }

        function shouldSkip(node) {
            return !!node.closest('.AccessibilityHelper, .sr-only, .screenreader-only');
        }

        function createBorder() {
            const el = document.createElement('div');
            el.className = 'A11y-lang-border';
            overlayContainer.appendChild(el);
            return el;
        }

        function scan() {
            const seenEntries = new Set();

            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;

                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;

                        if (!isActuallyVisible(parent)) return NodeFilter.FILTER_REJECT;
                        if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;

                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let textNode;

            while ((textNode = walker.nextNode())) {
                const parent = textNode.parentElement;
                const nearestLang = getNearestLang(parent);

                const wordRegex = /[\p{L}]+/gu;
                let match;

                while ((match = wordRegex.exec(textNode.textContent)) !== null) {
                    const word = match[0];
                    const start = match.index;
                    const cleanWord = word.toLowerCase();

                    if (
                        englishWords.has(cleanWord) ||
                        (nearestLang && nearestLang !== 'en')
                    ) {
                        continue;
                    }

                    let nodeMap = overlayContainer._trackedMatches.get(textNode);

                    if (!nodeMap) {
                        nodeMap = new Map();
                        overlayContainer._trackedMatches.set(textNode, nodeMap);
                    }

                    let entry = nodeMap.get(start);

                    if (!entry) {
                        const border = createBorder();

                        const highlight = () => border.classList.add('A11y-lang-highlight');
                        const unhighlight = () => border.classList.remove('A11y-lang-highlight');

                        parent.addEventListener('mouseover', highlight);
                        parent.addEventListener('mouseout', unhighlight);

                        entry = {
                            textNode,
                            start,
                            length: word.length,
                            border,
                            parent,
                            highlight,
                            unhighlight
                        };

                        nodeMap.set(start, entry);
                    }

                    seenEntries.add(entry);
                    updateEntry(entry);
                }
            }

            for (const [textNode, nodeMap] of overlayContainer._trackedMatches) {
                for (const [start, entry] of nodeMap) {
                    if (!seenEntries.has(entry)) {
                        entry.parent.removeEventListener('mouseover', entry.highlight);
                        entry.parent.removeEventListener('mouseout', entry.unhighlight);
                        entry.border.remove();
                        nodeMap.delete(start);
                    }
                }
            }
        }

        function updateEntry(entry) {
            const { textNode, start, length, border } = entry;

            if (!document.contains(textNode)) {
                const nodeMap = overlayContainer._trackedMatches.get(textNode);
                if (nodeMap) nodeMap.delete(start);
                border.remove();
                return;
            }

            const parent = textNode.parentElement;

            if (!isActuallyVisible(parent)) {
                border.style.display = 'none';
                return;
            }

            const range = document.createRange();
            range.setStart(textNode, start);
            range.setEnd(textNode, start + length);

            const rect = range.getBoundingClientRect();
            range.detach();

            if (rect.width === 0 || rect.height === 0) {
                border.style.display = 'none';
                return;
            }

            border.style.display = 'block';
            border.style.top = Math.round(window.scrollY + rect.top - 3) + 'px';
            border.style.left = Math.round(window.scrollX + rect.left - 3) + 'px';
            border.style.width = Math.round(rect.width + 6) + 'px';
            border.style.height = Math.round(rect.height + 6) + 'px';
        }

        function updateAll() {
            for (const [, nodeMap] of overlayContainer._trackedMatches) {
                for (const entry of nodeMap.values()) {
                    updateEntry(entry);
                }
            }
        }

        const mutationObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
                const el = m.target.nodeType === Node.ELEMENT_NODE
                ? m.target
                : m.target.parentElement;
                if (el && el.closest('.AccessibilityHelper')) return;
            }
            scan();
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden', 'open']
        });

        const scrollHandler = () => updateAll();
        const resizeHandler = () => updateAll();

        document.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
        window.addEventListener('resize', resizeHandler, { passive: true });

        overlayContainer._updateFn = updateAll;
        updateFunctions.push(overlayContainer._updateFn);

        overlayContainer._cleanup = {
            mutationObserver,
            scrollHandler,
            resizeHandler
        };

        scan();
    }

    function removeLangHighlights() {
        const tool = TOOLS.LANG;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) return;

        const cleanup = overlayContainer._cleanup;

        if (cleanup) {
            cleanup.mutationObserver.disconnect();
            document.removeEventListener('scroll', cleanup.scrollHandler, true);
            window.removeEventListener('resize', cleanup.resizeHandler, { passive: true });
        }

        const matches = overlayContainer._trackedMatches;

        if (matches) {
            for (const nodeMap of matches.values()) {
                for (const entry of nodeMap.values()) {
                    entry.parent.removeEventListener('mouseover', entry.highlight);
                    entry.parent.removeEventListener('mouseout', entry.unhighlight);
                    entry.border.remove();
                }
                nodeMap.clear();
            }

            matches.clear?.();
        }

        if (overlayContainer._updateFn) {
            const idx = updateFunctions.indexOf(overlayContainer._updateFn);
            if (idx > -1) updateFunctions.splice(idx, 1);
        }

        overlayContainer.remove();
    }

    function runTableOverlay(container) {
        const tool = TOOLS.TABLE;
        const toolKey = tool.key;

        let overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.className = 'AccessibilityHelper';
            overlayContainer.dataset.tool = toolKey;
            document.body.appendChild(overlayContainer);
        }
        overlayContainer.innerHTML = '';

        function analyzeTableForA11yIssues(table) {
            const issues = [];
            const rows = Array.from(table.rows);

            const hasAnyTH = table.querySelector('th') !== null;
            if (!hasAnyTH) {
                issues.push('Table does not contain any <th> header cells');
            }

            rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.cells);

                cells.forEach((cell, colIndex) => {
                    const rspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                    const cspan = parseInt(cell.getAttribute('colspan') || '1', 10);

                    if (rspan > 1) {
                        issues.push(`Column ${colIndex + 1} has a cell spanning ${rspan} rows`);
                    }
                    if (cspan > 1) {
                        issues.push(`Row ${rowIndex + 1} has a cell spanning ${cspan} columns`);
                    }

                    if (cell.tagName.toLowerCase() === 'th') {
                        const scope = cell.getAttribute('scope');
                        if (!scope) {
                            issues.push(`Header cell in row ${rowIndex + 1} is missing a scope attribute`);
                        }
                    }
                });
            });

            return issues;
        }

        function scanTables() {
            const tables = container.querySelectorAll('table');

            tables.forEach(table => {
                if (table.closest('.AccessibilityHelper')) return;
                if (table._a11yTableProcessed) return;

                const issues = analyzeTableForA11yIssues(table);
                if (issues.length === 0) return;

                table._a11yTableProcessed = true;

                const label = document.createElement('div');
                label.className = 'A11y-table-label';
                label.innerHTML = "<span style='color: #c00;'>" + issues.join('\n') + "</span>";
                overlayContainer.appendChild(label);

                const border = document.createElement('div');
                border.className = 'A11y-table-border';
                overlayContainer.appendChild(border);

                function updatePositions() {
                    const r = table.getBoundingClientRect();
                    const visible = isActuallyVisible(table);

                    if (visible) {
                        label.style.display = 'block';
                        border.style.display = 'block';

                        label.style.top = window.scrollY + r.top - label.offsetHeight - 8 + 'px';
                        label.style.left = window.scrollX + r.left + 'px';

                        border.style.top = window.scrollY + r.top - 8 + 'px';
                        border.style.left = window.scrollX + r.left - 8 + 'px';
                        border.style.width = r.width + 16 + 'px';
                        border.style.height = r.height + 16 + 'px';
                    } else {
                        label.style.display = 'none';
                        border.style.display = 'none';
                    }
                }

                function highlight() {
                    border.style.borderColor = '#393';
                    border.style.boxShadow = '1px 2px 5px #CCC';
                    label.style.borderColor = '#393';
                    label.style.boxShadow = '1px 2px 5px #CCC';
                }

                function unhighlight() {
                    border.style.borderColor = '#CCC';
                    border.style.boxShadow = 'none';
                    label.style.borderColor = '#CCC';
                    label.style.boxShadow = 'none';
                }

                table.addEventListener('mouseover', highlight);
                table.addEventListener('mouseout', unhighlight);
                label.addEventListener('mouseover', highlight);
                label.addEventListener('mouseout', unhighlight);

                table._highlightFunction = highlight;
                table._unhighlightFunction = unhighlight;

                updatePositions();

                const tableObserver = new MutationObserver(updatePositions);
                tableObserver.observe(table, {
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden', 'open']
                });

                table._a11yTableObserver = tableObserver;
                table._updateFunction = updatePositions;

                document.addEventListener('scroll', updatePositions, { capture: true, passive: true });
                window.addEventListener('resize', updatePositions, { passive: true });
                updateFunctions.push(updatePositions);
            });
        }

        scanTables();

        if (overlayContainer._observer) {
            overlayContainer._observer.disconnect();
        }
        const observer = new MutationObserver(scanTables);
        observer.observe(container, { childList: true, subtree: true });
        overlayContainer._observer = observer;
    }

    function removeTableOverlay() {
        const tool = TOOLS.TABLE;
        const toolKey = tool.key;

        const overlayContainer = document.querySelector(`.AccessibilityHelper[data-tool='${toolKey}']`);
        if (overlayContainer) {
            if (overlayContainer._observer) overlayContainer._observer.disconnect();
            overlayContainer.remove();
        }

        document.querySelectorAll('table').forEach(table => {
            if (table._a11yTableObserver) {
                table._a11yTableObserver.disconnect();
                delete table._a11yTableObserver;
            }

            document.removeEventListener('scroll', table._updateFunction, { capture: true, passive: true });
            window.removeEventListener('resize', table._updateFunction, { passive: true });

            table.removeEventListener('mouseover', table._highlightFunction);
            table.removeEventListener('mouseout', table._unhighlightFunction);

            const index = updateFunctions.indexOf(table._updateFunction);
            if (index > -1) updateFunctions.splice(index, 1);

            delete table._updateFunction;
            delete table._highlightFunction;
            delete table._unhighlightFunction;
            delete table._a11yTableProcessed;
        });
    }

    // Auto-run on page load
    function runWhenPageLoaded() {
        let timeout = null;
        const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                observer.disconnect();
                const container = document.body;
                Object.values(TOOLS).forEach(tool => {
                    if (shouldAutoRun && GM_getValue(tool.key, true)) {
                        tool.run(container);
                    }
                });
            }, 250);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    // Rebounced scanner for any page changes (like dropdowns) to force update
    let resizeTimeout;
    const ro = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateFunctions.forEach(fn => fn());
        }, 150);
    });
    ro.observe(document.body);

    // Timer to ensure everything updates on a regular basis
    setInterval(() => {
        updateFunctions.forEach(fn => fn());
    }, 2000);


    // Start
    updateMenuCommands();
    if (shouldAutoRun) {
        runWhenPageLoaded();
    }

})();
