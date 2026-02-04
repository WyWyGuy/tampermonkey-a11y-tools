// ==UserScript==
// @name         Module Counting Tool
// @namespace    http://tampermonkey.net/
// @version      2026-02-04
// @description  Label modules to easily see their indices
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*
// @match        https://byuis.instructure.com/courses/*
// @match        https://byuismastercourses.instructure.com/courses/*
// @match        https://byuohs.instructure.com/courses/*
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ModuleCountingTool.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ModuleCountingTool.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Only run on home and modules pages
    const url = window.location.href;
    const isModulesPage = /\/courses\/\d+\/modules\/?$/.test(url);
    const isHomePage = /\/courses\/\d+\/?$/.test(url) && !isModulesPage;
    if (!isModulesPage && !isHomePage) {
        return;
    }

    // Remove any old helper elements
    document.querySelectorAll('.AccessibilityHelper-label,.AccessibilityHelper-border').forEach(e => e.remove());

    // Inject styles once
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

    function isVisible(el) {
        if (!(el instanceof Element)) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return !!(el.offsetParent || r.width > 0 || r.height > 0);
    }

    // Select all target divs
    const modules = [...document.querySelectorAll('div.context_module.editable_context_module')];

    modules.forEach((mod, i) => {
        const label = document.createElement('div');
        label.className = 'AccessibilityHelper AccessibilityHelper-label';
        label.innerHTML = `Module ${i + 1} (<u class="open-all-links" style="cursor:pointer;color:#0066cc;">Open all links</u>)`;

        const openAllBtn = label.querySelector('.open-all-links');

        openAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Find the module content area
            const content = mod.querySelector('.context_module_items');
            if (!content) return;

            // Select ONLY real content links (module item titles)
            const links = content.querySelectorAll(
                '.module-item-title a.title, .module-item-title a.ig-title'
            );

            links.forEach(link => {
                const href = link.href;

                // Safety checks
                if (!href) return;
                if (href.startsWith('javascript:')) return;

                window.open(href, '_blank', 'noopener');
            });
        });


        const border = document.createElement('div');
        border.className = 'AccessibilityHelper AccessibilityHelper-border';

        document.body.appendChild(label);
        document.body.appendChild(border);

        function update() {
            const r = mod.getBoundingClientRect();
            if (isVisible(mod)) {
                label.style.display = 'block';
                border.style.display = 'block';
                const top = window.scrollY + r.top;
                const left = window.scrollX + r.left;
                label.style.top = top + 'px';
                label.style.left = left + 'px';
                border.style.top = top + 'px';
                border.style.left = left + 'px';
                border.style.width = r.width + 'px';
                border.style.height = r.height + 'px';
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
        mod.addEventListener('mouseover', hi);
        mod.addEventListener('mouseout', un);

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
})();
