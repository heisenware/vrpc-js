const webpack = require('webpack')
const path = require('path')

module.exports = {
  mode: 'production',
  entry: './index-browser.js',
  resolve: {
    // mqtt >= 5 answers a browser `require('mqtt')` with a prebuilt bundle
    // (dist/): a global-variable one that exports nothing to a module
    // system, and an ESM one whose inlined process polyfill parses every
    // incoming packet through a page timer (see browser-process.js). The
    // Node build is bundled instead, on this build's own polyfills.
    alias: {
      mqtt$: path.resolve(__dirname, 'node_modules/mqtt/build/index.js'),
      // the SOCKS transport is Node-only (net, dns); it stays out of the page
      socks$: false
    },
    fallback: {
      net: false,
      tls: false,
      fs: false,
      dns: false,
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      url: require.resolve('url/'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/')
    }
  },
  output: {
    path: path.resolve(__dirname, 'browser'),
    library: 'vrpc',
    libraryTarget: 'umd',
    filename: 'vrpc.js'
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.ProvidePlugin({
      process: path.resolve(__dirname, 'browser-process.js')
    })
  ]
}
