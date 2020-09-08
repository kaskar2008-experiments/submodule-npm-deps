const fs = require('fs');
const path = require('path');
const ini = require('ini');
const ora = require('ora');
const { exec } = require('child_process');
const deependencies = {};
const devDependencies = {};

/**
 * Parses .gitmodules for modules paths
 * 
 * @returns {string[]}
 */
function getModulesPaths() {
  const gitmodules = ini.parse(fs.readFileSync('./.gitmodules', 'utf-8'));

  return Object.keys(gitmodules).reduce((acc, cur) => {
    acc.push(gitmodules[cur].path);

    return acc;
  }, []);
}

/**
 * 
 * @param {string} packagePath
 * @returns {{
 *  dependencies?: { [key: string]: string },
 *  devDependencies?: { [key: string]: string },
 * }}
 */
function getDependencies(packagePath) {
  try {
    const submodulePackageFile = require(path.resolve(__dirname, packagePath, 'package.json'));

    return {
      dependencies: submodulePackageFile.dependencies,
      devDependencies: submodulePackageFile.devDependencies,
    };
  } catch (error) {
    return {};
  }
}

function accumulateDependencies() {
  getModulesPaths().forEach(submodulePath => {
    const submoduleDependencies = getDependencies(submodulePath);
    Object.assign(deependencies, submoduleDependencies.dependencies);
    Object.assign(devDependencies, submoduleDependencies.devDependencies);
  });

  /**
   * Transforms dependency object to `package-name@version` array
   * 
   * @param {{
   *  dependencies?: { [key: string]: string },
   *  devDependencies?: { [key: string]: string },
   * }} deps
   * @returns {string[]}
   */
  function transformDependencies(deps) {
    return Object.keys(deps).reduce((acc, package) => {
      acc.push(`${package}@${deps[package]}`);

      return acc;
    }, []);
  }

  return {
    deependencies: transformDependencies(deependencies),
    devDependencies: transformDependencies(devDependencies),
  };
}

function installDependencies() {
  /**
   * @typedef TInstallationEntry
   * @type {object}
   * @property {string[]} deps - Array of dependencies.
   * @property {string[]} args - additional arguments for `npm install`.
   * @property {string} [text] - your age.
   */

  const transformedDependencies = accumulateDependencies();

  /**
   * @type TInstallationEntry
   */
  const installationMap = [
    {
      deps: transformedDependencies.deependencies,
      args: [],
    },
    {
      deps: transformedDependencies.devDependencies,
      args: ['-D'],
    }
  ];

  /**
   * @param {TInstallationEntry} installationEntry
   */
  function install(installationEntry) {
    const loader = ora(installationEntry.text || 'Installing submodules dependencies').start();

    exec(`npm i ${installationEntry.deps.join(' ')} ${installationEntry.args.join(' ')}`, (err, out) => {
      loader.stop();

      if (err) {
        console.error(err);
      }
    });
  }

  for (let installationEntry of installationMap) {
    install(installationEntry);
  }
}

installDependencies();