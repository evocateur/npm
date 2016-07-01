'use strict'
var moduleName = require('../utils/module-name.js')

function andIsDev (name) {
  return function (req) {
    return req.package &&
      req.package.devDependencies &&
      req.package.devDependencies[name]
  }
}

exports.isDev = function (node) {
  return node.requiredBy.some(andIsDev(moduleName(node)))
}

function andIsOnlyDev (name) {
  var isThisDev = andIsDev(name)
  return function (req) {
    return isThisDev(req) &&
      (!req.package.dependencies || !req.package.dependencies[name])
  }
}

exports.isOnlyDev = function (node) {
  return node.requiredBy.every(andIsOnlyDev(moduleName(node)))
}
var isTreeDev = exports.isTreeDev = function (node, tree) {
  // If we don't have the node in the tree, assume the node
  // is not a dev dependency (as we're in a subtree)
  //
  // If a node is not required by anything, then we've reached
  // the top level package.
  if (!node || (node && node.package && node.package._requiredBy.length === 0)) {
    return false
  }

  // A package is only a devDependency if nothing else requires it
  if (isOnlyDev(node)) {
    return true
  }

  // Otherwise, walk up one step.
  return node.package._requiredBy.every(function (pkg) {
    return isTreeDev(tree[pkg], tree)
  })
}
