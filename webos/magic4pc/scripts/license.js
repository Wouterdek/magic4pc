/* eslint-env node, es6 */
const path = require('path');
const chalk = require('chalk');
const checker = require('license-checker');
const minimist = require('minimist');

// The following modules reside in `@enact/cli` but end up in production builds of apps
const pkgPathResolve = m => path.dirname(require.resolve(m + '/package.json'));
const enactCLIProdModules = ['@babel/core', 'core-js'].map(pkgPathResolve);

function displayHelp() {
	let e = 'node ' + path.relative(process.cwd(), __filename);
	if (require.main !== module) e = 'enact license';

	console.log('  Usage');
	console.log(`    ${e} [options] [<module>]`);
	console.log();
	console.log('  Arguments');
	console.log('    module            Optional module path');
	console.log('                          (default: <current directory>');
	console.log();
	console.log('  Options');
	console.log('    -v, --version     Display version information');
	console.log('    -h, --help        Display help information');
	console.log();
	process.exit(0);
}

function api({modules = []} = {}) {
	if (!modules.length) {
		modules = modules.concat(enactCLIProdModules, '.');
	}

	return Promise.all(
		modules.map(m => {
			return new Promise((resolve, reject) => {
				checker.init({start: m}, (err, json) => {
					if (err) {
						reject(new Error(`Unable to process licenses for ${m}.\n${err.message}`));
					} else {
						resolve(json || {});
					}
				});
			});
		})
	).then(values => values.reduce((a, b) => Object.assign(a, b)));
}

function cli(args) {
	const opts = minimist(args, {
		boolean: ['help'],
		alias: {h: 'help'}
	});
	if (opts.help) displayHelp();

	api({modules: opts._})
		.then(licenses => console.log(JSON.stringify(licenses, null, 2)))
		.catch(err => {
			console.error(chalk.red('ERROR: ') + err.message);
			process.exit(1);
		});
}

module.exports = {api, cli};
if (require.main === module) cli(process.argv.slice(2));
