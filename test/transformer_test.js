var assert = require('chai').assert;
var Transformer = require('../lib/transformer');

var tests = [
  {
    code:
`console.log("hi")
for (var i = 0; i < 100; i++) {console.log(i)}
console.log("yo")`,
    expected:
`console.log("hi")
loopProtect.reset({"key":"foo:2:0","file":"foo","line":2,"column":0});
for (var i = 0; i < 100; i++) {
  if (loopProtect.guard("foo:2:0")) break;
  console.log(i)
}
console.log("yo")`
  },
  {
    code:
`for (var i = 0; i < 100; i++) {
  for (var j = 0; j < 100; j++) {
    console.log(i, j)
  }
}`,
    expected:
`loopProtect.reset({"key":"foo:1:0","file":"foo","line":1,"column":0});
for (var i = 0; i < 100; i++) {
  if (loopProtect.guard("foo:1:0")) break;
  loopProtect.reset({"key":"foo:2:2","file":"foo","line":2,"column":2});
  for (var j = 0; j < 100; j++) {
  if (loopProtect.guard("foo:2:2")) break;
    console.log(i, j)
  }
}`
  },
  {
    code:
`if (true)
  for (var i = 0; i < 100; i++) console.log(i)
`,
    expected:
`if (true) {
  loopProtect.reset({"key": "foo:2:2", "file": "foo", "line": 2, "column": 2});
  for (var i = 0; i < 100; i++) {
    if (loopProtect.guard("foo:2:2")) break;
    console.log(i)
  }
}`
  },
  {
    code:
`switch (1) {
  case 1:
    for (var i = 0; i < 100; i ++) 1
}`,
    expected:
`switch (1) {
  case 1:
    loopProtect.reset({"key":"foo:3:4","file":"foo","line":3,"column":4});
    for (var i = 0; i < 100; i ++) {
      if (loopProtect.guard("foo:3:4")) break;
      1
    }
}`
  },
  {
    code:
`if (true) {
  console.log('yay')
} else {
  for (var i = 0; i < 100; i ++) {}
}`,
    expected:
`if (true) {
  console.log('yay')
} else {
  loopProtect.reset({"key":"foo:4:2","file":"foo","line":4,"column":2});
  for (var i = 0; i < 100; i ++) {
    if (loopProtect.guard("foo:4:2")) break;
  }
}`
  },
]

describe('Transformer', function() {
  tests.forEach(function(test, i) {
    it('transforms correctly test ' + i + ' correctly', function() {
      var transformer = new Transformer({
        alias: 'loopProtect',
        file: 'foo',
        code: test.code
      })

      assert.equal(transformer.transform().code.replace(/\s/g, ''), test.expected.replace(/\s/g, ''))
    })
  })
})
