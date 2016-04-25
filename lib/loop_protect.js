function LoopProtect() {
  this.counters = {}
  this.threshold = 500
}

LoopProtect.prototype.reset = function protect(options) {
  var key = options.key;
  var now = (new Date()).getTime()
  this.counters[key] = this.counters[key] || {file: options.file, line: options.line, column: options.column}
  this.counters[key].time = now
}

LoopProtect.prototype.guard = function guard(key) {
  var current = this.counters[key]
  var now = (new Date()).getTime()

  if ((now - current.time) > this.threshold) {
    if (this.onHitCallback) {
      this.onHitCallback(current)
    }
    return true
  }

  return false
}

LoopProtect.prototype.setThreshold = function setThreshold(threshold) {
  this.threshold = threshold
}

LoopProtect.prototype.onHit = function onHit(callback) {
  this.onHitCallback = callback
}

module.exports = new LoopProtect()
