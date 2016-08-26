// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/AddonManager.jsm');
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
		},
		cache_key: Math.random()
	},
	os: {
		// // name: added by worker
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

var gWkComm;
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

    Services.scriptloader.loadSubScript(core.addon.path.scripts + 'comm/Comm.js');
    ({ callInMainworker, callInContentinframescript, callInFramescript } = CommHelper.bootstrap);

    gWkComm = new Comm.server.worker(core.addon.path.scripts + 'MainWorker.js?' + core.addon.cache_key, ()=>core, function(aArg, aComm) {
        ({ core } = aArg);

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

    });

    callInMainworker('dummyForInstantInstantiate');
}

function shutdown(aData, aReason) {
	// callInMainworker('writeFilestore'); // do even on APP_SHUTDOWN

	if (aReason == APP_SHUTDOWN) {
		return;
	}

	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

    Comm.server.unregAll('framescript');
    Comm.server.unregAll('worker');

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
		hold_time: 300
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
