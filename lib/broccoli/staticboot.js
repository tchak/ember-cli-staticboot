/* eslint-env node */
'use strict';

const RSVP = require('rsvp');
const FastBoot = require('fastboot');
const fs = require('fs');
const Plugin = require('broccoli-plugin');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;
const path = require('path');
const critical = require('critical');

function StaticBootBuild(inputTree, options) {
  options = options || {};
  if (!(this instanceof StaticBootBuild)) {
    return new StaticBootBuild(inputTree, options);
  }
  Plugin.call(this, [inputTree]);
  this.paths = options.paths || [];
  this.index = options.index || false;
  this.critical = options.critical || false;
  this.inputTree = inputTree;
}

StaticBootBuild.prototype = Object.create(Plugin.prototype);
StaticBootBuild.prototype.constructor = StaticBootBuild;

StaticBootBuild.prototype.build = function() {
  var srcDir = this.inputPaths[0];
  var destDir = this.outputPath;

  const app = new FastBoot({
    distPath: srcDir,
    resilient: true
  });

  const buildStaticPage = this.buildStaticPage(app, srcDir, destDir);
  const promises = this.paths.map(path => buildStaticPage(path));
  return RSVP.all(promises);
};

StaticBootBuild.prototype.buildStaticPage = function(app, baseDir, directory) {
  return path => {
    return new RSVP.Promise((resolve, reject) => {
      app
        .visit(path, { request: { headers: {} }, response: {} })
        .then(result => result.html())
        .then(html => {
          const outputPath = this.outputPathForRoute(path, directory);
          const outputDir = getDirName(outputPath);

          mkdirp(outputDir, err => {
            if (err) {
              return reject(err);
            }
            return (this.critical
              ? writeCritical(baseDir, outputPath, html)
              : writeFile(outputPath, html)).then(resolve, reject);
          });
        });
    });
  };
};

function writeCritical(base, dest, html) {
  const criticalOptions = {
    minify: true,
    inline: true,
    folder: base,
    base,
    html,
    dest
  };
  return critical.generate(criticalOptions);
}

function writeFile(outputPath, html, resolve, reject) {
  new RSVP.Promise((resolve, reject) => {
    fs.writeFile(outputPath, html, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

StaticBootBuild.prototype.outputPathForRoute = function(routePath, directory) {
  const isIndex = routePath[routePath.length - 1] === '/';
  let outputPath = routePath + (this.index ? '/index.html' : '.html');

  if (isIndex) {
    outputPath = 'index.html';
  }

  return `${path.join(directory, outputPath)}`;
};

module.exports = StaticBootBuild;
