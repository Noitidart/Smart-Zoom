const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Zoomr',
	id: 'Zoomr@jetpack', //because pref listener inits before startup and in startup is where aData.self.id becomes available
	aData: 0
};

var myServices = {};
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'as', function () {
	return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService)
});

var lastOutlined = null; //holds el
var timeout = null;
var timeoutWin;
var trigger = 0;

function outlineHelper(e) {

	if (!e.shiftKey || !e.ctrlKey) {
		return;
	}

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstart', dragstarted, true);

	var elWin = e.originalTarget.ownerDocument.defaultView;
	var win = elWin.top;

	var el = {
		target: {
			el: e.originalTarget,
		},
		parent: {
			el: e.originalTarget,
		},
		doc: {
			el: win.document.documentElement,
		}
	};

	var cScale = el.doc.el.style.transform.match(/\d+\.\d+/);
	cScale = cScale ? parseFloat(cScale) : 1;
	if (cScale != 1) {

		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - Outline Fail', 'Already zoomed in');
		return;
	}
	if (!el.parent.el) {
		if (cScale != 1) {
			//zooming out
			el.parent.el = el.target.el;
		} else {

			return;
		}
	} else {
		for (var r = 0; r < 1; r++) {
			while (el.parent.el && el.parent.el.ownerDocument.defaultView.getComputedStyle(el.parent.el, null).display == 'inline') {
				el.parent.el = el.parent.el.parentNode;
			}

			for (var e in el) {
				el[e].rect = el[e].el.getBoundingClientRect();
			}
			scaleBy = el.doc.rect.width / el.parent.rect.width;
			if (scaleBy > scaleMax) {
				//el.parent.el = el.parent.el.parentNode;
				//r = -1;

			}
		}

		if (scaleBy < scaleMin) {

			myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - Failed Zoom', 'scaleBy < scaleMin so not scalling. scaleBy = ' + scaleMin);
			return;
		}
	}

	for (var e in el) {
		el[e].rect = el[e].el.getBoundingClientRect();
	}

	var zEl = null; //zoomEl decide which el to zoom, el or elP
	var gEl = null; //guidEl decide which el to use for guiding scroll bars

	//consider zooming parent if target == parent. then on second click zoom target
	if (cScale == 1) {

		zEl = 'parent';
		gEl = 'target';
	} else if (cScale != 1) {

		zEl = 'doc';
		gEl = 'target';
	} else {
		('Zoomr :: ', 'zoom parent');
		zEl = 'parent';
		gEl = 'target';
	}

	boxit(el[zEl].el);
}

function boxit(el) {

	var win = el.ownerDocument.defaultView.top;
	var doc = win.document;

	var rect = el.getBoundingClientRect();
	var can = doc.querySelector('#dbltapzcan');
	if (!can) {
		can = doc.createElement('canvas');
		//alert(doc.documentElement.innerHTML);
		doc.documentElement.appendChild(can);
	}
	can.style.pointerEvents = 'none';
	can.style.outline = '10px solid red';
	can.style.width = rect.width + 'px';
	can.style.height = rect.height + 'px';
	can.style.left = (rect.left + win.pageXOffset) + 'px';
	can.style.top = (rect.top + win.pageYOffset) + 'px';
	can.style.position = 'absolute';
	can.setAttribute('id', 'dbltapzcan');
}

var added = false;

function keyDowned(e) {
	if (added) {
		return
	}
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
	if (e.shiftKey && e.ctrlKey) {
		added = true;
		var DOMWindow = e.target.ownerDocument.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
		if (DOMWindow.gBrowser) {
			DOMWindow.gBrowser.addEventListener('mouseover', outlineHelper, true);
		} else {
			DOMWindow.addEventListener('mouseover', outlineHelper, true);
		}

		//use ctypes to get coords and then elem from point and then outlineHelper that
	}
}

