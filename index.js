'use strict'
// one assignment per name: Node detects them as named exports, so
// `import { VrpcClient } from 'vrpc'` works from ES modules, too
exports.VrpcNative = require('./vrpc/VrpcNative')
exports.VrpcClient = require('./vrpc/VrpcClient')
exports.VrpcAdapter = require('./vrpc/VrpcAdapter')
exports.VrpcAgent = require('./vrpc/VrpcAgent')
exports.VrpcPersistor = require('./vrpc/VrpcPersistor')
