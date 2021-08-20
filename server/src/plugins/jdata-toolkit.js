'use strict'
const _ = require('lodash')
const internals = {}

internals.jdata = function (data){
  return this.response({ statusCode: 200, message: '', data: data || null })
}
internals.jlist = function (list, page, count, next){
  return this.response({ statusCode: 200, message: '', data: Array.isArray(list) ? list : [], count, page: _.toString(page), next: _.toString(next) })
}
internals.fail = function (message, data, code){
  if (message instanceof Error) {
    message = message.message || message.msg || message
  }
  return this.response({ statusCode: typeof code === 'number' ? code : 400, message: message || '', data: data })
}

exports.plugin = {
  pkg: { name: 'jdata-toolkit' },
  register: async function (server, settings){
    server.decorate('toolkit', 'jdata', internals.jdata)
    server.decorate('toolkit', 'jlist', internals.jlist)
    server.decorate('toolkit', 'fail', internals.fail)
  }
}
