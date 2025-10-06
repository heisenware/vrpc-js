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
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser'),
      vm: false
    }
  },
  output: {
    path: path.resolve(__dirname, 'browser'),
    library: 'vrpc',
    libraryTarget: 'umd',
    filename: 'vrpc.js'
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ]
}
