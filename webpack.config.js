const webpack = require('webpack')
const path = require('path')

module.exports = {
  mode: 'production',
  entry: './index-browser.js',
  resolve: {
    // mqtt >= 5 answers a browser `require('mqtt')` with its global-variable
    // bundle (dist/mqtt.min.js), which exports nothing to a module system;
    // the ESM bundle is the one made for bundlers and carries the Web
    // Worker keepalive timer - reached through the shim (see mqtt-browser.js)
    alias: {
      mqtt$: path.resolve(__dirname, 'mqtt-browser.js'),
      'mqtt-esm$': path.resolve(__dirname, 'node_modules/mqtt/dist/mqtt.esm.js')
    },
    fallback: {
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      url: require.resolve('url/'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer')
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
      process: 'process/browser'
    })
  ]
}
