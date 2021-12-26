/* eslint-env jest */
const fs = require('fs');
const path = require('path');
const enzyme = require('enzyme');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');
const {packageRoot} = require('@enact/dev-utils');

const filters = [
	'Invalid prop',
	'Failed prop type',
	'Unknown prop',
	'non-boolean attribute',
	'Received NaN',
	'Invalid value',
	'React does not recognize',
	'React uses onFocus and onBlur instead of onFocusIn and onFocusOut',
	'Invalid event handler property',
	'Unknown event handler property',
	'Directly setting property `innerHTML` is not permitted',
	'The `aria` attribute is reserved for future use in ',
	'for a string attribute `is`. If this is expected, cast',
	'Invalid DOM property'
];
const filterExp = new RegExp('(' + filters.join('|') + ')');

// Configure proptype & react error checking on the console.

beforeEach(() => {
	jest.spyOn(console, 'warn');
	jest.spyOn(console, 'error');
});

afterEach(() => {
	const actual = (console.warn.mock ? console.warn.mock.calls : [])
		.concat(console.error.mock ? console.error.mock.calls : [])
		.filter(([m]) => filterExp.test(m));
	const expected = 0;

	if (console.warn.mock) {
		console.warn.mockRestore();
	}
	if (console.error.mock) {
		console.error.mockRestore();
	}

	expect(actual).toHaveLength(expected);
});

// Configure Enzyme to use React16 adapter.

enzyme.configure({adapter: new Adapter()});

// Set initial resolution to VGA, similar to PhantomJS.
// Will ideally want to use a more modern resolution later.

global.innerHeight = 640;
global.innerWidth = 480;

// Support local file sync XHR to support iLib loading.

const ilibPaths = Object.keys(global).filter(k => /ILIB_[^_]+_PATH/.test(k));
const pkg = packageRoot();
const XHR = global.XMLHttpRequest;
class ILibXHR extends XHR {
	open(method, url) {
		if (ilibPaths.some(p => url.startsWith(global[p]))) {
			this.send = () => {
				try {
					const file = path.join(pkg.path, url.replace(/\//g, path.sep));
					this.fileText = fs.readFileSync(file, {encoding: 'utf8'});
					this.fileStatus = 200;
				} catch (e) {
					this.fileText = '';
					this.fileStatus = 404;
				}
				this.dispatchEvent(new global.Event('readystatechange'));
				this.dispatchEvent(new global.ProgressEvent('load'));
				this.dispatchEvent(new global.ProgressEvent('loadend'));
			};
		} else {
			return super.open(...arguments);
		}
	}
	get readyState() {
		return typeof this.fileStatus !== 'undefined' ? XHR.DONE : super.readyState;
	}
	get status() {
		return typeof this.fileStatus !== 'undefined' ? this.fileStatus : super.status;
	}
	get responseText() {
		return typeof this.fileText !== 'undefined' ? this.fileText : super.responseText;
	}
}
global.XMLHttpRequest = ILibXHR;

beforeEach(() => {
	global.Element.prototype.animate = jest.fn().mockImplementation(() => {
		const animation = {
			onfinish: null,
			cancel: () => {
				if (animation.onfinish) animation.onfinish();
			},
			finish: () => {
				if (animation.onfinish) animation.onfinish();
			}
		};
		return animation;
	});
});
