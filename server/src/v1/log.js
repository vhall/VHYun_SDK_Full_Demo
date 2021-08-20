'use strict'
const path = require('path')
const _ = require('lodash')
const util = require('util')

const _PATH = path.join(__dirname, '../../')
let num = 0
let lastToken = 0

function sse(stream, data){
  return stream.write(`data: ${data}\n\n`)
}

function writeLog(res, event){
  let body = ''
  if (event.error) {
    let stack = event.error.stack || ''
    stack = stack.replace(/\s*.*node_modules.*/ig, '').replace(_PATH, '')
    const message = event.error.message
    const data = util.inspect(_.omit(event.error, ['message', 'stack']), { depth: 2 })
    event.error = Object.assign({ message, stack }, { data })
  }
  try {
    body = JSON.stringify(event)
  } catch (e) {
    event.data = util.inspect(event.data, { depth: 2 })
  }
  sse(res, body)
}

// event source 订阅日志
exports.log = async (req, h) => {
  /* @register method:get */
  const res = req.raw.res
  const token = req.query.token1
  if (!req.user.isAdmin && !(token && token === lastToken)) {
    return h.fail('401', null, 401)
  }

  const qf = _.filter(_.split(req.query.filter, ','))
  const filter = qf.length ? qf : ['info', 'warn', 'error']
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Accel-Expires': 'no',
  })
  res.write(':\n\n')
  num++

  function subLog(event){
    try {
      writeLog(res, event)
    } catch (e) {
    }
  }

  function subRequest(request, event){
    if (event && event.error && event.error.isBoom) {
      if (event.error.output.statusCode < 500) return
    }
    try {
      writeLog(res, Object.assign({}, event))
    } catch (e) {
    }
  }

  req.server.events.addListener({ name: 'log', filter }, subLog)
  req.server.events.addListener({ name: 'request', filter }, subRequest)

  req.raw.req.once('close', function close(){
    lastToken = token
    num--
    req.server.events.removeListener('log', subLog)
    req.server.events.removeListener('request', subRequest)
    res.end()
  })
  return h.abandon
}

// write log
exports.rm = async (req, h) => {
  /* @register method:get,post */
  const log = (req.payload && req.payload.data) || (req.query && req.query.data) || ''
  if (!log) return h.jdata({})
  req.log(['info', 'web', 'report'], log)
  return h.jdata({})
}
