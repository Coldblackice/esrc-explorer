/* Copyright (C) 2018 Off JustOff <Off.Just.Off@gmail.com>
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

const branch = "extensions.esrc-explorer.";
const apmo_pattern = /^https?:\/\/addons\.palemoon\.org\/addon\/(.*?)\//;
const apmo_download_pattern = /^https?:\/\/addons\.palemoon\.org\/\?component=download&id=(.+?)&version=(.+?)&hash/;
const apmo_match_pattern = '*://addons.palemoon.org/?component=download*';

let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
let styleSheetURI = Services.io.newURI("chrome://esrc-explorer/skin/style.css", null, null);
let navigator = {userAgent: Cc["@mozilla.org/network/protocol;1?name=http"].getService(Ci.nsIHttpProtocolHandler).userAgent};

let gWindowListener;

function ESrcExplorer(aWindow) {
  this.init(aWindow);
}
ESrcExplorer.prototype = {

  init: function(aWindow) {
    this.browserWindow = aWindow;
    this.tabBrowser = aWindow.gBrowser;

    if (Services.prefs.getBoolPref(branch + "showButton")) {
      this.addButton();
    }

    if (Services.prefs.getBoolPref(branch + "showContext")) {
      this.addContext();
    }

    this.prefBranch = Services.prefs.getBranch(branch);
    this.prefBranch.addObserver("", this, false);
  },

  done: function() {
    this.prefBranch.removeObserver("", this);
    this.prefBranch = null;

    if (Services.prefs.getBoolPref(branch + "showButton")) {
      this.removeButton();
    }

    if (Services.prefs.getBoolPref(branch + "showContext")) {
      this.removeContext();
    }

    this.tabBrowser = null;
    this.browserWindow = null;
  },

  observe: function(aSubject, aTopic, aData) {
    if (aTopic != "nsPref:changed") return;
    switch (aData) {
      case 'showButton':
        if (Services.prefs.getBoolPref(branch + "showButton")) {
          this.addButton();
        } else {
          this.removeButton();
        }
        break;
      case 'showContext':
        if (Services.prefs.getBoolPref(branch + "showContext")) {
          this.addContext();
        } else {
          this.removeContext();
        }
        break;
    }
  },

  openExplorerOrSave: function(aUrl, aSave) {
    let crx_url, filename;
    if (apmo_pattern.test(aUrl)) {
      try {
        crx_url = this.tabBrowser.getBrowserForTab(this.tabBrowser.selectedTab).
                    contentDocument.getElementsByClassName("dllink_green")[0].href;
      } catch(e) {}
    } else if (apmo_download_pattern.test(aUrl)) {
      crx_url = aUrl;
    } else {
      crx_url = get_crx_url(aUrl);
    }
    if (!crx_url) {
      Cu.reportError('Cannot find extension URL');
      return;
    }
    let match1 = apmo_download_pattern.exec(crx_url);
    if (match1) {
      let match2 = apmo_pattern.exec(this.tabBrowser.selectedTab.linkedBrowser.currentURI.spec);
      if (match2) {
        filename = match2[1] + "-" + match1[2] + ".zip";
      } else {
        filename = match1[1] + "-" + match1[2] + ".zip";
      }
    } else {
      filename = get_zip_name(crx_url);
    }
    if (aSave) {
      this.browserWindow.internalSave(crx_url, null, filename, null, "application/zip",
        true, null, null, this.tabBrowser.selectedTab.linkedBrowser.currentURI,
        this.tabBrowser.ownerDocument, false, null);
    } else {
      let newtab = this.tabBrowser.addTab("chrome://esrc-explorer/content/crxviewer.html" +
                   '?' + encodeQueryString({crx: crx_url, zipname: filename}), {relatedToCurrent: true})
      this.tabBrowser.moveTabTo(newtab, this.tabBrowser.tabContainer.selectedIndex + 1);
      this.tabBrowser.selectedTab = newtab;
    }
  },

  updateButton: function(aURI) {
    let isExtUrl = cws_pattern.test(aURI.spec) || ows_pattern.test(aURI.spec) ||
                   amo_pattern.test(aURI.spec) || amo_file_version_pattern.test(aURI.spec);
//                   apmo_pattern.test(aURI.spec);
    if (isExtUrl) {
      this.button.style.display = "block";
    } else {
      this.button.style.display = "none";
    }
  },

  onLocationChange: function(aWebProgress, aRequest, aLocation, aFlag) {
    this.updateButton(aLocation);
  },

  onClickButton: function(aEvent) {
    this.openExplorerOrSave(this.tabBrowser.selectedTab.linkedBrowser.currentURI.spec, 
                            aEvent.ctrlKey || aEvent.metaKey);
  },

  addButton: function() {
    let document = this.tabBrowser.ownerDocument;
    let button = document.createElement("image");
    button.setAttribute("id", "esrc-explorer-button");
    button.setAttribute("class", "urlbar-icon");
    button.setAttribute("tooltiptext", "Explore extension source\n(hold Ctrl to download)");
    button.setAttribute("onclick", "gBrowser.ESrcExplorer.onClickButton(event);"); 
    let urlBarIcons = document.getElementById("urlbar-icons");
    urlBarIcons.insertBefore(button, urlBarIcons.firstChild);
    this.button = button;
    this.updateButton(this.tabBrowser.selectedTab.linkedBrowser.currentURI);
    this.tabBrowser.addProgressListener(this);
  },

  removeButton: function() {
    this.tabBrowser.removeProgressListener(this);
    this.button.parentNode.removeChild(this.button);
    this.button = null;
  },

  onClickContext: function(aEvent) {
    let citem = this.browserWindow.document.getElementById("esrc-explorer-item");
    this.openExplorerOrSave(citem.getAttribute("data-url"), aEvent.ctrlKey || aEvent.metaKey);
  },

  popupShowing: function(aEvent) {
    let mrw = Services.wm.getMostRecentWindow("navigator:browser");
    let citem = mrw.document.getElementById("esrc-explorer-item");
    citem.hidden = true;
    if (mrw.gContextMenu.linkURL) {
      let srcURI = Services.io.newURI(mrw.gContextMenu.linkURL, null, null);
      if (mrw.gBrowser.ESrcExplorer.targetUrlMatchPattern.matches(srcURI)) {
        citem.setAttribute("data-url", mrw.gContextMenu.linkURL);
        citem.setAttribute("label", "Explore linked extension source");
        citem.hidden = false;
      } else if (mrw.gBrowser.ESrcExplorer.targetUrlMatchPatternAMO.matches(srcURI)) {
        citem.setAttribute("data-url", mrw.gContextMenu.linkURL);
        citem.setAttribute("label", "Explore linked extension source (latest approved version)");
        citem.hidden = false;
      } else if (aEvent.ctrlKey || aEvent.metaKey) {
        citem.setAttribute("data-url", mrw.gContextMenu.linkURL);
        citem.setAttribute("label", "Explore linked file source");
        citem.hidden = false;
      }
    }
  },

  addContext: function() {
    this.targetUrlMatchPattern = new MatchPattern([
      '*://*/*.crx*', '*://*/*.CRX*',
      '*://*/*.nex*', '*://*/*.NEX*',
      '*://*/*.xpi*', '*://*/*.XPI*',
      cws_match_pattern, ows_match_pattern,
      amo_file_version_match_pattern, //apmo_match_pattern,
    ]);
    this.targetUrlMatchPatternAMO = new MatchPattern(amo_match_patterns);
    let cmenu = this.browserWindow.document.getElementById("contentAreaContextMenu");
    let citem = this.browserWindow.document.createElement("menuitem");
    citem.setAttribute("id", "esrc-explorer-item");
    citem.setAttribute("class", "menuitem-iconic");
    citem.setAttribute("onclick", "gBrowser.ESrcExplorer.onClickContext(event);"); 
    cmenu.appendChild(citem);
    cmenu.addEventListener("popupshowing", this.popupShowing, false);
  },

  removeContext: function() {
    let cmenu = this.browserWindow.document.getElementById("contentAreaContextMenu");
    cmenu.removeEventListener("popupshowing", this.popupShowing);
    let citem = this.browserWindow.document.getElementById("esrc-explorer-item");
    cmenu.removeChild(citem);
    this.targetUrlMatchPattern = null;
    this.targetUrlMatchPatternAMO = null;
  },
};

