'use strict'

const EventEmitter = require('events')
const { VrpcLocal } = require('vrpc')
const addon = require('./build/Release/vrpc_bar')

// Create an event emitter
const emitter = new EventEmitter()

emitter.on('empty', what => {
  console.log(` - Oh, the ${what.name} went empty!`)
})

// Create an instance of a local (native-addon) vrpc factory
const vrpc = new VrpcLocal(addon)

console.log('Why an example at the Bar?')
console.log(' - Because', vrpc.callStatic('Bar', 'philosophy'))

// Create a Bar instance (using default constructor)
const bar = vrpc.create('Bar')

console.log('Well then, get me a drink!')
try {
  bar.prepareDrink((done) => console.log(done))
} catch (err) {
  console.log(` - ${err.message}`)
  console.log(' - I\'ll get some bottles out of the cellar.')
}

bar.addBottle('Don Papa', 'rum', 'Philippines')
bar.addBottle('Botucal', 'rum', 'Venezuela')
bar.addBottle('Lustau Solera', 'brandy', 'Spain')
bar.addBottle('Coke', 'soft', 'USA')
bar.onRemove({ emitter, event: 'empty' })

console.log('Fine, can I have a drink now?')
const answer = bar.prepareDrink((done) => console.log(` - ${done}`))
console.log(` - ${answer}`)
bar.removeBottle('Coke')

// Create another bar - already equipped - using second constructor
const neighborsBar = vrpc.create(
  'Bar',
  [
    { name: 'Adelholzer', category: 'water', country: 'Germany' },
    { name: 'Hohes C', category: 'juice', country: 'Germany' }
  ]
)
console.log('How is your neighbor sorted?')
console.log(' - Not so well... \n', neighborsBar.getSelection())
