// var gFsComm;
// var { callInFramescript, callInMainworker, callInBootstrap } = CommHelper.contentinframescript;
// gFsComm = new Comm.client.content(init);
//
// function init() {
// 	alert('injected content script');
// 	callInBootstrap('fetchPrefs', undefined, function(aArg, aComm) {
// 		core = aArg;
//
// 		window.addEventListener('unload', unload, false);
//
// 	});
// }
//
// function uninit() {
// 	// triggered by uninit of framescript - if i want to do something on unload of page i should create function unload() and addEventListener('unload', unload, false)
// 	alert('uninit');
// 	window.removeEventListener('unload', unload, false);
// 	if (gCover) { gCover.parentNode.removeChild(gCover) }
// }
//
// function unload() {
// 	// if this event listener is still attached, and triggers, it means the page unload or tab was closed
// 	alert('unloading');
// }

// alert('injected href: ' + window.location.href + ' readyState: ' + document.readyState);

var gPrefs;
var gSandbox = this; // Sandbox, init: init(), uninit: uninit(), unload: unload(), csWinMsgListener: csWinMsgListener(), initPrefs: initPrefs(), window: Window → zoomr, document: HTMLDocument → zoomr, location: Location → zoomr, 63 more… }

function init() {
	window.addEventListener('message', csWinMsgListener, false);
}

function uninit() {
	document.removeEventListener('mousedown', onMouseDown, false);
	document.removeEventListener('mouseup', onMouseUp, false);
	document.removeEventListener('click', onClick, false);
	console.log('finished unint of href:', window.location.href);
}

function unload() {

}

function csWinMsgListener(e) {
	var data = e.data;
	if (typeof(data) == 'object' && data.topic == 'Zoomr-contentscript') {
		gSandbox[data.method](data.arg);
	}
}

function initPrefs(aPrefs) {
	gPrefs = aPrefs;
	// alert(JSON.stringify(gPrefs));
	document.removeEventListener('mousedown', onMouseDown, false);
	document.removeEventListener('mouseup', onMouseUp, false);
	document.removeEventListener('click', onClick, false);

	document.addEventListener('mousedown', onMouseDown, false);
	document.addEventListener('mouseup', onMouseUp, false);
	document.addEventListener('click', onClick, false);
	console.log('finished init of href:', window.location.href);
}

var held_timeout;
var held = false;
function onMouseDown(e) {
	held = false;
	if (e.button === 0) {
		console.log('set timer');
		held_timeout = setTimeout(onHeld.bind(null, e), gPrefs.hold_time);
	}
}

function onMouseUp(e) {
	clearTimeout(held_timeout);
	if (held) {
		stopEvent(e);
	}
}

function onClick(e) {
	if (held) {
		stopEvent(e);
	}
}

function onHeld(e) {
	stopEvent(e);
	held = true;
	console.log('will zoom now, zoom:', zoom);
	zoom.to({ element: e.target });
	console.log('did zoom');
}

function stopEvent(e) {
	e.stopPropagation();
	e.preventDefault();
}

init();


// start - common helper functions
