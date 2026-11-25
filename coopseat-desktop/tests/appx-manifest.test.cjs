const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addBorderlessCapture } = require('../electron/appx-manifest.cjs');

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<Package
   xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
   xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10">
  <Capabilities>
  <Capability Name="internetClientServer"/>
  <rescap:Capability Name="runFullTrust"/>
  <uap6:Capability xmlns:uap6="http://schemas.microsoft.com/appx/manifest/uap/windows10/6" Name="graphicsCapture"/>
  <DeviceCapability Name="microphone"/>
  </Capabilities>
</Package>
`;

test('declares borderless capture beside graphics capture', () => {
  const xml = addBorderlessCapture(manifest);
  assert.match(xml, /xmlns:uap11="http:\/\/schemas.microsoft.com\/appx\/manifest\/uap\/windows10\/11"/);
  const capture = xml.indexOf('Name="graphicsCapture"');
  const borderless = xml.indexOf('Name="graphicsCaptureWithoutBorder"');
  const device = xml.indexOf('Name="microphone"');
  assert.ok(capture < borderless && borderless < device);
});

test('leaves a manifest that already allows a borderless capture unchanged', () => {
  const once = addBorderlessCapture(manifest);
  assert.equal(addBorderlessCapture(once), once);
});
