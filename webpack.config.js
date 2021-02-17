const path = require('path')

module.exports = {
  mode: 'production',
  entry: './index-browser.js',
  resolve: {
    fallback: {
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      url: require.resolve('url/'),
      stream: require.resolve('stream-browserify')
    },
  },
  output: {
    path: path.resolve(__dirname, 'browser'),
    library: 'vrpc',
    libraryTarget: 'umd',
    filename: 'vrpc.js'
  },
};
