# A11y Tools

This GitHub repository is a storage location for digital accessibility userscripts that work with the Tampermonkey extension. They primarily interact with the Canvas LMS to make identifying and fixing accessibility issues easier and faster. If you have Tampermonkey installed, simply click the file you'd like to install followed by the `Raw` button. Tampermonkey will recognize the code and prompt you to install it.

## AutoA11yTools.user.js

This script provides multiple accessibility auditing tools that automatically run on Canvas LMS pages. It remembers which tools you have activated between sessions. The script can also be used on any webpage, but tools are disabled by default outside of Canvas. Tools can be toggled individually via the Tampermonkey command menu, or activated/deactivated all at once. The numpad `+` and `-` keys activate and deactivate all tools for faster workflow. The following tools are available:

| Tool                       | Usage                                                                                                                                                                                                                               |
|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Activate All A11y Tools     | Activates all a11y tools. (Also activated with the numpad `+` button)                                                                                                                                                               |
|Remove All A11y Tools       | Deactivates all a11y tools. (Also deactivated with the numpad `-` button)                                                                                                                                                           |
|Image Alt Text              | Adds overlays to images showing their alt text, decorative status, or missing alt text.                                                                                                                                             |
|Iframe Labels               | Adds overlays to iframes showing their aria-label, aria-description, and title — or indicating when they are missing. Emoji icons indicate what a screen-reader would read out, and colored text indicates what needs to be fixed.  |
|Heading Tags                | Adds overlays to headings showing what level of heading they are.                                                                                                                                                                   |
|Contrast Issues             | Highlights contrast issues with a blue outline.                                                                                                                                                                                     |
|\<i\>\/\<b\> Usage          | Highlights usage of \<i\> and \<b\> tags with a red outline. *Note: This tool has been commented out, as we no longer use it.*                                                                                                      |
|Lang Attributes             | Highlights potential non-English text that is missing a lang attribute. It uses the `englishWords.txt` file to determine whether text is English.                                                                                   |
|Table Problems              | Highlights tables that need scope attributes or have merged cells.                                                                                                                                                                  |

## ColorChecker.user.js

This script is a custom color contrast checker tool. Clicking it from the Tampermonkey menu toggles the checker, and then you can hover over text to see the color codes, contrast ratio, and whether or not it passes the WCAG requirements. It also accounts for font size. It uses the same color logic as the contrast issues tool from `AutoA11yTools.user.js`.

## H5PLanguageSelector.user.js

This script helps make editing language tags quicker in H5Ps. A dialog box prompts you to select a language, and this setting can be changed using the Tampermonkey dropdown menu. To use the tool, simply select the text you'd like to edit on an H5P, then type `Ctrl + Q` to apply the currently chosen language attribute to that text or click the language dropdown menu to automatically scroll to that language in the list.

## DownloadSLASpreadsheets.user.js

This script automatically runs through four pre-named filters on Teamwork and downloads the Excel files for each filter. The filters are named `SLA - Prototypes`, `SLA - 50% Reviews`, `SLA - PSIAs`, and `SLA - Peer Reviews`.

## ModuleCountingTool.user.js

This script labels each module in Canvas with its index (1-indexed) to easily determine which modules to use in a prototype review. It also adds a link to open all pages in the module.

## ClickRawHTMLEditor.user.js

This script switches away from the pretty HTML editor to the raw HTML editor on Canvas edit pages. If the option is toggled on, it also automatically switches from the visual editor to the raw HTML editor.

## RawHTMLEditorHelper.user.js

This script adds extra functionality to the raw HTML editor to make it more usable. The primary functionality is adding highlights for various accessibility-related parts of the HTML code:

| Color                                                                | Meaning                                                                  |
|----------------------------------------------------------------------|--------------------------------------------------------------------------|
| ![#00ff5a](https://placehold.co/15x15/00ff5a/00ff5a.png) - `#00ff5a` | aria-label="some aria-label"                                             |
| ![#ff0000](https://placehold.co/15x15/ff0000/ff0000.png) - `#ff0000` | title="some title" or aria-description="some aria-description"           |
| ![#00ffdc](https://placehold.co/15x15/00ffdc/00ffdc.png) - `#00ffdc` | alt="some alt text"                                                      |
| ![#ffdb00](https://placehold.co/15x15/ffdb00/ffdb00.png) - `#ffdb00` | \<table\>                                                                |
| ![#800080](https://placehold.co/15x15/800080/800080.png) - `#800080` | \<h#\>some heading\</h#\> (darker for \<h1\>, lighter for \<h6\>) |
| ![#005000](https://placehold.co/15x15/005000/005000.png) - `#005000` | lang="some lang attribute"                                               |

In addition to adding these highlights, this script adds a refined search box above the editor. It integrates with `Ctrl + F`. It also adds a button to fix aria-labels. When clicking this button, it modifies all iframes to only have aria-labels. If only one unique label (title, aria-label, or aria-description) exists, it assigns that. Otherwise, it prompts you to choose an accessible aria-label or type your own.

## CanvasFilePathTool.user.js

When in the Canvas Files menu with this script installed, hovering over a file adds a tooltip and a link to let you know where that file is located. This is particularly helpful for finding files with the search bar in order to re-upload them.

## ElementCountingTool.user.js

This script toggles 1-indexed borders around the element type selected from the Tampermonkey menu. This tool is particularly useful for identifying tables, iframes, or paragraph tags referenced by ARC reports.

## DropdownControlTool.user.js

This script allows you to type `Ctrl + ↓` and `Ctrl + ↑` to expand and collapse all dropdown menus on Canvas pages, which makes seeing all content on the page easier.
