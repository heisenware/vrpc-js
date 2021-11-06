const EventEmitter = require('events')

class Bar {

  constructor (selection = []) {
    this._selection = selection
    this._emitter = new EventEmitter()
  }

  /**
   * Provides deeper thoughts about bars.
   */
  static philosophy () {
    return 'I have mixed drinks about feelings.'
  }

  /**
   * Adds a bottle to the bar.
   *
   * @param {String} name Name of the bottle
   * @param {String} [category='n/a'] Category
   * @param {String} [country='n/a'] Country of production
   * @emits Bar#new
   *
   * @example
   * bar.addBottle('Botucal', category: 'rum', country: 'Venezuela')
   */
  addBottle (name, category = 'n/a', country = 'n/a') {
    this._selection.push({ name, category, country })
    this._emitter.emit('add', name)
  }

  /**
   * Removes a bottle from the bar.
   *
   * @param {String} name Removes the first bottle found having the given name.
   * @emits Bar#remove
   */
  removeBottle (name) {
    const index = this._selection.findIndex(x => x.name === name)
    if (index === -1) {
      throw new Error('Sorry, this bottle is not in our selection')
    }
    this._emitter.emit('remove', this._selection[index])
    return [
      ...this._selection.slice(0, index),
      ...this._selection.slice(index + 1)
    ]
  }

  /**
   * Adds a listener which is triggered whenever a bottle is added.
   *
   * @param {Function(Bottle)} listener
   */
  onAdd(listener) {
    this._emitter.on('add', listener)
  }

  /**
   * Adds a listener which is triggered whenever a bottle is removed.
   *
   * @param {Function(Bottle)} listener
   */
  onRemove(listener) {
    this._emitter.on('remove', listener)
  }

  /**
   * Ask the bartender to prepare a drink using the existing selection.
   *
   * @param {Function(String)} done Notification that the drink is ready
   * @returns {String} Some bartender wisdom
   */
  async prepareDrink (done) {
    const a = [this._random(), this._random(), this._random()]
    if (done) {
      setTimeout(() => {
        done(`Your drink is ready! I mixed ${a[0]} with ${a[1]} and a bit of ${a[2]}.`)
      }, 3000)
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
    return 'In preparation...'
  }

  /**
   * Shows the entire selection of the bar.
   */
  getSelection () {
    return this._selection
  }

  _random () {
    const nBottles = this._selection.length
    if (nBottles === 0) {
      throw new Error('I searched, but couldn\'t find any bottles')
    }
    const index = Math.floor(Math.random() * Math.floor(nBottles))
    return this._selection[index].name
  }
}
module.exports = Bar