function BrowserWindowObserver(aHandlers) {
  this.handlers = aHandlers;
}

BrowserWindowObserver.prototype = {
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "domwindowopened") {
      aSubject.QueryInterface(Ci.nsIDOMWindow).addEventListener("load", this, false);
    } else if (aTopic == "domwindowclosed") {
      if (aSubject.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
        this.handlers.onShutdown(aSubject);
      }
    }
  },
  handleEvent: function(aEvent) {
    let aWindow = aEvent.currentTarget;
    aWindow.removeEventListener(aEvent.type, this, false);

    if (aWindow.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
      this.handlers.onStartup(aWindow);
    }
  }
};

function browserWindowStartup(aWindow) {
  aWindow.gBrowser || aWindow.getBrowser();
  aWindow.gBrowser.ESrcExplorer = new ESrcExplorer(aWindow);
}

function browserWindowShutdown(aWindow) {
  aWindow.gBrowser.ESrcExplorer.done();
  delete aWindow.gBrowser.ESrcExplorer;
}

let esrcexplorerObserver = {
  observe: function(aSubject, aTopic, aData) {
    if (aData == "Run") {
      let mrw = Services.wm.getMostRecentWindow("navigator:browser");
      let newtab = mrw.gBrowser.addTab("chrome://esrc-explorer/content/crxviewer.html", {relatedToCurrent: true})
      mrw.gBrowser.moveTabTo(newtab, mrw.gBrowser.tabContainer.selectedIndex + 1);
      mrw.gBrowser.selectedTab = newtab;
    }
  }
};

