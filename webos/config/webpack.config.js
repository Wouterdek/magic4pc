/* eslint-env node, es6 */

const fs = require('fs');
const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const typescriptFormatter = require('react-dev-utils/typescriptFormatter');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const resolve = require('resolve');
const TerserPlugin = require('terser-webpack-plugin');
const {DefinePlugin, EnvironmentPlugin} = require('webpack');
const {
	optionParser: app,
	cssModuleIdent: getSimpleCSSModuleLocalIdent,
	GracefulFsPlugin,
	ILibPlugin,
	WebOSMetaPlugin
} = require('@enact/dev-utils');

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
module.exports = function (env) {
	process.chdir(app.context);

	// Load applicable .env files into environment variables.
	require('./dotenv').load(app.context);

	// Sets the browserslist default fallback set of browsers to the Enact default browser support list.
	app.setEnactTargetsAsDefault();

	// Check if JSX transform is able
	const hasJsxRuntime = (() => {
		if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
			return false;
		}

		try {
			require.resolve('react/jsx-runtime');
			return true;
		} catch (e) {
			return false;
		}
	})();

	// Check if TypeScript is setup
	const useTypeScript = fs.existsSync('tsconfig.json');

	process.env.NODE_ENV = env || process.env.NODE_ENV;
	const isEnvProduction = process.env.NODE_ENV === 'production';

	const publicPath = getPublicUrlOrPath(!isEnvProduction, app.publicUrl, process.env.PUBLIC_URL).replace(/^\/$/, '');

	// Source maps are resource heavy and can cause out of memory issue for large source files.
	// By default, sourcemaps will be used in development, however it can universally forced
	// on or off by setting the GENERATE_SOURCEMAP environment variable.
	const GENERATE_SOURCEMAP = process.env.GENERATE_SOURCEMAP || (isEnvProduction ? 'false' : 'true');
	const shouldUseSourceMap = GENERATE_SOURCEMAP !== 'false';

	const getLocalIdent =
		process.env.SIMPLE_CSS_IDENT !== 'false' ? getSimpleCSSModuleLocalIdent : getCSSModuleLocalIdent;

	// common function to get style loaders
	const getStyleLoaders = (cssLoaderOptions = {}, preProcessor) => {
		// Multiple styling-support features are used together, bottom-to-top.
		// An optonal preprocessor, like "less loader", compiles LESS syntax into CSS.
		// "postcss" loader applies autoprefixer to our CSS.
		// "css" loader resolves paths in CSS and adds assets as dependencies.
		// `MiniCssExtractPlugin` takes the resulting CSS and puts it into an
		// external file in our build process. If you use code splitting, any async
		// bundles will stilluse the "style" loader inside the async code so CSS
		// from them won't be in the main CSS file.
		// When INLINE_STYLES env var is set, instead of MiniCssExtractPlugin, uses
		// `style` loader to dynamically inline CSS in style tags at runtime.
		const loaders = [
			process.env.INLINE_STYLES ? require.resolve('style-loader') : MiniCssExtractPlugin.loader,
			{
				loader: require.resolve('css-loader'),
				options: Object.assign(
					{importLoaders: preProcessor ? 2 : 1, sourceMap: shouldUseSourceMap},
					cssLoaderOptions,
					cssLoaderOptions.modules && {modules: {getLocalIdent}},
					{
						url: url => {
							// Don't handle absolute path urls
							if (url.startsWith('/')) {
								return false;
							}

							return true;
						}
					}
				)
			},
			{
				// Options for PostCSS as we reference these options twice
				// Adds vendor prefixing based on your specified browser support in
				// package.json
				loader: require.resolve('postcss-loader'),
				options: {
					postcssOptions: {
						plugins: [
							// Fix and adjust for known flexbox issues
							// See https://github.com/philipwalton/flexbugs
							require('postcss-flexbugs-fixes'),
							// Support @global-import syntax to import css in a global context.
							require('postcss-global-import'),
							// Transpile stage-3 CSS standards based on browserslist targets.
							// See https://preset-env.cssdb.org/features for supported features.
							// Includes support for targetted auto-prefixing.
							require('postcss-preset-env')({
								autoprefixer: {
									flexbox: 'no-2009',
									remove: false
								},
								stage: 3,
								features: {'custom-properties': false}
							}),
							// Adds PostCSS Normalize to standardize browser quirks based on
							// the browserslist targets.
							require('postcss-normalize')(),
							// Resolution indepedence support
							app.ri !== false && require('postcss-resolution-independence')(app.ri)
						].filter(Boolean)
					},
					sourceMap: shouldUseSourceMap
				}
			}
		];
		if (preProcessor) {
			loaders.push(preProcessor);
		}
		return loaders;
	};

	const getLessStyleLoaders = cssLoaderOptions =>
		getStyleLoaders(cssLoaderOptions, {
			loader: require.resolve('less-loader'),
			options: {
				lessOptions: {
					modifyVars: Object.assign({__DEV__: !isEnvProduction}, app.accent)
				},
				sourceMap: shouldUseSourceMap
			}
		});

	return {
		mode: isEnvProduction ? 'production' : 'development',
		// Don't attempt to continue if there are any errors.
		bail: true,
		// Use source maps during development builds or when specified by GENERATE_SOURCEMAP
		devtool: shouldUseSourceMap && (isEnvProduction ? 'source-map' : 'cheap-module-source-map'),
		// These are the "entry points" to our application.
		entry: {
			main: [
				// Include any polyfills needed for the target browsers.
				require.resolve('./polyfills'),
				// This is your app's code
				app.context
			]
		},
		output: {
			// The build output directory.
			path: path.resolve('./dist'),
			// Generated JS file names (with nested folders).
			// There will be one main bundle, and one file per asynchronous chunk.
			// We don't currently advertise code splitting but Webpack supports it.
			filename: '[name].js',
			// There are also additional JS chunk files if you use code splitting.
			chunkFilename: 'chunk.[name].js',
			// Add /* filename */ comments to generated require()s in the output.
			pathinfo: !isEnvProduction,
			publicPath,
			// Improved sourcemap path name mapping for system filepaths
			devtoolModuleFilenameTemplate: info => {
				let file = isEnvProduction
					? path.relative(app.context, info.absoluteResourcePath)
					: path.resolve(info.absoluteResourcePath);
				file = file.replace(/\\/g, '/').replace(/\.\./g, '_');
				const loader = info.allLoaders.match(/[^\\/]+-loader/);
				if (info.resource.includes('.less') && loader) {
					// Temporary special handling for LESS files. The css-loader will
					// output absolute-path mapped LESS sourcemaps, unaffected by this
					// function, while both css-loader and style-loader pseudo modules
					// will get their own sourcemaps. Good to differentiate.
					return file + '?' + loader[0];
				} else {
					return file;
				}
			},
			// Use webpack 5 handling of asset files; remove once upgraded to webpack 5
			futureEmitAssets: true,
			// Prevent potential conflicts in muliple runtimes
			jsonpFunction: 'webpackJsonp' + app.name,
			// Allow versatile 'global' mapping across multiple deploy formats
			globalObject: 'this'
		},
		resolve: {
			// These are the reasonable defaults supported by the React/ES6 ecosystem.
			extensions: ['.js', '.mjs', '.jsx', '.ts', '.tsx', '.json'].filter(
				ext => useTypeScript || !ext.includes('ts')
			),
			// Allows us to specify paths to check for module resolving.
			modules: [path.resolve('./node_modules'), 'node_modules'],
			// Don't resolve symlinks to their underlying paths
			symlinks: false,
			// Backward compatibility for apps using new ilib references with old Enact
			// and old apps referencing old iLib location with new Enact
			alias: fs.existsSync(path.join(app.context, 'node_modules', '@enact', 'i18n', 'ilib'))
				? Object.assign({ilib: '@enact/i18n/ilib'}, app.alias)
				: Object.assign({'@enact/i18n/ilib': 'ilib'}, app.alias)
		},
		module: {
			rules: [
				{
					// "oneOf" will traverse all following loaders until one will
					// match the requirements. When no loader matches it will fall
					// back to the "file" loader at the end of the loader list.
					oneOf: [
						// Process JS with Babel.
						{
							test: /\.(js|mjs|jsx|ts|tsx)$/,
							exclude: /node_modules.(?!@enact)/,
							loader: require.resolve('babel-loader'),
							options: {
								configFile: path.join(__dirname, 'babel.config.js'),
								babelrc: false,
								// This is a feature of `babel-loader` for webpack (not Babel itself).
								// It enables caching results in ./node_modules/.cache/babel-loader/
								// directory for faster rebuilds.
								cacheDirectory: !isEnvProduction,
								cacheCompression: false,
								compact: isEnvProduction
							}
						},
						// Style-based rules support both LESS and CSS format, with *.module.* extension format
						// to designate CSS modular support.
						// See comments within `getStyleLoaders` for details on the stylesheet loader chains and
						// options used at each level of processing.
						{
							test: /\.module\.css$/,
							use: getStyleLoaders({modules: true})
						},
						{
							test: /\.css$/,
							// The `forceCSSModules` Enact build option can be set true to universally apply
							// modular CSS support.
							use: getStyleLoaders({modules: app.forceCSSModules}),
							// Don't consider CSS imports dead code even if the
							// containing package claims to have no side effects.
							// Remove this when webpack adds a warning or an error for this.
							// See https://github.com/webpack/webpack/issues/6571
							sideEffects: true
						},
						{
							test: /\.module\.less$/,
							use: getLessStyleLoaders({modules: true})
						},
						{
							test: /\.less$/,
							use: getLessStyleLoaders({modules: app.forceCSSModules}),
							sideEffects: true
						},
						// "file" loader handles on all files not caught by the above loaders.
						// When you `import` an asset, you get its output filename and the file
						// is copied during the build process.
						{
							loader: require.resolve('file-loader'),
							// Exclude `js` files to keep "css" loader working as it injects
							// its runtime that would otherwise be processed through "file" loader.
							// Also exclude `html` and `json` extensions so they get processed
							// by webpacks internal loaders.
							// Exclude `ejs` HTML templating language as that's handled by
							// the HtmlWebpackPlugin.
							exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.ejs$/, /\.json$/],
							options: {
								name: '[path][name].[ext]'
							}
						}
						// ** STOP ** Are you adding a new loader?
						// Make sure to add the new loader(s) before the "file" loader.
					]
				}
			]
		},
		// Specific webpack-dev-server options.
		devServer: {
			// Broadcast http server on the localhost, port 8080.
			host: '0.0.0.0',
			port: 8080,
			// Support the same public path as webpack config.
			publicPath: publicPath,
			// By default WebpackDevServer serves files from public and __mocks__ directories
			// in addition to all the virtual build products that it serves from memory.
			contentBase: [path.resolve('./public'), path.resolve('./__mocks__')],
			contentBasePublicPath: publicPath + '/',
			// Any changes to files from `contentBase` should trigger a page reload.
			watchContentBase: true,
			// Reportedly, this avoids CPU overload on some systems.
			// https://github.com/facebookincubator/create-react-app/issues/293
			watchOptions: {
				ignored: /node_modules[\\/](?!@enact[\\/](?!.*node_modules))/
			}
		},
		// Target app to build for a specific environment (default 'web')
		target: app.environment,
		// Optional configuration for polyfilling NodeJS built-ins.
		node: app.nodeBuiltins,
		performance: false,
		optimization: {
			minimize: isEnvProduction,
			// These are only used in production mode
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						parse: {
							// we want uglify-js to parse ecma 8 code. However, we don't want it
							// to apply any minfication steps that turns valid ecma 5 code
							// into invalid ecma 5 code. This is why the 'compress' and 'output'
							// sections only apply transformations that are ecma 5 safe
							// https://github.com/facebook/create-react-app/pull/4234
							ecma: 8
						},
						compress: {
							ecma: 5,
							warnings: false,
							// Disabled because of an issue with Uglify breaking seemingly valid code:
							// https://github.com/facebook/create-react-app/issues/2376
							// Pending further investigation:
							// https://github.com/mishoo/UglifyJS2/issues/2011
							comparisons: false,
							// Disabled because of an issue with Terser breaking valid code:
							// https://github.com/facebook/create-react-app/issues/5250
							// Pending futher investigation:
							// https://github.com/terser-js/terser/issues/120
							inline: 2
						},
						mangle: {
							safari10: true
						},
						output: {
							ecma: 5,
							comments: false,
							// Turned on because emoji and regex is not minified properly using default
							// https://github.com/facebook/create-react-app/issues/2488
							ascii_only: true
						}
					},
					// Use multi-process parallel running to improve the build speed
					// Default number of concurrent runs: os.cpus().length - 1
					parallel: true,
					// Enable file caching
					cache: true,
					sourceMap: shouldUseSourceMap
				}),
				new OptimizeCSSAssetsPlugin({
					cssProcessorOptions: {
						// TODO: verify calc issue fixed. Related: https://github.com/postcss/postcss-calc/issues/50
						// calc: false,
						parser: require('postcss-safe-parser'),
						map: shouldUseSourceMap && {
							// `inline: false` forces the sourcemap to be output into a
							// separate file
							inline: false,
							// `annotation: true` appends the sourceMappingURL to the end of
							// the css file, helping the browser find the sourcemap
							annotation: true
						}
					},
					cssProcessorPluginOptions: {
						preset: ['default', {minifyFontValues: {removeQuotes: false}}]
					}
				})
			]
		},
		plugins: [
			// Generates an `index.html` file with the js and css tags injected.
			new HtmlWebpackPlugin({
				// Title can be specified in the package.json enact options or will
				// be determined automatically from any appinfo.json files discovered.
				title: app.title || '',
				inject: 'body',
				template: app.template || path.join(__dirname, 'html-template.ejs'),
				xhtml: true,
				minify: isEnvProduction && {
					removeComments: true,
					collapseWhitespace: false,
					removeRedundantAttributes: true,
					useShortDoctype: true,
					removeEmptyAttributes: true,
					removeStyleLinkTypeAttributes: true,
					keepClosingSlash: true,
					minifyJS: true,
					minifyCSS: true,
					minifyURLs: true
				}
			}),
			// Make NODE_ENV environment variable available to the JS code, for example:
			// if (process.env.NODE_ENV === 'production') { ... }.
			// It is absolutely essential that NODE_ENV was set to production here.
			// Otherwise React will be compiled in the very slow development mode.
			new DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(isEnvProduction ? 'production' : 'development'),
				'process.env.PUBLIC_URL': JSON.stringify(publicPath)
			}),
			// Inject prefixed environment variables within code, when used
			new EnvironmentPlugin(Object.keys(process.env).filter(key => /^(REACT_APP|WDS_SOCKET)/.test(key))),
			// Note: this won't work without MiniCssExtractPlugin.loader in `loaders`.
			!process.env.INLINE_STYLES &&
				new MiniCssExtractPlugin({
					filename: '[name].css',
					chunkFilename: 'chunk.[name].css'
				}),
			// Provide meaningful information when modules are not found
			new ModuleNotFoundPlugin(app.context),
			// Ensure correct casing in module filepathes
			new CaseSensitivePathsPlugin(),
			// If you require a missing module and then `npm install` it, you still have
			// to restart the development server for Webpack to discover it. This plugin
			// makes the discovery automatic so you don't have to restart.
			// See https://github.com/facebookincubator/create-react-app/issues/186
			!isEnvProduction && new WatchMissingNodeModulesPlugin('./node_modules'),
			// Switch the internal NodeOutputFilesystem to use graceful-fs to avoid
			// EMFILE errors when hanndling mass amounts of files at once, such as
			// what happens when using ilib bundles/resources.
			new GracefulFsPlugin(),
			// Automatically configure iLib library within @enact/i18n. Additionally,
			// ensure the locale data files and the resource files are copied during
			// the build to the output directory.
			new ILibPlugin({symlinks: false, emit: false}),
			// Automatically detect ./appinfo.json and ./webos-meta/appinfo.json files,
			// and parses any to copy over any webOS meta assets at build time.
			new WebOSMetaPlugin({htmlPlugin: HtmlWebpackPlugin}),
			// TypeScript type checking
			useTypeScript &&
				new ForkTsCheckerWebpackPlugin({
					typescript: resolve.sync('typescript', {
						basedir: 'node_modules'
					}),
					async: !isEnvProduction,
					checkSyntacticErrors: true,
					tsconfig: 'tsconfig.json',
					reportFiles: [
						'../**/src/**/*.{ts,tsx}',
						'**/src/**/*.{ts,tsx}',
						'!**/src/**/__tests__/**',
						'!**/src/**/?(*.)+(spec|test).*',
						'!**/src/setupProxy.*',
						'!**/src/setupTests.*'
					],
					silent: true,
					// The formatter is invoked directly in WebpackDevServerUtils during development
					formatter: !process.env.DISABLE_TSFORMATTER ? typescriptFormatter : undefined
				}),
			new ESLintPlugin({
				// Plugin options
				extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
				formatter: require.resolve('react-dev-utils/eslintFormatter'),
				eslintPath: require.resolve('eslint'),
				// ESLint class options
				resolvePluginsRelativeTo: __dirname,
				cache: true
			})
		].filter(Boolean)
	};
};
