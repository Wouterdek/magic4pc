import {onWindowReady} from '@enact/core/snapshot'
import {error} from '@enact/webos/pmloglib';

// Logs any uncaught exceptions to the system logs for future troubleshooting. Payload can be
// customized by the application for its particular requirements.
const handleError = (ev) => {
	let stack = ev.error && ev.error.stack || null;

	if (stack && stack.length > 512) {
		// JSON must be limitted to 1024 characters so we truncate the stack to 512 for safety
		stack = ev.error.stack.substring(0, 512);
	}

	error('app.onerror', {
		message: ev.message,
		url: ev.filename,
		line: ev.lineno,
		column: ev.colno,
		stack
	}, '');

	// Calling preventDefault() will avoid logging the error to the console
	// ev.preventDefault();
};

onWindowReady(() => {
	window.addEventListener('error', handleError);
});

