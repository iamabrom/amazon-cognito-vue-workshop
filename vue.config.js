// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const webpack = require("webpack");

module.exports = {
  configureWebpack: {
    devtool: 'source-map',
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
    ],
  },
  devServer: {
    allowedHosts: 'all',
    https: true,
    proxy: {
      '^/authn': {
        target: 'http://localhost:8081',
      }
    }
  }
};
