'use strict'
const Inert = require('@hapi/inert')
const _ = require('lodash')
const path = require('path')
const utils = require('../utils')
const room = require('./room')
const form = require('./form')
const doc = require('./doc')
const inav = require('./inav')
const log = require('./log')
const admin1 = require('./admin')
const pages = require('./pages')
const backend = require('./backend')

function getHandlerRegisterInfo(prefix, name, handler){
  /* @register method:get,post path:/admin/v1 */
  if (typeof handler !== 'function') return
  const match = (/\/*\s*@register\s+(.*)\*\//).exec(handler.toString())
  if (!(match && match[0])) return
  const obj = { method: ['get'], path: path.join(prefix, name), handler, options: {} }
  const keys = ['method', 'path', 'vhost', 'handler', 'options', 'config']

  const $obj = {}
  for (const item of _.split(_.trim(match[1]), ' ')) {
    let [key, value] = _.split(_.trim(item), ':', 2)
    if (value === 'false') value = false
    if (value === '') value = true
    if (keys.indexOf(key) >= 0) $obj[key] = value
    else if (key) obj.options[key] = value
  }

  if ($obj.path) obj.path = $obj.path
  if ($obj.method) {
    const method = _.filter(_.split($obj.method, ','))
    if (method.length) obj.method = method
  }
  return obj
}

function $static(settings, server){
  const routes = []
  //  icon
  routes.push({ method: 'get', path: '/favicon.ico', handler: (req, h) => h.response(utils.favicon).type('image/x-icon') })
  // room
  for (const name of Object.keys(pages)) {
    let info = getHandlerRegisterInfo('/pages', name, pages[name])
    if (!info) continue
    const gen = info.options.gen
    if (gen) info = pages[name](server)
    if (!info) continue
    if (!gen) info.options.auth = { mode: 'optional', strategy: 'api' }
    routes.push({ ...info })
  }

  const options = { cors: true, auth: false }
  return { routes, options }
}

function v1(settings, server){
  const routes = []
  const routeOptions = { auth: 'api' }
  const prefix = '/api/v1'

  // room
  for (const name of Object.keys(room)) {
    if (name === 'vod') continue
    const info = getHandlerRegisterInfo(path.join(prefix, 'room'), name, room[name])
    if (!info) continue
    routes.push({ ...info })
  }

  // room vod
  const vod = getHandlerRegisterInfo(path.join(prefix, 'room'), 'vod', room.vod)
  vod.options.auth = { mode: 'optional', strategy: 'api' }
  routes.push({ ...vod })

  // inav
  for (const name of Object.keys(inav)) {
    const info = getHandlerRegisterInfo(path.join(prefix, 'inav'), name, inav[name])
    if (!info) continue
    routes.push({ options: routeOptions, ...info })
  }

  // form
  for (const name of Object.keys(form)) {
    const info = getHandlerRegisterInfo(path.join(prefix, 'form'), name, form[name])
    if (!info) continue
    routes.push({ options: routeOptions, ...info })
  }

  // doc
  for (const name of Object.keys(doc)) {
    const info = getHandlerRegisterInfo(path.join(prefix, 'doc'), name, doc[name])
    if (!info) continue
    routes.push({ options: routeOptions, ...info })
  }

  // 文档创建
  routes.push({
    method: 'post',
    path: prefix + '/doc/create',
    handler: doc.create,
    options: {
      auth: 'api',
      payload: {
        output: 'stream',
        parse: false,
        maxBytes: 1024 * 1024 * 80,
        allow: 'multipart/form-data'
      }
    }
  })

  // rm log
  routes.push({
    method: ['post', 'get'],
    path: prefix + '/log/rm',
    handler: log.rm,
    options: {
      auth: false
    }
  })

  const options = {
    routes: {},
    auth: 'api',
    cors: true
  }

  return { routes, options }
}

function v1backend(settings, server){
  const routes = []
  const prefix = '/api/v1'

  // 直播/录制回调
  routes.push({
    method: ['get', 'post'],
    path: prefix + '/backend/callback',
    handler: backend.callback,
    options: {}
  })

  const options = {}
  return { routes, options }
}

//（仅demo管理使用）
function admin(settings, server){
  const routes = []
  const prefix = '/admin'

  // room
  for (const name of Object.keys(admin1)) {
    const info = getHandlerRegisterInfo(prefix, name, admin1[name])
    if (!info) continue
    routes.push({ ...info })
  }

  routes.push({
    method: 'get',
    path: prefix + '/log',
    handler: log.log,
    options: {
      auth: { mode: 'optional', strategy: 'admin' }
    }
  })

  const options = {
    cors: true,
    auth: 'admin'
  }
  return { routes, options }
}

// 路由注册辅助函数（使用插件的方式注册路由）
function routerPkgRegister(server, rgen, settings){
  const { routes, options } = rgen(settings, server)
  const plugin = {
    pkg: { name: 'route_reg_' + rgen.name },
    register: (server, options) => {
      const map = route => {
        route.options = Object.assign(_.pick(options, ['cors', 'auth']), route.options)
        return route
      }
      server.route(routes.map(map))
    }
  }
  const _options = _.assign({}, options, settings || {})
  return server.register({ plugin, options: _options })
}

// 插件导出
exports.plugin = {
  pkg: { name: 'route-reg' },
  register: async function (server, options){
    await server.register(Inert)
    // 注册public静态资源路由
    await routerPkgRegister(server, $static, options)
    // 注册v1路由
    await routerPkgRegister(server, v1, options)
    // 注册backend路由
    await routerPkgRegister(server, v1backend, options)
    // admin
    await routerPkgRegister(server, admin, options)
  }
}
