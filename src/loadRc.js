// @flow
'use strict';

const yaml = require('js-yaml');
const requireFromString = require('require-from-string');
const readFile = require('./readFile');
const parseJson = require('./parseJson');
const funcRunner = require('./funcRunner');

module.exports = function loadRc(
  filepath: string,
  options: {
    ignoreEmpty: boolean,
    sync?: boolean,
    rcStrictJson?: boolean,
    rcExtensions?: boolean,
  }
): Promise<?cosmiconfig$Result> | ?cosmiconfig$Result {
  if (!options.sync) {
    return readFile(filepath)
      .then(parseExtensionlessRcFile)
      .then(checkExtensionlessRcResult);
  } else {
    return checkExtensionlessRcResult(
      parseExtensionlessRcFile(readFile.sync(filepath))
    );
  }

  function checkExtensionlessRcResult(result) {
    if (result) return result;
    if (options.rcExtensions) return loadRcWithExtensions();
    return null;
  }

  function parseExtensionlessRcFile(content: ?string): ?cosmiconfig$Result {
    const isEmpty = content === '';
    if (content == null || (isEmpty && options.ignoreEmpty)) return null;

    if (isEmpty) {
      return {
        config: undefined,
        filepath,
        isEmpty,
      };
    }

    const parsedConfig = options.rcStrictJson
      ? parseJson(content, filepath)
      : yaml.safeLoad(content, { filename: filepath });
    return {
      config: parsedConfig,
      filepath,
    };
  }

  function loadRcWithExtensions() {
    function loadExtension(
      extn: string,
      parse: (content: string, filename: string) => Object
    ) {
      // Check the result from the previous `loadExtension` invocation. If result
      // isn't null, just return that.
      return result => {
        if (result != null) return result;

        // Try to load the rc file for the given extension.
        return funcRunner(readRcFile(extn), [
          content => {
            const isEmpty = content === '';
            if (content == null || (isEmpty && options.ignoreEmpty)) {
              return null;
            }

            const fpath = `${filepath}.${extn}`;
            return isEmpty
              ? { config: undefined, filepath: fpath, isEmpty: true }
              : { config: parse(content, fpath), filepath: fpath };
          },
        ]);
      };
    }

    const parseYml = (content: string, filename: string) =>
      yaml.safeLoad(content, { filename });

    return funcRunner(!options.sync ? Promise.resolve() : undefined, [
      loadExtension('json', parseJson),
      loadExtension('yaml', parseYml),
      loadExtension('yml', parseYml),
      loadExtension('js', requireFromString),
    ]);
  }

  function readRcFile(extension: string): Promise<?string> | ?string {
    const filepathWithExtension = `${filepath}.${extension}`;
    return !options.sync
      ? readFile(filepathWithExtension)
      : readFile.sync(filepathWithExtension);
  }
};
