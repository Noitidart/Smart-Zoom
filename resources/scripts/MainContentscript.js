// var gFsComm;
// var { callInFramescript, callInMainworker, callInBootstrap } = CommHelper.contentinframescript;
// gFsComm = new Comm.client.content(init);
//
// function init() {
// 	alert('injected content script');
// 	callInBootstrap('fetchPrefs', undefined, function(aArg, aComm) {
// 		core = aArg;
//
// 		window.addEventListener('unload', unload, true);
//
// 	});
// }
//
// function uninit() {
// 	// triggered by uninit of framescript - if i want to do something on unload of page i should create function unload() and addEventListener('unload', unload, true)
// 	alert('uninit');
// 	window.removeEventListener('unload', unload, true);
// 	if (gCover) { gCover.parentNode.removeChild(gCover) }
// }
//
// function unload() {
// 	// if this event listener is still attached, and triggers, it means the page unload or tab was closed
// 	alert('unloading');
// }

// alert('injected href: ' + window.location.href + ' readyState: ' + document.readyState);

var gPrefs;
var gSandbox = this; // Sandbox, init: init(), uninit: uninit(), unload: unload(), csWinMsgListener: csWinMsgListener(), initPrefs: initPrefs(), window: Window → smart-zoom, document: HTMLDocument → smart-zoom, location: Location → smart-zoom, 63 more… }

function init() {
	window.addEventListener('message', csWinMsgListener, true);
}

function uninit() {
	document.removeEventListener('mousedown', onMouseDown, true);
	document.removeEventListener('mouseup', onMouseUp, true);
	document.removeEventListener('click', onClick, true);
	window.removeEventListener('message', csWinMsgListener, true);
	console.log('finished unint of href:', window.location.href);
}

function unload() {

}

function csWinMsgListener(e) {
	var data = e.data;
	if (typeof(data) == 'object' && data.topic == 'Smart Zoom-contentscript') {
		gSandbox[data.method](data.arg);
	}
}

function initPrefs(aPrefs) {
	// alert(JSON.stringify(gPrefs));

	if (!gPrefs) {
		document.addEventListener('mousedown', onMouseDown, true);
		document.addEventListener('mouseup', onMouseUp, true);
		document.addEventListener('click', onClick, true);
	}

	gPrefs = aPrefs;
	console.log('updated prefs to:', JSON.stringify(gPrefs));
}

var held_timeout;
var held = false;
var mx, my = 0; // to figure out if they moved too much
function onMouseDown(e) {
	held = false;
	if (e.button === 0) {
		console.log('set timer');
		mx = e.clientX;
		my = e.clientY;
		held_timeout = setTimeout(onHeld.bind(null, e), gPrefs.holdtime);
		document.addEventListener('mousemove', onMouseMove, true);
	}
}

function onMouseUp(e) {
	clearTimeout(held_timeout);
	document.removeEventListener('mousemove', onMouseMove, true);
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
	stopEvent(e); // i dont think this is needed, pretty sure it does nothing as the mouse down already happened
	document.removeEventListener('mousemove', onMouseMove, true);
	held = true;
	console.log('will zoom now, zoom:', zoom);
	zoom.to({ element:e.target, padding:gPrefs.zoommargin });
	console.log('did zoom');
}

function onMouseMove(e) {
	if (Math.abs(e.clientX) - mx > gPrefs.holddist || Math.abs(e.clientY - my) > gPrefs.holddist) {
		document.removeEventListener('mousemove', onMouseMove, true);
		console.error('canceling hold');
		clearTimeout(held_timeout);
	}
}
function stopEvent(e) {
	e.stopPropagation();
	e.preventDefault();
}

init();


// start - common helper functions
