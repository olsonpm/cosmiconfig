// @flow
'use strict';

const requireFromString = require('require-from-string');
const readFile = require('./readFile');

module.exports = function loadJs(
  filepath: string,
  options: { ignoreEmpty: boolean, sync?: boolean }
): Promise<?cosmiconfig$Result> | ?cosmiconfig$Result {
  function parseJsFile(content: ?string): ?cosmiconfig$Result {
    const isEmpty = content === '';
    if (content == null || (isEmpty && options.ignoreEmpty)) return null;

    return isEmpty
      ? { config: undefined, filepath, isEmpty }
      : { config: requireFromString(content, filepath), filepath };
  }

  return !options.sync
    ? readFile(filepath).then(parseJsFile)
    : parseJsFile(readFile.sync(filepath));
};
