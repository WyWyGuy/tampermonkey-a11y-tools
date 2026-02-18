// ==UserScript==
// @name         Dropdown Control Tool
// @namespace    http://tampermonkey.net/
// @version      2026-02-18.1
// @description  Use ctrl + ↓ and ctrl + ↑ hotkeys to expand and collapse all dropdown menus
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*
// @match        https://byuis.instructure.com/courses/*
// @match        https://byuismastercourses.instructure.com/courses/*
// @match        https://byuohs.instructure.com/courses/*
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @grant        none
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/DropdownControlTool.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/DropdownControlTool.user.js
// ==/UserScript==

(function() {
    'use strict';

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

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'ArrowDown') {
            e.preventDefault();
            expandAll();
        }
        if (e.ctrlKey && e.key === 'ArrowUp') {
            e.preventDefault();
            collapseAll();
        }
    });

})();
