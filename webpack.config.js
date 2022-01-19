const webpack = require('webpack')
const path = require('path')

module.exports = {
  mode: 'production',
  entry: './index-browser.js',
  resolve: {
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
