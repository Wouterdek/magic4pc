/* eslint-env node, es6 */
const cp = require('child_process');
const path = require('path');
const glob = require('glob');
const minimist = require('minimist');

const globOpts = {
	ignore: ['**/node_modules/**', 'build/**', '**/dist/**', 'coverage/**', 'tests/**'],
	nodir: true
};

function displayHelp() {
	let e = 'node ' + path.relative(process.cwd(), __filename);
	if (require.main !== module) e = 'enact lint';

	console.log('  Usage');
	console.log(`    ${e} [options] [<target>]`);
	console.log();
	console.log('  Arguments');
	console.log('    target            Optional target file or directory');
	console.log('                          (default: cwd)');
	console.log();
	console.log('  Options');
	console.log('    -l, --local       Scan with local eslint config');
	console.log('    -s, --strict      Scan with strict eslint config');
	console.log('    -f, --fix         Attempt to fix viable problems');
	console.log('    -v, --version     Display version information');
	console.log('    -h, --help        Display help information');
	console.log();
	process.exit(0);
}

function shouldESLint() {
	return glob.sync('**/*.+(js|jsx|ts|tsx)', globOpts).length > 0;
}

function eslint({strict = false, local = false, fix = false, eslintArgs = []} = {}) {
	let args = [];
	if (strict) {
		args.push('--no-eslintrc', '--config', require.resolve('eslint-config-enact/strict'));
	} else if (!local) {
		args.push('--no-eslintrc', '--config', require.resolve('eslint-config-enact'));
	}
	if (local) {
		args.push('--ignore-pattern', '**/node_modules/*');
		args.push('--ignore-pattern', 'build/*');
		args.push('--ignore-pattern', '**/dist/*');
		args.push('--ignore-pattern', 'coverage/*');
	}
	if (fix) args.push('--fix');
	if (eslintArgs.length) {
		args = args.concat(eslintArgs);
	} else {
		args.push('.');
	}
	return new Promise((resolve, reject) => {
		const opts = {env: process.env, cwd: process.cwd()};
		const child = cp.fork(require.resolve('eslint/bin/eslint'), args, opts);
		child.on('close', code => {
			if (code !== 0) {
				reject();
			} else {
				resolve();
			}
		});
	});
}

function api(opts) {
	return Promise.resolve().then(() => shouldESLint() && eslint(opts));
}

function cli(args) {
	const opts = minimist(args, {
		boolean: ['local', 'strict', 'fix', 'help'],
		alias: {l: 'local', s: 'strict', framework: 'strict', f: 'fix', h: 'help'}
	});
	if (opts.help) displayHelp();

	api({strict: opts.strict, local: opts.local, fix: opts.fix, eslintArgs: opts._}).catch(() => {
		process.exit(1);
	});
}

module.exports = {api, cli};
if (require.main === module) cli(process.argv.slice(2));
