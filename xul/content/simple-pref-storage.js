/* Copyright (C) 2018 Off JustOff <Off.Just.Off@gmail.com>
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/Services.jsm");

var prefStorage = JSON.parse(Services.prefs.getCharPref("extensions.esrc-explorer.simpleStorage"));

var simpleStorage = {
  getItem: function(aItem) {
    return prefStorage[aItem];
  },
  setItem: function(aItem, aValue) {
    prefStorage[aItem] = aValue;
    Services.prefs.setCharPref("extensions.esrc-explorer.simpleStorage", JSON.stringify(prefStorage));
  },
}