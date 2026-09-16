'use strict'
// The browser build's `mqtt`: the bundle mqtt >= 5 makes for bundlers
// (dist/mqtt.esm.js) carries the whole API as its default export only,
// while the Node build answers require('mqtt') with the API itself. The
// webpack config aliases 'mqtt' here, so the sources need no difference.
const mqtt = require('mqtt-esm')
module.exports = mqtt.default || mqtt
