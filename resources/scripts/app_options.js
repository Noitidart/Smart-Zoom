hydrant_ex_instructions = { // stuff that shouldnt get written to hydrants entry in filestore. updating this is handled manually by dev
	filestore_entries: ['prefs'],
	addon_info: true
};
hydrant_ex = {
	prefs: {},
	addon_info: {}
};

initAppPage = function(aArg) {
	// aArg is what is received by the call in `init`
	// filter hydrant to just prefs i care about

	gAppPageComponents = [
		React.createElement(Header),
		React.createElement(Rows)
	];

}

uninitAppPage = function() {

}

focusAppPage = function() {
	console.error('focused!!!!!!');
	// callInBootstrap('fetchCore', { nocore:true, hydrant_ex_instructions }, function(aArg) {
	// 	var differents; // key is mainkey
	// 	for (var p in aArg.hydrant_ex) {
	// 		var is_different = React.addons.shallowCompare({props:hydrant_ex[p]}, aArg.hydrant_ex[p]);
	// 		console.error('hydrant_ex.' + p + ' is_different:', is_different);
	// 		if (is_different) {
	// 			if (!differents) {
	// 				differents = {};
	// 			}
	// 			differents[p] = aArg.hydrant_ex[p];
	// 		}
	// 	}
	//
	// 	if (differents) {
	// 		store.dispatch(setMainKeys(differents));
	// 	}
	// });
}

shouldUpdateHydrantEx = function() {
	console.log('in shouldUpdateHydrantEx');

	var state = store.getState();

	if (gSupressUpdateHydrantExOnce) {
		console.log('hydrant_ex update supressed once');
		gSupressUpdateHydrantExOnce = false;
		return;
	}

	// check if hydrant_ex updated
	var hydrant_ex_updated = false;
	for (var p in hydrant_ex) {
		var is_different = React.addons.shallowCompare({props:hydrant_ex[p]}, state[p]);
		if (is_different) {
			console.log('something in', p, 'of hydrant_ex was updated');
			hydrant_ex_updated = true;

			if (!gSupressUpdateHydrantExOnce) {
				// update file stores or whatever store this key in hydrant_ex is connected to
				if (hydrant_ex_instructions.filestore_entries && hydrant_ex_instructions.filestore_entries.includes(p)) {
					callInMainworker('updateFilestoreEntry', {
						mainkey: p,
						value: state[p]
					})
				} else if (p == 'addon_info') {
					// make sure it is just applyBackgroundUpdates, as i only support changing applyBackgroundUpdates
					if (hydrant_ex.addon_info.applyBackgroundUpdates !== state.addon_info.applyBackgroundUpdates) {
						callInBootstrap('setApplyBackgroundUpdates', state.addon_info.applyBackgroundUpdates);
					}
				}
			}
			console.log('compared', p, 'is_different:', is_different, 'state:', state[p], 'hydrant_ex:', hydrant_ex[p]);
			hydrant_ex[p] = state[p];
			// break; // dont break because we want to update the hydrant_ex in this global scope for future comparing in this function.
		}
	}

	console.log('done shouldUpdateHydrantEx');
}


// REACT COMPONENTS - PRESENTATIONAL
var Header = React.createClass({
	render: function() {
		return React.createElement(ReactBootstrap.Navbar, undefined,
			React.createElement(ReactBootstrap.Navbar.Header, undefined,
				React.createElement(ReactBootstrap.Navbar.Brand, undefined,
					React.createElement('a', { href:'#' },
						formatStringFromNameCore('addon_name', 'main')
					)
				)
			),
			React.createElement(ReactBootstrap.Navbar.Collapse, undefined,
				React.createElement(ReactBootstrap.Navbar.Text, { pullRight:true },
					formatStringFromNameCore('options', 'main')
				)
			)
		);
	}
});

var Rows = React.createClass({
	render: function() {
		return React.createElement(ReactBootstrap.Grid, { className:'pref-rows' },
			React.createElement(RowAutoUpdates),
			React.createElement(RowHoldTime),
			React.createElement(RowHoldDistance)
		);
	}
});