function keyUpped(e) {
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
	if (e.shiftKey || e.ctrlKey) {

		var DOMWindow = e.target.ownerDocument.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
		if (DOMWindow.gBrowser) {
			DOMWindow.gBrowser.removeEventListener('mouseover', outlineHelper, true);
		} else {
			DOMWindow.removeEventListener('mouseover', outlineHelper, true);
		}
		added = false;

		var win = e.originalTarget.ownerDocument.defaultView.top;
		var doc = win.document;

		var can = doc.querySelector('#dbltapzcan');
		if (can) {
			can.parentNode.removeChild(can);
		}

	}
}

function moved(e) {
	var cX = e.clientX;
	var cY = e.clientY;
	var diffX = Math.abs(initX - cX);
	var diffY = Math.abs(initY - cY);
	if (diffX < 3 && diffY < 3) {

		return;
	}

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstarted', dragstarted, true);
	timeoutWin.clearTimeout(timeout);
	timeout = null;
	//moved mouse so they are doing selecting/highlighting so cancel listening to the hold
}

function dragstarted(e) {

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('dragstarted', dragstarted, true);
	win.removeEventListener('mousemove', moved, true);
	timeoutWin.clearTimeout(timeout);
	timeout = null;
	//moved mouse so they are doing selecting/highlighting so cancel listening to the hold
}

var zoomed = false;
var initX = 0; //on down records init coords
var initY = 0; //on down records init coords
var initScrollX = 0; //pre zoom scroll bars
var initScrollY = 0; //pre zoom scroll bars
var moveTolerance = 3; //on move if movement exceeds this px, uses init coords, then clear listen for hold

function downed(e) {
	if (!timeout && e.button != trigger) {
		return;
	}
	if (timeout && e.button != trigger) {
		if (timeout) { //this is redundant if but i copied pasted from other preventers in like wheeled etc this so leaving for consistency

			var win = e.originalTarget.ownerDocument.defaultView;
			timeoutWin.clearTimeout(timeout);
			timeout = null;
			win.removeEventListener('mousemove', moved, true);
			win.removeEventListener('dragstart', dragstarted, true);
		}
		return;
	}

	zoomed = false;

	//start - test to see if user is on scroll bar or find bar
	if (Object.prototype.toString.call(e.view) == '[object ChromeWindow]') {
		//this works for findbar
		if (e.view.gBrowser) {

			return;
		}
	}
	/*
	//this doesnt work for anything
	try {
		var ownerDocument = e.originalTarget.ownerDocument;
	} catch (ex) {

		return;
	}
	*/
	if (e.originalTarget.namespaceURI == 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul') {
		//this works for scrollbar

		return;
	}
	//end - test to see if user is on scroll bar
	if (!e.shiftKey || !e.ctrlKey) {
		//do hold down thing
		var win = e.originalTarget.ownerDocument.defaultView;
		initX = e.clientX;
		initY = e.clientY;

		timeoutWin = win;
		timeout = win.setTimeout(function () {
			zoom(e)
		}, prefs.holdTime.value);
		win.addEventListener('mousemove', moved, true);
		win.addEventListener('dragstart', dragstarted, true);
		//end do hold down thing
		return;
	}
	zoom(e);

	e.stopPropagation();
	e.preventDefault();
	e.returnValue = false;
}

function upped(e) {
	if (e.button != trigger) {
		return;
	}
	if (e.relatedTarget && e.relatedTarget.nodeName == 'zoomr') {
		//if (e.relatedTarget == 'Zoomr::SynthMouseUp') {
		//if (e.clientX == 0 && e.clientY == 0) {
		//if x y 0 0 its synth, most likely
		//dont prev it

	} else if (zoomed) {

		e.stopPropagation();
		e.preventDefault();
		e.returnValue = false;
	} else {
		if (timeout) {

			var win = e.originalTarget.ownerDocument.defaultView;
			timeoutWin.clearTimeout(timeout);
			timeout = null;
			win.removeEventListener('mousemove', moved, true);
			win.removeEventListener('dragstart', dragstarted, true);
		} else {

		}
	}
}

