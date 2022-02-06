/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const spawn = require('cross-spawn');
const minimist = require('minimist');
const resolveSync = require('resolve').sync;

function displayHelp() {
	let e = 'node ' + path.relative(process.cwd(), __filename);
	if (require.main !== module) e = 'enact info';

	console.log('  Usage');
	console.log(`    ${e} [options]`);
	console.log();
	console.log('  Options');
	console.log('    --dev             Include dev dependencies');
	console.log('    --cli             Display CLI information');
	console.log('    -v, --version     Display version information');
	console.log('    -h, --help        Display help information');
	console.log();
	process.exit(0);
}

function logVersion(pkg, rel = __dirname) {
	try {
		const jsonPath = resolveSync(pkg + '/package.json', {basedir: rel});
		const meta = require(jsonPath);
		const dir = path.dirname(jsonPath);
		if (fs.lstatSync(dir).isSymbolicLink()) {
			const realDir = fs.realpathSync(dir);
			const git = gitInfo(realDir);
			console.log(meta.name + ': ' + (git || meta.version));
			console.log(chalk.cyan('\tSymlinked from'), realDir);
		} else {
			console.log(meta.name + ': ' + meta.version);
		}
	} catch (e) {
		console.log(pkg + ': ' + chalk.red('<unknown>'));
	}
}

function gitInfo(dir) {
	const git = (args = []) => {
		try {
			const result = spawn.sync('git', args, {
				encoding: 'utf8',
				cwd: dir,
				env: process.env,
			});
			if (!result.error && result.status === 0) return result.stdout.trim();
		} catch (e) {
			// do nothing
		}
	};
	const tag = git(['describe', '--tags', '--exact-match']);
	if (tag) {
		return chalk.green(`${tag} (git)`);
	} else {
		const branch = git(['symbolic-ref', '-q', '--short', 'HEAD']) || 'HEAD';
		const commit = git(['rev-parse', '--short', 'HEAD']);
		if (commit) return chalk.green(`${branch} @ ${commit} (git)`);
	}
}

function globalModules() {
	try {
		const result = spawn.sync('npm', ['config', 'get', 'prefix', '-g'], {
			cwd: process.cwd(),
			env: process.env,
		});
		if (
			result.error ||
			result.status !== 0 ||
			!(result.stdout = result.stdout.trim())
		) {
			return require('global-modules');
		} else if (
			process.platform === 'win32' ||
			['msys', 'cygwin'].includes(process.env.OSTYPE)
		) {
			return path.resolve(result.stdout, 'node_modules');
		} else {
			return path.resolve(result.stdout, 'lib/node_modules');
		}
	} catch (e) {
		return require('global-modules');
	}
}

function api({cliInfo = false, dev = false} = {}) {
	return new Promise((resolve, reject) => {
		try {
			if (cliInfo) {
				// Display info on CLI itself
				const gm = globalModules();
				const gCLI = path.join(gm, '@enact', 'cli');
				const isGlobal =
					fs.existsSync(gCLI) &&
					path.dirname(require.resolve(path.join(gCLI, 'package.json'))) ===
						path.dirname(__dirname);
				console.log(chalk.yellow.bold('==Enact CLI Info=='));
				if (isGlobal && fs.lstatSync(gCLI).isSymbolicLink()) {
					const ver = gitInfo(__dirname) || require('../package.json').version;
					console.log(`Enact CLI: ${ver}`);
					console.log(chalk.cyan('\tSymlinked from'), path.dirname(__dirname));
				} else {
					console.log(`@enact/cli: ${require('../package.json').version}`);
				}
				console.log(`Installed Globally: ${isGlobal}`);
				if (isGlobal) console.log(`Global Modules: ${gm}`);
				console.log();

				// Display info on in-house components, likely to be linked in
				console.log(chalk.yellow.bold('==Enact Components=='));
				[
					'@enact/dev-utils',
					'eslint-config-enact',
					'eslint-plugin-enact',
					'postcss-resolution-independence',
				].forEach((dep) => logVersion(dep));
				console.log();

				// Display info on notable 3rd party components
				console.log(chalk.yellow.bold('==Third Party Components=='));
				console.log(`Babel: ${require('@babel/core/package.json').version}`);
				console.log(`ESLint: ${require('eslint/package.json').version}`);
				console.log(`Jest: ${require('jest/package.json').version}`);
				console.log(`LESS: ${require('less/package.json').version}`);
				console.log(`Webpack: ${require('webpack/package.json').version}`);
			} else {
				const app = require('@enact/dev-utils').optionParser;
				const meta = require(path.join(app.context, 'package.json'));
				const bl = require(resolveSync('browserslist', {
					basedir: path.dirname(
						require.resolve('@enact/dev-utils/package.json')
					),
					preserveSymlinks: false,
				}));
				app.setEnactTargetsAsDefault();
				console.log(chalk.yellow.bold('==Project Info=='));
				console.log(`Name: ${app.name}`);
				console.log(`Version: ${gitInfo(app.context) || meta.version}`);
				console.log(`Path: ${app.context}`);
				console.log(`Theme: ${(app.theme || {}).name}`);
				if (app.proxer) console.log(`Serve Proxy: ${app.proxy}`);
				if (app.template) console.log(`Template: ${app.template}`);
				if (app.externalStartup)
					console.log(`External Startup: ${app.externalStartup}`);
				if (app.deep) console.log(`Deep: ${app.deep}`);
				if (app.forceCSSModules)
					console.log(`Force CSS Modules: ${app.forceCSSModules}`);
				console.log(`Resolution Independence: ${JSON.stringify(app.ri)}`);
				console.log(`Browserslist: ${bl.loadConfig({path: app.context})}`);
				console.log(`Environment: ${app.environment}`);
				console.log();
				console.log(chalk.yellow.bold('==Dependencies=='));
				if (meta.dependencies) {
					Object.keys(meta.dependencies).forEach((dep) => {
						logVersion(dep, app.context);
					});
				}
				if (dev && meta.devDependencies) {
					console.log();
					console.log(chalk.yellow.bold('==Dev Dependencies=='));
					Object.keys(meta.devDependencies).forEach((dep) => {
						logVersion(dep, app.context);
					});
				}
			}
			resolve();
		} catch (e) {
			reject(e);
		}
	});
}

function cli(args) {
	const opts = minimist(args, {
		boolean: ['cli', 'help'],
		alias: {h: 'help'},
	});
	if (opts.help) displayHelp();

	api({cliInfo: opts.cli, dev: opts.dev}).catch((err) => {
		console.error(
			chalk.red('ERROR: ') + 'Failed to display info.\n' + err.message
		);
		process.exit(1);
	});
}

module.exports = {api, cli};
if (require.main === module) cli(process.argv.slice(2));
