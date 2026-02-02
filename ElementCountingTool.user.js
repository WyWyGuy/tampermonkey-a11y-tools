// ==UserScript==
// @name         Element Counting Tool
// @namespace    http://tampermonkey.net/
// @version      2026-02-02
// @description  Label elements to easily see their indices
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*
// @match        https://byuis.instructure.com/courses/*
// @match        https://byuismastercourses.instructure.com/courses/*
// @match        https://byuohs.instructure.com/courses/*
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ElementCountingTool.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ElementCountingTool.user.js
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // --- Styles ---
    if (!document.getElementById('accessibility-helper-style')) {
        const s = document.createElement('style');
        s.id = 'accessibility-helper-style';
        s.textContent = `
            .AccessibilityHelper-label {
                background:#FFF;
                border:3px solid #CCC;
                border-radius:4px;
                padding:2px 4px;
                position:absolute;
                white-space:nowrap;
                font-size:12px;
                z-index:10001;
                color:black;
                transition:all 0.2s ease;
                display:none;
            }
            .AccessibilityHelper-border {
                position:absolute;
                border:3px solid #CCC;
                border-radius:4px;
                z-index:9999;
                pointer-events:none;
                transition:all 0.2s ease;
                display:none;
            }
            .AccessibilityHelper-highlight {
                border-color:#393!important;
                box-shadow:1px 2px 5px #CCC;
            }
        `;
        document.head.appendChild(s);
    }

    // --- Utility ---
    function isVisible(el) {
        if (!(el instanceof Element)) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return !!(el.offsetParent || r.width > 0 || r.height > 0);
    }

    const activeHighlights = {};

    // --- Core highlight function ---
    function highlightElements(selector, labelPrefix, typeKey) {
        if (activeHighlights[typeKey]) {
            activeHighlights[typeKey].forEach(e => e.remove());
            activeHighlights[typeKey] = null;
            return;
        }

        let elements = [...document.querySelectorAll(selector)];

        elements = elements.filter(el => el.id !== 'instructure_ajax_error_result');

        const createdElements = [];

        elements.forEach((el, i) => {
            const label = document.createElement('div');
            label.className = 'AccessibilityHelper AccessibilityHelper-label';
            label.textContent = `${labelPrefix} ${i + 1}`;

            const border = document.createElement('div');
            border.className = 'AccessibilityHelper AccessibilityHelper-border';

            document.body.appendChild(label);
            document.body.appendChild(border);

            createdElements.push(label, border);

            function update() {
                const r = el.getBoundingClientRect();
                if (isVisible(el)) {
                    label.style.display = 'block';
                    border.style.display = 'block';
                    const top = window.scrollY + r.top;
                    const left = window.scrollX + r.left;
                    border.style.top = top + 'px';
                    border.style.left = left + 'px';
                    border.style.width = r.width + 'px';
                    border.style.height = r.height + 'px';
                    label.style.top = top + 'px';
                    label.style.left = (left + r.width - label.offsetWidth) + 'px';
                } else {
                    label.style.display = 'none';
                    border.style.display = 'none';
                }
            }

            function hi() {
                label.classList.add('AccessibilityHelper-highlight');
                border.classList.add('AccessibilityHelper-highlight');
            }

            function un() {
                label.classList.remove('AccessibilityHelper-highlight');
                border.classList.remove('AccessibilityHelper-highlight');
            }

            label.addEventListener('mouseover', hi);
            label.addEventListener('mouseout', un);
            el.addEventListener('mouseover', hi);
            el.addEventListener('mouseout', un);

            update();
            window.addEventListener('scroll', update);
            window.addEventListener('resize', update);
            new MutationObserver(update).observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style','class','hidden','open']
            });
        });

        activeHighlights[typeKey] = createdElements;
    }

    // --- Menu commands ---
    const elementTypes = [
        { selector: 'table', label: 'Table', key: 'table' },
        { selector: 'iframe', label: 'iFrame', key: 'iframe' }
    ];

    elementTypes.forEach(type => {
        GM_registerMenuCommand(`Count ${type.label}s`, () => {
            highlightElements(type.selector, type.label, type.key);
        });
    });

})();
