## Extension Source Explorer

This add-on for [Pale Moon](https://www.palemoon.org/) and [SeaMonkey](https://www.seamonkey-project.org/) is designed to explore source code of extensions for various applications (Chrome, Firefox, Opera, Pale Moon, SeaMonkey, Thunderbird, etc.) using [CRX Viewer](https://github.com/Rob--W/crxviewer) engine by [Rob Wu](https://robwu.nl/).

Use the "Explore" button in the address bar that is available on the pages in the extensions galleries or the "Explore" item in the context menu that is linked to the extension file to open it in the source viewer. Hold the Ctrl key while pressing the button or selecting the menu item to download the extension and save it to disk. Hold the Ctrl key while opening the context menu to process a link to a file that is not detected as an extension automatically.

Supported extension galleries are: [Chrome Web Store](https://chrome.google.com/webstore/), [Mozilla Add-ons (AMO)](https://addons.mozilla.org/), [Opera add-ons](https://addons.opera.com/), [Pale Moon Add-ons Site](https://addons.palemoon.org/).

CRX Viewer engine provides the following features:

  - Download-as-zip and download-as-crx at the upper-right corner
  - List of file names, and the option to filter files with a regular expression
  - Find files containing a string, or with content matching a regular expression
  - Quickly jump between search results, or from/to a specific line
  - Automatic beautification (formatting) of code
  - Syntax highlighting
  - Image preview
  - Show hashes (md5, sha1, sha256, sha384, sha512) of the file content
  - View content of embedded zip files
  - Download Chrome Web Store extensions for a different platform (e.g. Chrome OS or NaCl)
  - View the contents of any zip file

[Extension Source Explorer](https://github.com/JustOff/esrc-explorer/releases) is implemented as a classic XUL add-on to bring CRX Viewer to users of browsers that do not support WebExtensions.
