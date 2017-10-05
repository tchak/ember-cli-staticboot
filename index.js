/* eslint-env node */
'use strict';

const mergeTrees = require('broccoli-merge-trees');
const StaticBootBuild = require('./lib/broccoli/staticboot');
const Funnel = require('broccoli-funnel');

const defaultOptions = {
  paths: [],
  critical: true,
  destDir: 'staticboot',
  include: ['**/*']
};

module.exports = {
  name: 'ember-cli-staticboot',

  included(app) {
    this._super.included.apply(this, arguments);

    this.staticbootOptions = Object.assign(
      {},
      defaultOptions,
      app.options['ember-cli-staticboot']
    );
  },

  config() {
    if (!this.staticbootOptions) {
      return;
    }
    return {
      staticBoot: {}
    };
  },

  postprocessTree(type, tree) {
    if (type !== 'all') {
      return tree;
    }

    const trees = [tree];
    const destDirIsRoot = this.staticbootOptions.destDir === '';
    const mergeOptions = {};

    let staticBootTree = new StaticBootBuild(tree, {
      index: this.staticbootOptions.index,
      critical: this.staticbootOptions.critical,
      paths: this.staticbootOptions.paths
    });

    staticBootTree = new Funnel(staticBootTree, {
      include: this.staticbootOptions.include,
      srcDir: './',
      destDir: this.staticbootOptions.destDir
    });

    trees.push(staticBootTree);

    if (destDirIsRoot) {
      mergeOptions.overwrite = true;
    }

    return mergeTrees(trees, mergeOptions);
  }
};
