const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Expose workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

try {
  const designPackagePath = fs.realpathSync(path.resolve(projectRoot, "node_modules/@awlt/design"));

  // If our design package is situated outside the monorepo bounds, tell Metro where it is explicitly.
  if (!designPackagePath.startsWith(workspaceRoot)) {
    config.watchFolders.push(designPackagePath);
    config.resolver.extraNodeModules = {
      ...config.resolver.extraNodeModules,
      "@awlt/design": designPackagePath,
    };
  }
} catch {
  // Ignore
}

module.exports = config;
