var webpack = require('webpack');
var path = require('path');
var webpackTargetElectronRenderer = require('webpack-target-electron-renderer');

var BUILD_DIR = path.resolve(__dirname, 'build');
var APP_DIR = path.resolve(__dirname, 'src');

var config = {
  entry: APP_DIR + '/index.js',
  output: {
    path: BUILD_DIR,
    filename: 'index.js'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  module : {
    loaders : [
      {
        test : /\.jsx?/,
        include : APP_DIR,
        exclude: /node_modules/,
        loader : 'babel'
      }
    ]
  }
};

config.target = webpackTargetElectronRenderer(config);

module.exports = config;
