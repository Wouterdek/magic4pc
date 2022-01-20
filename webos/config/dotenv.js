/* eslint-env node, es6 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const expand = require('dotenv-expand');

// Loads all required .env files in correct order, for a given mode.
// See https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
module.exports = {
	load: function (context) {
		const mode = process.env.NODE_ENV || 'development';
		[
			`.env.${mode}.local`,
			// Similar to create-react app, don't include `.env.local` for
			// `test` environment for test result consistency.
			mode !== 'test' && `.env.local`,
			`.env.${mode}`,
			'.env'
		]
			.filter(Boolean)
			.map(env => path.join(context, env))
			.forEach(env => {
				if (fs.existsSync(env)) {
					expand(dotenv.config({path: env}));
				}
			});
	}
};