var RowAutoUpdates = React.createClass({
	render: function() {
		return React.createElement(ReactBootstrap.Row, undefined,
			React.createElement(ReactBootstrap.Col, { lg:2, md:2, sm:3, xs:8 },
				formatStringFromNameCore('autoupdate', 'main')
			),
			React.createElement(ReactBootstrap.Col, { lg:9, md:9, sm:7, xsHidden:true },
				formatStringFromNameCore('autoupdate_desc', 'main', [core.addon.version, formatTime(Date.now(), { time:false })])
			),
			React.createElement(ReactBootstrap.Col, { lg:1, md:1, sm:2, xs:4 },
				React.createElement(ReactBootstrap.Button, { block:true },
					formatStringFromNameCore('on', 'main')
				)
			)
		);
	}
});

var RowHoldTime = React.createClass({
	render: function() {
		return React.createElement(ReactBootstrap.Row, undefined,
			React.createElement(ReactBootstrap.Col, { lg:2, md:2, sm:3, xs:8 },
				formatStringFromNameCore('holdtime', 'main')
			),
			React.createElement(ReactBootstrap.Col, { lg:9, md:9, sm:7, xsHidden:true },
				formatStringFromNameCore('holdtime_desc', 'main')
			),
			React.createElement(ReactBootstrap.Col, { lg:1, md:1, sm:2, xs:4 },
				React.createElement(ReactBootstrap.FormControl, { type:'text' })
			)
		);
	}
});

var RowHoldDistance = React.createClass({
	render: function() {
		return React.createElement(ReactBootstrap.Row, undefined,
			React.createElement(ReactBootstrap.Col, { lg:2, md:2, sm:3, xs:8 },
				formatStringFromNameCore('holddist', 'main')
			),
			React.createElement(ReactBootstrap.Col, { lg:9, md:9, sm:7, xsHidden:true },
				formatStringFromNameCore('holddist_desc', 'main')
			),
			React.createElement(ReactBootstrap.Col, { lg:1, md:1, sm:2, xs:4 },
				React.createElement(ReactBootstrap.FormControl, { type:'text' })
			)
		);
	}
});

// REACT COMPONENTS - CONTAINER
// var BlockContainer = ReactRedux.connect(
// 	function mapStateToProps(state, ownProps) {
// 		return {
//
// 		};
// 	},
// 	function mapDispatchToProps(dispatch, ownProps) {
// 		return {
//
// 		};
// 	}
// )(Block);

// ACTIONS
const SET_PREF = 'SET_PREF';
const SET_ADDON_INFO = 'SET_ADDON_INFO';
const SET_MAIN_KEYS = 'SET_MAIN_KEYS';

// ACTION CREATORS
function setPref(pref, value) {
	return {
		type: SET_PREF,
		pref,
		value
	}
}
function setAddonInfo(info, value) {
	return {
		type: SET_ADDON_INFO,
		info,
		value
	}
}
function setMainKeys(obj_of_mainkeys) {
	gSupressUpdateHydrantExOnce = true;
	return {
		type: SET_MAIN_KEYS,
		obj_of_mainkeys
	}
}

// REDUCERS
function prefs(state=hydrant_ex.prefs, action) {
	console.log('in prefs hydrant_ex:', hydrant_ex);
	switch (action.type) {
		case SET_PREF:
			var { pref, value } = action;
			return Object.assign({}, state, {
				[pref]: value
			});
		case SET_MAIN_KEYS:
			var { obj_of_mainkeys } = action;
			var mainkey = 'prefs';
			return (mainkey in obj_of_mainkeys ? obj_of_mainkeys[mainkey] : state);
		default:
			return state;
	}
}
function addon_info(state=hydrant_ex.addon_info, action) {
	switch (action.type) {
		case SET_ADDON_INFO:
			var { info, value } = action;
			return Object.assign({}, state, {
				[info]: value
			});
		case SET_MAIN_KEYS:
			var { obj_of_mainkeys } = action;
			var mainkey = 'addon_info';
			return (mainkey in obj_of_mainkeys ? obj_of_mainkeys[mainkey] : state);
		default:
			return state;
	}
}

// `var` so app.js can access it
app = Redux.combineReducers({
	prefs,
	addon_info
});

// end - react-redux
