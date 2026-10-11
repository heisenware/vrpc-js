'use strict'

// Members whose name begins with an underscore are internals: the API
// reference leaves them out, as it leaves out anything tagged @private.
exports.handlers = {
  newDoclet ({ doclet }) {
    if (typeof doclet.name === 'string' && doclet.name.startsWith('_')) {
      doclet.access = 'private'
    }
  }
}
