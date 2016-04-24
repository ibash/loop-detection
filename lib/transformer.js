// Transformer adds in loop protection code to each loop.
var recast = require('recast')
var types = require('ast-types')
var SourceMapConsumer = require('source-map').SourceMapConsumer
var namedTypes = types.namedTypes
var builtInTypes = types.builtInTypes
var builders = types.builders

var LOOP_TYPES = [
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement'
]

function Transformer(options) {
  this.alias = options.alias
  this.file = options.file
  this.code = options.code
  this.sourceMap = options.sourceMap

  if (this.sourceMap) {
    this.sourceMapConsumer = new SourceMapConsumer(this.sourceMap);
  }

  this.visitor = this._makeVisitor()
}

Transformer.prototype.transform = function transform() {
  var ast = recast.parse(this.code)
  types.visit(ast, this.visitor)

  var result = recast.print(ast, {inputSourceMap: this.sourceMap})
  return {code: result.code, sourceMap: result.map}
}

Transformer.prototype._makeVisitor = function _makeVisitor() {
  var self = this;
  var visitor = {}

  for (var i = 0 ; i < LOOP_TYPES.length; i++) {
    var loopType = LOOP_TYPES[i]
    var method = 'visit' + loopType
    visitor[method] = function(path) {
      self._visit(path)
      this.traverse(path)
    }
  }

  return visitor
}

Transformer.prototype._visit = function _visit(path) {
  this._processLoopBody(path)
  this._processLoopParent(path)
}

Transformer.prototype._processLoopParent = function _processLoopParent(path) {
  var node = path.node;
  var parent = path.parent.node
  var bodyStatements = null

  switch (parent.type) {
    case 'Program':
    case 'BlockStatement':
      bodyStatements = parent.body
      break

    case 'SwitchCase':
      bodyStatements = parent.consequent;
      break

    case 'IfStatement':
      var branch = parent.consequent === node ? 'consequent' : 'alternate'
      parent[branch] = builders.blockStatement([parent[branch]])
      bodyStatements = parent[branch].body
      break

    default:
      throw new Error('no handler for loop parent with type: ' + parent.type)
  }

  var position = bodyStatements.indexOf(node);
  bodyStatements.splice(position, 0, this._makeResetNode(node))
}

Transformer.prototype._processLoopBody = function _processLoopBody(path) {
  var node = path.node;

  if (!namedTypes.BlockStatement.check(node.body)) {
    node.body = builders.blockStatement([node.body])
  }

  var checkNode = this._makeCheckNode(node)
  var block = node.body
  block.body.unshift(checkNode)
}

// creates a reset node that points to the loop node
Transformer.prototype._makeResetNode = function _makeResetNode(node) {
  var options = this._loopProtectOptions(node)
  var code = this.alias +'.reset(' + JSON.stringify(options)+ ');'
  var ast = recast.parse(code)
  return ast.program.body[0]
}

Transformer.prototype._makeCheckNode = function _makeCheckNode(node) {
  var options = this._loopProtectOptions(node)
  var code = 'if (' + this.alias + '.guard(' + JSON.stringify(options.key) + ')) break;'

  var wrapped = 'while (true)' + code
  var ast = recast.parse(wrapped)
  var checkNode = ast.program.body[0].body

  if (!namedTypes.IfStatement.check(checkNode)) {
    throw new Error('expected check node to be an if statment')
  }

  return checkNode
}

Transformer.prototype._loopProtectOptions = function _protectOptions(node) {
  var location = node.loc.start
  var line = null
  var column = null

  if (this.sourceMapConsumer) {
    var originalPosition = this.sourceMapConsumer.originalPositionFor(location)
    line = originalPosition.line || location.line
    column = originalPosition.column || location.column
  } else {
    line = location.line
    column = location.column
  }


  // Note:(ibash) the key always uses the code's position without converting to
  // the original position in the source map. This is so we can avoid
  // collisions.
  var key = this.file + ':' + location.line + ':' + location.column
  var options = {key: key, file: this.file, line: line, column: column}
  return options;
}

module.exports = Transformer
