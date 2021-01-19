'use strict'
const _ = require('lodash')
const internals = {}

internals.jdata = function (data){
  return this.response({ statusCode: 200, msg: '', data })
}
internals.jlist = function (list, page, count, next){
  return this.response({ statusCode: 200, msg: '', data: list, count, page: _.toString(page), next: _.toString(next) })
}

exports.plugin = {
  pkg: { name: 'jdata-toolkit' },
  register: async function (server, settings){
    server.decorate('toolkit', 'jdata', internals.jdata)
    server.decorate('toolkit', 'jlist', internals.jlist)
  }
}
