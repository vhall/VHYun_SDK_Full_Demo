#!env node
const app = require('./src/server')
exports.start = app.start
if (require.main === module) {
  app.start().then(function () {}, function () {})
}
