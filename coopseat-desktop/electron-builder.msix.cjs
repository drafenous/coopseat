const base = require('./package.json').build;

// Store submission. With no code-signing certificate, electron-builder leaves the
// package unsigned and writes Publisher CN=ms. Partner Center replaces that
// identity when the packaged app is created. identityName must then match the
// name reserved there (Product identity).
module.exports = {
  ...base,
  win: {
    ...base.win,
    target: 'appx',
  },
  appx: {
    applicationId: 'CoopSeat',
    identityName: 'Drafenous.CoopSeat',
    publisherDisplayName: 'Drafenous',
    displayName: 'CoopSeat',
    backgroundColor: '#0b1016',
    languages: ['pt-BR', 'en-US'],
    minVersion: '10.0.19041.0',
    maxVersionTested: '10.0.26100.0',
    capabilities: [
      'internetClientServer',
      'privateNetworkClientServer',
      'microphone',
      'webcam',
      'graphicsCapture',
    ],
    artifactName: 'CoopSeat-${version}.msix',
  },
};