function clicked(e) {
	if (e.button != trigger) {
		return;
	}
	if (e.relatedTarget && e.relatedTarget.nodeName == 'zoomr') {
		//if (e.relatedTarget == 'Zoomr::SynthMouseUp') {
		//if (e.clientX == 0 && e.clientY == 0) {
		//if x y 0 0 its synth, most likely
		//dont prev it

	} else if (zoomed) {

		e.stopPropagation();
		e.preventDefault();
		e.returnValue = false;
	}
}

function wheeled(e) {
	if (timeout) {

		var win = e.originalTarget.ownerDocument.defaultView;
		timeoutWin.clearTimeout(timeout);
		timeout = null;
		win.removeEventListener('mousemove', moved, true);
		win.removeEventListener('dragstart', dragstarted, true);
	}
}

var scaleMax = 2;
var scaleMin = 1;

function zoom(e) {


	zoomed = true;

	if (timeout) {
		var utils = timeoutWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

		//utils.sendMouseEvent('mouseup',0,0,trigger,1,0);
		var mouseEvent = timeoutWin.document.createEvent('MouseEvents')
		var mouseEventParam = {
			type: 'mouseup',
			canBubble: true,
			cancelable: true,
			view: timeoutWin,
			detail: trigger,
			screenX: e.screenX,
			screenY: e.screenY,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			button: trigger,
			relatedTarget: timeoutWin.document.createElement('zoomr'),
		}

		mouseEvent.initMouseEvent(mouseEventParam.type, mouseEventParam.canBubble, mouseEventParam.cancelable, mouseEventParam.view, mouseEventParam.detail, mouseEventParam.screenX, mouseEventParam.screenY, mouseEventParam.clientX, mouseEventParam.clientY, mouseEventParam.ctrlKey, mouseEventParam.altKey, mouseEventParam.shiftKey, mouseEventParam.metaKey, mouseEventParam.button, mouseEventParam.relatedTarget);
		e.target.dispatchEvent(mouseEvent)

	}
	timeout = null;

	var win = e.originalTarget.ownerDocument.defaultView;
	win.removeEventListener('mousemove', moved, true);
	win.removeEventListener('dragstart', dragstarted, true);

	var elWin = e.originalTarget.ownerDocument.defaultView;
	var win = elWin.top;

	var el = {
		target: {
			el: e.originalTarget,
		},
		parent: {
			el: e.originalTarget,
		},
		doc: {
			el: win.document.documentElement,
		}
	};

	var cScale = el.doc.el.style.transform.match(/\d+\.\d+/);
	cScale = cScale ? parseFloat(cScale) : 1;


	if (!el.parent.el) {
		if (cScale != 1) {
			//zooming out
			el.parent.el = el.target.el;
		} else {

			return;
		}
	} else {
		for (var r = 0; r < 1; r++) {
			while (el.parent.el && el.parent.el.ownerDocument.defaultView.getComputedStyle(el.parent.el, null).display == 'inline') {
				el.parent.el = el.parent.el.parentNode;
			}

			for (var e in el) {
				if (e == 'doc') {
					//el[e].attr = el[e].el.getAttribute('dbltapzoom');
				}
				el[e].rect = el[e].el.getBoundingClientRect();
			}
			scaleBy = el.doc.rect.width / el.parent.rect.width;
			if (scaleBy > scaleMax) {
				//el.parent.el = el.parent.el.parentNode;
				//r = -1;

			}
		}

		if (scaleBy < scaleMin) {

			myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - Failed Zoom', 'scaleBy < scaleMin so not scalling. scaleBy = ' + scaleMin);
			return;
		}
	}

	var zEl = null; //zoomEl decide which el to zoom, el or elP
	var gEl = null; //guidEl decide which el to use for guiding scroll bars

	//consider zooming parent if target == parent. then on second click zoom target
	if (cScale == 1) {

		zEl = 'parent';
		gEl = 'target';
	} else if (cScale != 1) {

		zEl = 'doc';
		gEl = 'target';
	} else {
		('Zoomr :: ', 'zoom parent');
		zEl = 'parent';
		gEl = 'target';
	}

	scaleBy = el.doc.rect.width / el[zEl].rect.width;
	scaleBy = scaleBy.toPrecision(3);
	//var str = ['scaleBy: ' + scaleBy, 'cScale: ' + cScale];
	//alert(str.join('\n'));


	if (scaleBy == 1 && zEl == 'parent') {

		/*
        zEl = 'target';
        gEl = 'target';
        scaleBy = el.doc.rect.width / el[zEl].rect.width;
        scaleBy = scaleBy.toPrecision(3);
        */
	}

	if (scaleBy != 1 && scaleBy == cScale) {

		zEl = 'doc';
		gEl = 'target';
		scaleBy = 1;
	}

	if (zEl != 'doc') { //shud probably do this setting of attribute after the removing of attributes from old els as else might overlap between old and current/new
		//el[gEl].el.setAttribute('dbltapzoom','2');
		//el[zEl].el.setAttribute('dbltapzoom','1'); //must do this 2nd as if gEl == zEl we want to ensure that zEl is set to 1 as that is very important in if logic above
	}




	el.doc.el.style.transform = 'scale(' + scaleBy + ',' + scaleBy + ')';
	el.doc.el.style.transformOrigin = 'top left';

	el[zEl].rect = el[zEl].el.getBoundingClientRect();
	el[gEl].rect = el[gEl].el.getBoundingClientRect(); //update el rect as it was transformed

	//e.originalTarget.scrollIntoView(true);
	//alert(el.offsetLeft*zoomScale + '\n' + gBrowser.contentWindow.scrollX);
	var str = ['scaleBy: ' + scaleBy, 'zEl nodename:' + el[zEl].el.nodeName, 'gEl nodename:' + el[gEl].el.nodeName, 'el[gEl].rect.left: ' + el[gEl].rect.left, 'el[gEl].rect.top: ' + el[gEl].rect.top, 'win.pageXOffset: ' + win.pageXOffset, 'win.pageYOffset: ' + win.pageYOffset];
	var scrollToX = el[zEl].rect.left + win.pageXOffset;
	var scrollToY = el[gEl].rect.top + win.pageYOffset;
	/*//not sure if i need this block, test it by zooming in on element in frame and see if the scroll bars of top win line up perfectly with the zoomed el
    var cWin = elWin;
    while (cWin != win) {
        scrollToX += cWin.pageXOffset;
        scrollToY += cWin.paygeYOffset;
    }
    */
	win.scrollTo(scrollToX, scrollToY);


	if (scaleBy == 1) {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - Zoomed Out', 'Content zoomed back to 1');
	} else {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - Zoomed', 'Content zoomed to ' + scaleBy);
	}

}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator('navigator:browser');
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator('navigator:browser');
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser && aDOMWindow.gBrowser.tabContainer) {
			aDOMWindow.gBrowser.addEventListener('keydown', keyDowned, true);
			aDOMWindow.gBrowser.addEventListener('keyup', keyUpped, true);
			aDOMWindow.gBrowser.addEventListener('mousedown', downed, true);
			aDOMWindow.gBrowser.addEventListener('mouseup', upped, true);
			aDOMWindow.gBrowser.addEventListener('click', clicked, true);
			aDOMWindow.gBrowser.addEventListener('DOMMouseScroll', wheeled, true);

		} else {
			return;
			aDOMWindow.addEventListener('keydown', keyDowned, true);
			aDOMWindow.addEventListener('keyup', keyUpped, true);
			aDOMWindow.addEventListener('mousedown', downed, true);
			aDOMWindow.addEventListener('mouseup', upped, true);
			aDOMWindow.addEventListener('click', clicked, true);
			aDOMWindow.addEventListener('DOMMouseScroll', wheeled, true);
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser && aDOMWindow.gBrowser.tabContainer) {
			aDOMWindow.gBrowser.removeEventListener('keydown', keyDowned, true);
			aDOMWindow.gBrowser.removeEventListener('keyup', keyUpped, true);
			aDOMWindow.gBrowser.removeEventListener('mousedown', downed, true);
			aDOMWindow.gBrowser.removeEventListener('mouseup', upped, true);
			aDOMWindow.gBrowser.removeEventListener('click', clicked, true);
			aDOMWindow.gBrowser.removeEventListener('DOMMouseScroll', wheeled, true);
		} else {
			return;
			aDOMWindow.removeEventListener('keydown', keyDowned, true);
			aDOMWindow.removeEventListener('keyup', keyUpped, true);
			aDOMWindow.removeEventListener('mousedown', downed, true);
			aDOMWindow.removeEventListener('mouseup', upped, true);
			aDOMWindow.removeEventListener('click', clicked, true);
			aDOMWindow.removeEventListener('DOMMouseScroll', wheeled, true);
		}
	}
};
/*end - windowlistener*/

