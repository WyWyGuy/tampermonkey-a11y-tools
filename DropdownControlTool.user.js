// ==UserScript==
// @name         Dropdown Control Tool
// @namespace    http://tampermonkey.net/
// @version      2026-02-25.2
// @description  Use alt + ↓ and alt + ↑ hotkeys to expand and collapse all dropdown menus. Also, adds a menu command to expand dropdowns by default
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*
// @match        https://byuis.instructure.com/courses/*
// @match        https://byuismastercourses.instructure.com/courses/*
// @match        https://byuohs.instructure.com/courses/*
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/DropdownControlTool.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/DropdownControlTool.user.js
// ==/UserScript==

(function() {
    'use strict';

    const AUTO_EXPAND_KEY = 'autoExpand';
    let autoExpandEnabled = GM_getValue(AUTO_EXPAND_KEY, false);
    let menuId = null;

    function updateMenu() {
        if (menuId) {
            try { GM_unregisterMenuCommand(menuId); } catch (e) {}
        }

        const label = `${autoExpandEnabled ? '🟩' : '⬜'} Expand Dropdowns: ${autoExpandEnabled ? 'ON' : 'OFF'}`;

        menuId = GM_registerMenuCommand(label, () => {
            autoExpandEnabled = !autoExpandEnabled;
            GM_setValue(AUTO_EXPAND_KEY, autoExpandEnabled);
            updateMenu();
        });
    }

    function expandAll() {
        document.querySelectorAll('details').forEach(d => {
            d.open = true;
        });

        document.querySelectorAll('.dp-panel-content').forEach(panel => {
            panel.style.removeProperty('display');
        });
    }

    function collapseAll() {
        document.querySelectorAll('details').forEach(d => {
            d.open = false;
        });

        document.querySelectorAll('.dp-panel-content').forEach(panel => {
            panel.style.setProperty('display', 'none');
        });
    }

    function runWhenPageLoaded() {
        if (!autoExpandEnabled) return;

        let timeout = null;
        const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = setTimeout(() => {
                    expandAll();
                }, 500);
                observer.disconnect();
            }, 500);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'ArrowDown') {
            e.preventDefault();
            expandAll();
        }
        if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            collapseAll();
        }
    });

    updateMenu();
    runWhenPageLoaded();

})();
