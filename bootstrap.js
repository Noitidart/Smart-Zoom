// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');

const COMMONJS_URI = 'resource://gre/modules/commonjs';
const { require } = Cu.import(COMMONJS_URI + '/toolkit/require.js', {});
var CLIPBOARD = require('sdk/clipboard');

var BEAUTIFY = {};
(function() {
	var { require } = Cu.import('resource://devtools/shared/Loader.jsm', {});
	var { jsBeautify } = require('devtools/shared/jsbeautify/src/beautify-js');
	BEAUTIFY.js = jsBeautify;
}());

// Lazy Imports

// Globals
var core = {
	addon: {
		name: 'Zoomr',
		id: 'Zoomr@jetpack',
		version: null, // populated by `startup`
		path: {
			name: 'zoomr',
			//
			content: 'chrome://zoomr/content/',
			locale: 'chrome://zoomr/locale/',
			//
			resources: 'chrome://zoomr/content/resources/',
			images: 'chrome://zoomr/content/resources/images/',
			scripts: 'chrome://zoomr/content/resources/scripts/',
			styles: 'chrome://zoomr/content/resources/styles/',
			fonts: 'chrome://zoomr/content/resources/styles/fonts/',
			pages: 'chrome://zoomr/content/resources/pages/'
			// below are added by worker
			// storage: OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage')
			// filestore:
		},
		cache_key: Math.random()
	},
	os: {
		name: OS.Constants.Sys.Name,
		// // mname: added by worker
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		channel: Services.prefs.getCharPref('app.update.channel')
	}
};

var gFsComm;
var callInMainworker, callInContentinframescript, callInFramescript;

var gAndroidMenuIds = [];

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';


function install() {}
function uninstall(aData, aReason) {
    if (aReason == ADDON_UNINSTALL) {
		OS.File.removeDir(OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id), {ignorePermissions:true, ignoreAbsent:true}); // will reject if `jetpack` folder does not exist
	}
}

function startup(aData, aReason) {
	core.addon.version = aData.version;

	core.addon.path.storage = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage');
	core.addon.path.filestore = OS.Path.join(core.addon.path.storage, 'store.json');

    Services.scriptloader.loadSubScript(core.addon.path.scripts + 'comm/Comm.js');

	formatStringFromName('blah', 'main');
	console.log('_cache_formatStringFromName_packages:', _cache_formatStringFromName_packages);
	core.addon.l10n = _cache_formatStringFromName_packages;

	gFsComm = new Comm.server.framescript(core.addon.id);

	Services.mm.loadFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key, true);

	// desktop:insert_gui
	if (core.os.name != 'android') {

		// gGenCssUri = Services.io.newURI(core.addon.path.styles + 'general.css', null, null);
		// gCuiCssUri = Services.io.newURI(core.addon.path.styles + getCuiCssFilename(), null, null);
		//
		// // insert cui
		// Cu.import('resource:///modules/CustomizableUI.jsm');
		// CustomizableUI.createWidget({
		// 	id: 'cui_' + core.addon.path.name,
		// 	defaultArea: CustomizableUI.AREA_NAVBAR,
		// 	label: formatStringFromNameCore('gui_label', 'main'),
		// 	tooltiptext: formatStringFromNameCore('gui_tooltip', 'main'),
		// 	onCommand: guiClick
		// });

	}

	// // register must go after the above, as i set gCuiCssUri above
	// windowListener.register();

}

function shutdown(aData, aReason) {
	// callInMainworker('writeFilestore'); // do even on APP_SHUTDOWN

	if (aReason == APP_SHUTDOWN) {
		return;
	}

	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

    Comm.server.unregAll('framescript');

    // // desktop_android:insert_gui
    // if (core.os.name != 'android') {
	// 	CustomizableUI.destroyWidget('cui_' + core.addon.path.name);
	// } else {
	// 	for (var androidMenu of gAndroidMenus) {
	// 		var domwin = getStrongReference(androidMenu.domwin);
	// 		if (!domwin) {
	// 			// its dead
	// 			continue;
	// 		}
	// 		domwin.NativeWindow.menu.remove(androidMenu.menuid);
	// 	}
	// }

	// windowListener.unregister();

}

// start - addon functions
function fetchPrefs() {
	return {
		margin: 10,
		hold_time: 300,
		distance: 5 // pixels allowed to move in any dir
	};
}

function fetchCore() {
	return { core };
}
// start - common helper functions
function formatStringFromNameCore(aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements) {
	// 051916 update - made it core.addon.l10n based
    // formatStringFromNameCore is formating only version of the worker version of formatStringFromName, it is based on core.addon.l10n cache

	try { var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr]; if (!cLocalizedStr) { throw new Error('localized is undefined'); } } catch (ex) { console.error('formatStringFromNameCore error:', ex, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements); } // remove on production

	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr];
	// console.log('cLocalizedStr:', cLocalizedStr, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
    if (aReplacements) {
        for (var i=0; i<aReplacements.length; i++) {
            cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
        }
    }

    return cLocalizedStr;
}

function xhrSync(aUrl) {
	// notes to amo reviewer - i only use this for local files
	var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Ci.nsIXMLHttpRequest);
	xhr.open('GET', aUrl, false);
	xhr.send();
	return xhr;
}

// rev5 - for mainthread just change xhr to xhrSync not yet comitted to gist.github as of 082516 - https://gist.github.com/Noitidart/6d8a20739b9a4a97bc47
var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker // or if it includes chrome:// at the start then it fetches that
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string

	// returns null if aKey not found in pacakage

	var packagePath;
	var packageName;
	if (aLocalizedPackageName.indexOf('chrome:') === 0 || aLocalizedPackageName.indexOf('resource:') === 0) {
		packagePath = aLocalizedPackageName;
		packageName = aLocalizedPackageName.substring(aLocalizedPackageName.lastIndexOf('/') + 1, aLocalizedPackageName.indexOf('.properties'));
	} else {
		packagePath = core.addon.path.locale + aLocalizedPackageName + '.properties';
		packageName = aLocalizedPackageName;
	}

	if (!_cache_formatStringFromName_packages[packageName]) {
		var packageStr = xhrSync(packagePath).response;
		var packageJson = {};

		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}

		_cache_formatStringFromName_packages[packageName] = packageJson;

		console.log('packageJson:', packageJson);
	}

	var cLocalizedStr = _cache_formatStringFromName_packages[packageName][aKey];
	if (!cLocalizedStr) {
		return null;
	}
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}

	return cLocalizedStr;
}