function startup(aData, aReason) {
  let defaultBranch = Services.prefs.getDefaultBranch(branch);
  defaultBranch.setCharPref("simpleStorage", "{}");
  defaultBranch.setBoolPref("showButton", true);
  defaultBranch.setBoolPref("showContext", true);

  Cu.import("chrome://esrc-explorer/content/MatchPattern.jsm");

  Services.scriptloader.loadSubScript("chrome://esrc-explorer/content/chrome-platform-info.js");
  Services.scriptloader.loadSubScript("chrome://esrc-explorer/content/cws_pattern.js");

  if (!styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.USER_SHEET)) {
    styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.USER_SHEET);
  }

  Services.obs.addObserver(esrcexplorerObserver, "esrcexplorerEvent", false);

  gWindowListener = new BrowserWindowObserver({
    onStartup: browserWindowStartup,
    onShutdown: browserWindowShutdown
  });
  Services.ww.registerNotification(gWindowListener);

  let winenu = Services.wm.getEnumerator("navigator:browser");
  while (winenu.hasMoreElements()) {
    browserWindowStartup(winenu.getNext());
  }

setTimeout(function() { // migrate to GitHub
  Cu.import("resource://gre/modules/Services.jsm");
  var migrate;
  try { migrate = Services.prefs.getBoolPref("extensions.justoff-migration"); } catch(e) {}
  if (typeof migrate == "boolean") return;
  Services.prefs.getDefaultBranch("extensions.").setBoolPref("justoff-migration", true);
  Cu.import("resource://gre/modules/AddonManager.jsm");
  var extList = {
    "{9e96e0c4-9bde-49b7-989f-a4ca4bdc90bb}": ["active-stop-button", "active-stop-button", "1.5.15", "md5:b94d8edaa80043c0987152c81b203be4"],
    "abh2me@Off.JustOff": ["add-bookmark-helper", "add-bookmark-helper", "1.0.10", "md5:f1fa109a7acd760635c4f5afccbb6ee4"],
    "AdvancedNightMode@Off.JustOff": ["advanced-night-mode", "advanced-night-mode", "1.0.13", "md5:a1dbab8231f249a3bb0b698be79d7673"],
    "behind-the-overlay-me@Off.JustOff": ["dismiss-the-overlay", "dismiss-the-overlay", "1.0.7", "md5:188571806207cef9e6e6261ec5a178b7"],
    "CookiesExterminator@Off.JustOff": ["cookies-exterminator", "cookexterm", "2.9.10", "md5:1e3f9dcd713e2add43ce8a0574f720c7"],
    "esrc-explorer@Off.JustOff": ["esrc-explorer", "esrc-explorer", "1.1.6", "md5:2727df32c20e009219b20266e72b0368"],
    "greedycache@Off.JustOff": ["greedy-cache", "greedy-cache", "1.2.3", "md5:a9e3b70ed2a74002981c0fd13e2ff808"],
    "h5vtuner@Off.JustOff": ["html5-video-tuner", "html5-media-tuner", "1.2.5", "md5:4ec4e75372a5bc42c02d14cce334aed1"],
    "location4evar@Off.JustOff": ["L4E", "location-4-evar", "1.0.8", "md5:32e50c0362998dc0f2172e519a4ba102"],
    "lull-the-tabs@Off.JustOff": ["lull-the-tabs", "lull-the-tabs", "1.5.2", "md5:810fb2f391b0d00291f5cc341f8bfaa6"],
    "modhresponse@Off.JustOff": ["modify-http-response", "modhresponse", "1.3.8", "md5:5fdf27fd2fbfcacd5382166c5c2c185c"],
    "moonttool@Off.JustOff": ["moon-tester-tool", "moon-tester-tool", "2.1.3", "md5:553492b625a93a42aa541dfbdbb95dcc"],
    "password-backup-tool@Off.JustOff": ["password-backup-tool", "password-backup-tool", "1.3.2", "md5:9c8e9e74b1fa44dd6545645cd13b0c28"],
    "pmforum-smart-preview@Off.JustOff": ["pmforum-smart-preview", "pmforum-smart-preview", "1.3.5", "md5:3140b6ba4a865f51e479639527209f39"],
    "pxruler@Off.JustOff": ["proxy-privacy-ruler", "pxruler", "1.2.4", "md5:ceadd53d6d6a0b23730ce43af73aa62d"],
    "resp-bmbar@Off.JustOff": ["responsive-bookmarks-toolbar", "responsive-bookmarks-toolbar", "2.0.3", "md5:892261ad1fe1ebc348593e57d2427118"],
    "save-images-me@Off.JustOff": ["save-all-images", "save-all-images", "1.0.7", "md5:fe9a128a2a79208b4c7a1475a1eafabf"],
    "tab2device@Off.JustOff": ["send-link-to-device", "send-link-to-device", "1.0.5", "md5:879f7b9aabf3d213d54c15b42a96ad1a"],
    "SStart@Off.JustOff": ["speed-start", "speed-start", "2.1.6", "md5:9a151e051e20b50ed8a8ec1c24bf4967"],
    "youtubelazy@Off.JustOff": ["youtube-lazy-load", "youtube-lazy-load", "1.0.6", "md5:399270815ea9cfb02c143243341b5790"]
  };
  AddonManager.getAddonsByIDs(Object.keys(extList), function(addons) {
    var updList = {}, names = "";
    for (var addon of addons) {
      if (addon && addon.updateURL == null) {
        var url = "https://github.com/JustOff/" + extList[addon.id][0] + "/releases/download/" + extList[addon.id][2] + "/" + extList[addon.id][1] + "-" + extList[addon.id][2] + ".xpi";
        updList[addon.name] = {URL: url, Hash: extList[addon.id][3]};
        names += '"' + addon.name + '", ';
      }
    }
    if (names == "") {
      Services.prefs.setBoolPref("extensions.justoff-migration", false);
      return;
    }
    names = names.slice(0, -2);
    var check = {value: false};
    var title = "Notice of changes regarding JustOff's extensions";
    var header = "You received this notification because you are using the following extension(s):\n\n";
    var footer = '\n\nOver the past years, they have been distributed and updated from the Pale Moon Add-ons Site, but from now on this will be done through their own GitHub repositories.\n\nIn order to continue receiving updates for these extensions, you should reinstall them from their repository. If you want to do it now, click "Ok", or select "Cancel" otherwise.\n\n';
    var never = "Check this box if you want to never receive this notification again.";
    var mrw = Services.wm.getMostRecentWindow("navigator:browser");
    if (mrw) {
      var result = Services.prompt.confirmCheck(mrw, title, header + names + footer, never, check);
      if (result) {
        mrw.gBrowser.selectedTab.linkedBrowser.contentDocument.defaultView.InstallTrigger.install(updList);
      } else if (check.value) {
        Services.prefs.setBoolPref("extensions.justoff-migration", false);
      }
    }
  });
}, (10 + Math.floor(Math.random() * 10)) * 1000);

}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) return;

  Services.ww.unregisterNotification(gWindowListener);
  gWindowListener = null;

  let winenu = Services.wm.getEnumerator("navigator:browser");
  while (winenu.hasMoreElements()) {
    browserWindowShutdown(winenu.getNext());
  }

  Services.obs.removeObserver(esrcexplorerObserver, "esrcexplorerEvent");

  if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.USER_SHEET)) {
    styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.USER_SHEET);
  }

  Cu.unload("chrome://esrc-explorer/content/MatchPattern.jsm");
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
