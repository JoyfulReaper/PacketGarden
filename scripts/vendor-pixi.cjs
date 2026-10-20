// Commit the browser bundle so dotnet run/publish does not require npm or a CDN.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules/pixi.js');
const destination = path.join(root, 'wwwroot/vendor/pixi');
const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'))).version;
const expected = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).devDependencies['pixi.js'];
if (version !== expected) throw new Error(`Expected Pixi ${expected}, found ${version}`);
fs.mkdirSync(destination, { recursive: true });
// Source maps are not served; strip their optional debugging URL, keeping the license header.
const bundle = fs.readFileSync(path.join(source, 'dist/pixi.min.js'), 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/gm, '');
fs.writeFileSync(path.join(destination, 'pixi.min.js'), bundle);
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(destination, 'LICENSE'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
const notices = ['License notices for the pinned Pixi package and its installed dependencies.'];
for (const entry of Object.keys(lock.packages).filter(key => key.startsWith('node_modules/')).sort()) {
  const directory = path.join(root, entry);
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')));
  const licenseFile = fs.readdirSync(directory).find(name => /^licen[cs]e(\.|$)/i.test(name));
  let license;
  if (licenseFile) license = fs.readFileSync(path.join(directory, licenseFile), 'utf8');
  else if (metadata.name === '@pixi/colord') {
    // Its npm package omits LICENSE.md. Upstream: github.com/omgovich/colord/blob/master/LICENSE.md
    const mitBody = fs.readFileSync(path.join(source, 'LICENSE'), 'utf8').split('Permission is hereby granted')[1];
    license = `MIT License\n\nCopyright (c) 2020 Vlad Shilov <omgovich@ya.ru>\n\nPermission is hereby granted${mitBody}`;
  } else throw new Error(`Missing license for ${metadata.name}`);
  notices.push(`${metadata.name} ${metadata.version}\n${license.trim()}`);
}
fs.writeFileSync(path.join(destination, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n\n---\n\n') + '\n');
console.log(`Vendored pixi.js ${version}`);
