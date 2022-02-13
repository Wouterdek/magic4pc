#!/usr/bin/env node

const fs = require('fs');

const packageInfo = JSON.parse(fs.readFileSync('package.json'));
const appInfo = JSON.parse(fs.readFileSync('webos-meta/appinfo.json'));

fs.writeFileSync(
	'webos-meta/appinfo.json',
	`${JSON.stringify(
		{
			...appInfo,
			version: packageInfo.version,
		},
		null,
		'\t'
	)}\n`
);
