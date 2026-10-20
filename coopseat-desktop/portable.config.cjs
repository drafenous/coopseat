const base = require('./package.json').build;
module.exports = {
  ...base,
  win: { ...base.win, artifactName: 'CoopSeat-${version}-Portable.${ext}' },
};
