const { VrpcNative } = require('vrpc')
const addon = require('./build/Release/vrpc_bar')

// create an instance of VrpcNative
const native = new VrpcNative(addon)

// obtain a class proxy
const Bar = native.getClass('Bar')

console.log('Why an example at the Bar?')
console.log(' - Because', Bar.philosophy())

// Create a Bar instance (using default constructor)
const bar = new Bar()

console.log('Well then, get me a drink!')
try {
  bar.prepareDrink(done => console.log(done))
} catch (err) {
  console.log(` - ${err.message}`)
  console.log(" - I'll get some bottles out of the cellar.")
}

bar.addBottle('Don Papa', 'rum', 'Philippines')
bar.addBottle('Botucal', 'rum', 'Venezuela')
bar.addBottle('Lustau Solera', 'brandy', 'Spain')
bar.addBottle('Coke', 'soft', 'USA')

bar.vrpcOn('onRemove', what => {
  console.log(` - Oh, the ${what.name} went empty!`)
})

console.log('Fine, can I have a drink now?')
const answer = bar.prepareDrink(done => console.log(` - ${done}`))
console.log(` - ${answer}`)
bar.removeBottle('Coke')

// Create another bar - already equipped - using second constructor
const neighborsBar = new Bar([
  { name: 'Adelholzer', category: 'water', country: 'Germany' },
  { name: 'Hohes C', category: 'juice', country: 'Germany' }
])
console.log('How is your neighbor sorted?')
console.log(' - Not so well... \n', neighborsBar.getSelection())