//start pref stuff
const prefPrefix = 'extensions.' + self.id + '.'; //cannot put this in startup and cannot use self.aData.id
var prefs = { //each key here must match the exact name the pref is saved in the about:config database (without the prefix)
    holdTime: {
		default: 300,
		value: null,
		type: 'Int'
		//json: null, //if want to use json type must be string
		//onChange: function(oldVal, newVal, refObj) { } //on change means on change of the object prefs.blah.value within. NOT on change of the pref in about:config. likewise onPreChange means before chanigng the perfs.blah.value, this is because if users changes pref from about:config, newVal is always obtained by doing a getIntVal etc //refObj holds
	}
}
/**
 * if want to change value of preference dont do prefs.holdTime.value = blah, instead must do `prefs.holdTime.setval(500)`
 * because this will then properly set the pref on the branch then it will do the onChange properly with oldVal being correct
 * NOTE: this fucntion prefSetval is not to be used directly, its only here as a contructor
 */
function prefSetval(name) {
	return function(updateTo) {
		console.log('in prefSetval');
		console.info('this = ', this);
		if ('json' in this) {
			//updateTo must be an object
			if (Object.prototype.toString.call(updateTo) != '[object Object]') {
				console.warn('EXCEPTION: prefs[name] is json but updateTo supplied is not an object');
				return;
			}
			
			var stringify = JSON.stringify(updateTo); //uneval(updateTo);
			myPrefListener._branch['set' + this.type + 'Pref'](name, stringify);
			//prefs[name].value = {};
			//for (var p in updateTo) {
			//	prefs[name].value[p] = updateTo[p];
			//}
		} else {
			//prefs[name].value = updateTo;
			myPrefListener._branch['set' + this.type + 'Pref'](name, updateTo);
		}
	};
}
///pref listener generic stuff NO NEED TO EDIT
/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get garbage collected.
	this._branch = Services.prefs.getBranch(branch_name);
	this._defaultBranch = Services.prefs.getDefaultBranch(branch_name);
	this._branch.QueryInterface(Ci.nsIPrefBranch2);
	this._callback = callback;
}

