const VrpcAdapter = require("../../../../vrpc/VrpcAdapter")

class TestClassNested {
  constructor (value = 0) {
    this._value = value
  }
  increment () {
    this._value += 1
    return this._value
  }
}

// auto registration
VrpcAdapter.register(TestClassNested)
module.exports = TestClassNested
