'use strict'

const EventEmitter = require('events')
const VrpcLocal = require('../js/VrpcLocal')
const addon = require('../build/Release/vrpc_example')

// Create an event emitter
const emitter = new EventEmitter()

emitter.on('empty', what => {
  console.log(` - Oh no! The ${what} is empty!`)
})

// Create an instance of a local (native-addon) vrpc factory
const vrpc = VrpcLocal(addon)

console.log('Why an example at the Bar?')
console.log(' - Because', vrpc.callStatic('Bar', 'philosophy'))

// Create a Bar instance (using default constructor)
const bar = vrpc.create('Bar')

console.log('Do you have rum?')
console.log(bar.hasDrink('rum') ? ' - Yes' : ' - No')

console.log('Well, then let\'s get a bottle out of the cellar.')
bar.addBottle('rum', { brand: 'Don Papa', country: 'Philippines', age: 7 })

console.log('Now, can I have a drink?')
console.log(bar.hasDrink('rum') ? ' - Yes' : ' - No')

console.log('I would go for a "Dark and Stormy", please.')
bar.prepareDrink(seconds => {
  console.log(` - Here's your drink, took only ${seconds}s`)
})

console.log('Nice! I take another one. Please tell me, once the rum is empty.')
bar.onEmptyDrink({ emitter: emitter, event: 'empty' })
bar.prepareDrink(seconds => {
  console.log(` - Here's your drink, took ${seconds}s this time.`)
})
bar.removeBottle('rum')

// Create another bar - already equipped - using second constructor
const neighborsBar = vrpc.create(
  'Bar',
  {
    rum: [
      { brand: 'Botucal', country: 'Venezuela', age: 8 },
      { brand: 'Plantation XO', country: 'Barbados', age: 20 }
    ],
    brandy: [
      { brand: 'Lustau Solera', country: 'Spain', age: 15 }
    ]
  }
)
console.log('How is your neighbor sorted?')
console.log(' - Very well:\n', neighborsBar.getAssortment())
