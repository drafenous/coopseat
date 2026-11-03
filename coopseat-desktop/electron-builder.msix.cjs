const base = require('./package.json').build;

// Publisher and identityName are the Partner Center product identity.
// Omitting publisher makes electron-builder write CN=ms, which the Store rejects.
module.exports = {
  ...base,
  win: {
    ...base.win,
    target: 'appx',
  },
  appx: {
    applicationId: 'CoopSeat',
    identityName: 'Drafenous.CoopSeat',
    publisher: 'CN=A510E10B-F3B3-4524-BDEF-551C16696C6B',
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
