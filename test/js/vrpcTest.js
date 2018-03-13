/* 'use strict'

const vrpc = require('../build/Release/vrpc')

vrpc.loadBindings(__dirname + '/../build/Release/vrpc_test_binding.so')

function handleCallback (json) {
  console.log('Received callback', json)
}

vrpc.onCallback(handleCallback)

const json = {
  targetId: 'TestClass',
  function: '__create__',
  data: { a1: 5 }
}
const output1 = JSON.parse(vrpc.callCpp(JSON.stringify(json)))
console.log('\noutput1', output1)

const json2 = {
  targetId: output1.data.r,
  function: 'getValue',
  data: { a1: 5 }
}
const output2 = vrpc.callCpp(JSON.stringify(json2))
console.log('\noutput2', output2)

const json3 = {
  targetId: output1.data.r,
  function: 'setValue',
  data: {a1: 6}
}
const output3 = vrpc.callCpp(JSON.stringify(json3))
console.log('\noutput3', output3)

const json4 = {
  targetId: output1.data.r,
  function: 'registerCallback',
  data: { a1: 'callback-id-1234' }
}
const output4 = JSON.parse(vrpc.callCpp(JSON.stringify(json4)))
console.log('\noutput4', output4)

const json5 = {
  targetId: output1.data.r,
  function: 'callMeBack',
  data: { a1: 42 }
}
const output5 = JSON.parse(vrpc.callCpp(JSON.stringify(json5)))
console.log('\noutput5', output5)
 */