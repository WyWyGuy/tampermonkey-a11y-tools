// ==UserScript==
// @name         Click Raw HTML Editor
// @namespace    http://tampermonkey.net/
// @version      2025-03-11
// @description  Automatically select the raw HTML editor option on Canvas edit pages
// @author       Wyatt Nilsson
// @match        https://byu.instructure.com/courses/*
// @match        https://byuis.instructure.com/courses/*
// @match        https://byuismastercourses.instructure.com/courses/*
// @match        https://byuohs.instructure.com/courses/*
// @icon         https://assets.topadvisor.com/media/_solution_logo_03202023_46576647.png
// @updateURL    https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ClickRawHTMLEditor.user.js
// @downloadURL  https://raw.githubusercontent.com/WyWyGuy/tampermonkey-auto-a11y-tools-script/main/ClickRawHTMLEditor.user.js
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    "use strict";

    // Deprecated tool, functionality has been combined with Raw HTML Editor Helper
    return;

    const AUTO_HTML_KEY = "auto_html_editor";
    let autoSwitch = GM_getValue(AUTO_HTML_KEY, true);

    function registerMenu() {
        GM_registerMenuCommand(
            `${autoSwitch ? "🟩" : "⬜"} Auto HTML Editor: ${autoSwitch ? "ON" : "OFF"}`,
            () => {
                autoSwitch = !autoSwitch;
                GM_setValue(AUTO_HTML_KEY, autoSwitch);
                registerMenu();
                scanForButtons();
            },
            { id: "auto-html-toggle" }
        );
    }

    registerMenu();

    const clicked = new WeakSet();

    function clickIfEligible(el) {
        if (!el || clicked.has(el)) return;
        clicked.add(el);
        setTimeout(() => {
            el.click();
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: "instant" });
            }, 300);
        }, 250);
    }

    function scanForButtons(root = document) {
        const rawMatches = [...root.querySelectorAll("button")].filter(el => el.textContent.includes("Switch to raw HTML Editor"));
        rawMatches.forEach(clickIfEligible);

        if (autoSwitch) {
            const htmlButtons = [...root.querySelectorAll("button")].filter(el => {
                if (clicked.has(el)) return false;

                const title = el.getAttribute?.("title") || "";
                const text = el.textContent || "";

                return (
                    title.includes("Switch to the rich text editor") ||
                    title.includes("Click or shift-click for the html editor") ||
                    text.includes("Switch to the rich text editor") ||
                    text.includes("Switch to the html editor")
                );
            });

            htmlButtons.forEach(clickIfEligible);
        }
    }

    scanForButtons();

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.addedNodes) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === 1) {
                        scanForButtons(node);
                    }
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    setInterval(scanForButtons, 500);
})();
