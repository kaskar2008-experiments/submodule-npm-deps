const fs = require('fs');
const path = require('path');
const ini = require('ini');
const { execSync } = require('child_process');

/**
 * Parses .gitmodules for modules paths
 * 
 * @param {string} root - Where to parse
 * @param {string[]} modulesPaths - Already parsed submodules
 * @returns {string[]} Array of submodule paths
 */
function getModulesPaths(root = __dirname, modulesPaths = []) {
  const gimodulesPath = path.join(root, '.gitmodules');
  let modulesPathsCopy = [ ...modulesPaths ];
  
  if (fs.existsSync(gimodulesPath)) {
    const gitmodules = ini.parse(fs.readFileSync(gimodulesPath, 'utf-8'));
  
    Object.keys(gitmodules).forEach(cur => {
      const modulePath = gitmodules[cur].path;

      modulesPathsCopy.push(modulePath);

      if (fs.existsSync(modulePath)) {
        modulesPathsCopy = getModulesPaths(modulePath, modulesPathsCopy);
      }
    });
  }

  return modulesPathsCopy;
}

/**
 * Installs packages on each submodule
 */
function installSubdeps() {
  console.log('Installing subdependencies...');

  for (let modulePath of getModulesPaths()) {
    execSync(`cd ${modulePath} && npm i`);
  }

  console.log('Done!');
}

installSubdeps();