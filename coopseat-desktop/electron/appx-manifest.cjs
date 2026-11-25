const { readFileSync, writeFileSync } = require('node:fs');

const CAPABILITY =
  '<uap11:Capability Name="graphicsCaptureWithoutBorder"/>';
const XMLNS =
  'xmlns:uap11="http://schemas.microsoft.com/appx/manifest/uap/windows10/11"';

/** Lets a packaged app hide the yellow Windows capture border. */
function addBorderlessCapture(xml) {
  if (xml.includes('graphicsCaptureWithoutBorder')) return xml;
  let next = xml.includes('xmlns:uap11=')
    ? xml
    : xml.replace('<Package', `<Package\n   ${XMLNS}`);
  const graphics = next.match(
    /<uap6:Capability\b[^>]*\bName="graphicsCapture"\/>/,
  );
  if (graphics) {
    return next.replace(graphics[0], `${graphics[0]}\n  ${CAPABILITY}`);
  }
  return next.replace('</Capabilities>', `  ${CAPABILITY}\n</Capabilities>`);
}

function writeBorderlessCapture(manifestPath) {
  writeFileSync(
    manifestPath,
    addBorderlessCapture(readFileSync(manifestPath, 'utf8')),
  );
}

module.exports = { addBorderlessCapture, writeBorderlessCapture };