PrefListener.prototype.observe = function(subject, topic, data) {
	console.log('incomcing PrefListener observe', 'topic=', topic, 'data=', data, 'subject=', subject);
	if (topic == 'nsPref:changed')
		this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(setDefaults, trigger) {
	//adds the observer to all prefs and gives it the seval function
	
	for (var p in prefs) {
		prefs[p].setval = new prefSetval(p);
	}
	
	console.log('added setval');
	if (setDefaults) {
		this.setDefaults();
		console.log('finished set defaults');
	}
	
	//should add observer after setting defaults otherwise it triggers the callbacks
	this._branch.addObserver('', this, false);
	console.log('added observer');
	
	if (trigger) {
		console.log('trigger callbacks');
		this.forceCallbacks();
		console.log('finished all callbacks');
	}
};

PrefListener.prototype.forceCallbacks = function() {
	console.log('forcing pref callbacks');
    let that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
};

PrefListener.prototype.setDefaults = function() {
	//sets defaults on the prefs in prefs obj
	console.log('doing setDefaults');
	for (var p in prefs) {
		console.log('will now set default on ', p);
		this._defaultBranch['set' + prefs[p].type + 'Pref'](p, prefs[p].default);
		console.log('fined setting default on ', p);
	}
	console.log('set defaults done');
};

PrefListener.prototype.unregister = function() {
  if (this._branch)
    this._branch.removeObserver('', this);
};

var myPrefListener = new PrefListener(prefPrefix, function (branch, name) {
	//extensions.myextension[name] was changed
	console.log('callback start for pref: ', name);
	if (!(name in prefs)) {
		console.warn('name is not in prefs so return name = ', name);
		//added this because apparently some pref named prefPreix + '.sdk.console.logLevel' gets created when testing with builder
		//ALSO gets here if say upgraded, and in this version this pref is not used (same with downgraded)
		return;
	}

	var refObj = {name: name}; //passed to onPreChange and onChange
	var oldVal = 'json' in prefs[name] ? prefs[name].json : prefs[name].value;
	try {
		var newVal = myPrefListener._branch['get' + prefs[name].type + 'Pref'](name);
	} catch (ex) {
		console.warn('exception when getting newVal (likely the pref was removed): ' + ex);
		var newVal = null; //note: if ex thrown then pref was removed (likely probably)
	}
	console.log('oldVal == ', oldVal);
	console.log('newVal == ', newVal);
	prefs[name].value = newVal === null ? prefs[name].default : newVal;

	if ('json' in prefs[name]) {
		refObj.oldValStr = oldVal;
		oldVal = JSON.parse(oldVal); //function(){ return eval('(' + oldVal + ')') }();

		refObj.newValStr = prefs[name].value;
		prefs[name].json = prefs[name].value;
		prefs[name].value =  JSON.parse(prefs[name].value); //function(){ return eval('(' + prefs[name].value + ')') }();
	}

	if (prefs[name].onChange) {
		prefs[name].onChange(oldVal, prefs[name].value, refObj);
	}
	console.log('myPrefCallback done');
});
////end pref listener stuff
//end pref stuff

function startup(aData, aReason) {
	console.log('startup reason = ', aReason);
	
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	console.log('myPrefListener=', myPrefListener);
	
	//start pref stuff more
	console.log('aReason=', aReason);
	//must forceCallbacks on startup, as the callbacks will read the inital prefs
	if ([ADDON_INSTALL,ADDON_UPGRADE,ADDON_DOWNGRADE].indexOf(aReason) > -1) {
		console.log('setting defaults logical if');
		myPrefListener.register(true, true); //true so it triggers the callback on registration, which sets value to current value //myPrefListener.setDefaults(); //in jetpack they get initialized somehow on install so no need for this	//on startup prefs must be initialized first thing, otherwise there is a chance that an added event listener gets called before settings are initalized
		//setDefaults safe to run after install too though because it wont change the current pref value if it is changed from the default.
		//good idea to always call setDefaults before register, especially if true for tirgger as if the prefs are not there the value in we are forcing it to use default value which is fine, but you know what i mean its not how i designed it, use of default is a backup plan for when something happens (like maybe pref removed)
	} else {
		myPrefListener.register(false, true); //true so it triggers the callback on registration, which sets value to current value
	}
	//end pref stuff more
	console.log('pre register');
	windowListener.register();
	console.log('post register');
}

function shutdown(aData, aReason) {
	console.log('shutdown reason = ', aReason);
	if (aReason == APP_SHUTDOWN) return;
	windowListener.unregister();
	
	//start pref stuff more
	myPrefListener.unregister();
	//end pref stuff more
}

function install(aData, aReason) {
	//must have arguments of aData and aReason otherwise the uninstall function doesn't trigger
}

function uninstall(aData, aReason) {
	console.info('UNINSTALLING ZOOMR reason = ', aReason);
	if (aReason == ADDON_UNINSTALL) { //have to put this here because uninstall fires on upgrade/downgrade too
		console.log('deleting branch of: ' + prefPrefix);
		Services.prefs.deleteBranch(prefPrefix);
	}
}