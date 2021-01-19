'use strict'
const Inert = require('@hapi/inert')
const _ = require('lodash')
const path = require('path')
const room = require('./room')
const form = require('./form')
const doc = require('./doc')
const backend = require('./backend')
// eslint-disable-next-line
const favicon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD0klEQVRYCdVX2W+NQRTvX0KQiiV4ISIerEF4wYsnCRISwgMeeLPEkm5KQy2lNCWVtkRplWjRatTWhja0VQmp7/YuXe7W3t72LiO/me98M99yr15p0jjJ3JlvlnN+c+b8zszNmpGjseksWdNpHLb/XwBby33MSdpc48aRPv8e4VOGI3Gjz+rxlB74MTjhpJ+RsiN1w47j1Z2jhrFeXceH31Gjb1IA5uRpLJZIOhqgHZ59FWCuYIwXTzhuzM1pCnBjs3I1NhEXOu5/GckMwLqbHkOhtaHukHajHsf+R0Pc2KobUgfA0lxr7XgEM3M0ll0gy4JCF4vrHslvDtqUqcexodTDx/c8GDSwo201TN+OAGiQanU3Bx+LHdIY6sutIW4smUyyuQUubgy7JsF6db7adgRQ1hZmiWSShaIJvnBX1QDpYlvKvDZldd0i2hETpBznDkEcIB6o31o7Anjzc4wv7nALSp1s8BsAFhaKHaqKun2CMS2/ZLQj8iFggjrX2nYEoAVjfHHNN0EpeAQyOGrnM+JlLCaivbw9bBgDXSHIBVaj6rcNQHa+xt2PxYUtIuCadY981OQOScmKq25uCD+nGv1pjdEatbYBWH9L0ueQHnB9AeGRqk7B5+XFbrax1MPLsXqZkE40+I1+Gl900X5kaQHsfSjpg4BDUkJAQvJ0CpJHjK2naeysHEjrFZsHzin0Af/XlEiPHKgRFEQsTFZWXnNnBqBCp483LAJud7X0yOY7Xja/0MVe9EaMEhhLcCzBaMLoc4cEwGgsyRCkqsutbZsH3vUJ+qDG5NONMqHAI1YFFB8ARWOgI6RnID0FMd8GADuH3PssAg7UgvhG7BRUGXP9fcgA0K97oL5HgiJw1toEAO4lOfNSXCCUlJyuVJUxx58NcwBIxUjJkOJWCcpqmL5NAHDGJHSBUFKq7LBfqfsUxuyo8HEAoB/J0ToBiow51SYAiHKS1SUeprqY7nlVyfnXMj6WXennAHAdk2y/K0Cpa6xtEwDwHILHyOw8janvArrnVQXwCmR0XFxaGMttEjrQv6RIgFLXWNsmAHhsQHCG4WiCRSYExdC36bb9FkRqhnz1ymgnHaCn1ZjTtwkAnlupZN4FOwWH9IRU2yWjvV3XQU83J6NqnwmAPyJ3rAKhpISrGGeNslbJkEVv5SuJEtPTnogxl9agXqrHCoEwAaDOVPWTLnFEKji0D9eKaMeZ/01KP8krG3YyAoAHipPgUQpl21L8V6A1yIxglrrBjACQe0kh1YsviWgH71MJ7gV6sP4zAHXhVLUz8sBUGVX1TDuAPxws2Ygy2U90AAAAAElFTkSuQmCC', 'base64')

function $static(settings, server){
  const routes = []
  //  icon
  routes.push({ method: 'get', path: '/favicon.ico', handler: (req, h) => h.response(favicon).type('image/x-icon') })
  routes.push({
    method: 'get',
    path: '/main',
    handler: function (request, h) {
      return h.file(path.join(server.app.projectRoot, 'public/index.html'))
    }
  })
  routes.push({
    method: 'get',
    path: '/{param*}',
    handler: {
      directory: {
        path: path.join(server.app.projectRoot, 'public'),
        index: true
      }
    }
  })
  const options = {}
  return { routes, options }
}

function v1(settings, server){
  const routes = []
  const prefix = '/api/v1'

  // 创建互动房间
  routes.push({
    method: ['post'],
    path: prefix + '/room/create',
    handler: room.create,
    options: { cors: true }
  })
  // 获取互动房间信息
  routes.push({
    method: ['get'],
    path: prefix + '/room/init',
    handler: room.init,
    options: { cors: true }
  })
  // 获取互动房间进入信息，token
  routes.push({
    method: ['post'],
    path: prefix + '/room/enter',
    handler: room.enter,
    options: { cors: true }
  })
  // 设置推送旁路流
  routes.push({
    method: ['post'],
    path: prefix + '/room/another',
    handler: room.another,
    options: { cors: true }
  })
  // 用户列表
  routes.push({
    method: 'get',
    path: prefix + '/room/onlineUser',
    handler: room.onlineUser,
    options: { cors: true }
  })
  // 下麦
  routes.push({
    method: 'post',
    path: prefix + '/room/invaStreamDown',
    handler: room.invaStreamDown,
    options: { cors: true }
  })
  routes.push({
    method: 'post',
    path: prefix + '/room/kickUser',
    handler: room.kickUser,
    options: { cors: true }
  })
  routes.push({
    method: 'post',
    path: prefix + '/room/unkickUser',
    handler: room.unkickUser,
    options: { cors: true }
  })
  // 被踢出列表
  routes.push({
    method: 'get',
    path: prefix + '/room/roomKickList',
    handler: room.roomKickList,
    options: { cors: true }
  })

  // report
  routes.push({
    method: ['get', 'post'],
    path: prefix + '/room/report',
    handler: room.report,
    options: { cors: true }
  })

  // 文档创建
  routes.push({
    method: 'post',
    path: prefix + '/doc/create',
    handler: doc.create,
    options: {
      cors: true,
      payload: {
        output: 'stream',
        parse: false,
        maxBytes: 1024 * 1024 * 80,
        allow: 'multipart/form-data'
      }
    }
  })
  // 文档列表
  routes.push({
    method: 'get',
    path: prefix + '/doc/list',
    handler: doc.list,
    options: { cors: true }
  })

  // 表单列表
  routes.push({
    method: 'get',
    path: prefix + '/form/list',
    handler: form.list,
    options: { cors: true }
  })
  // 表单创建
  routes.push({
    method: 'post',
    path: prefix + '/form/create',
    handler: form.create,
    options: { cors: true }
  })
  // 表单创建
  routes.push({
    method: 'post',
    path: prefix + '/form/delete',
    handler: form.delete,
    options: { cors: true }
  })

  //（仅demo管理使用）
  routes.push({
    method: 'post',
    path: prefix + '/room/roomDelete',
    handler: room.roomDelete,
    options: { cors: true }
  })
  //（仅demo管理使用）
  routes.push({
    method: 'get',
    path: prefix + '/room/roomList',
    handler: room.roomList,
    options: { cors: true }
  })
  //（仅demo管理使用）
  routes.push({
    method: 'get',
    path: prefix + '/room/roomLivein',
    handler: room.roomLivein,
    options: { cors: true }
  })

  const options = {
    routes: { cors: true }
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

// 路由注册辅助函数（使用插件的方式注册路由）
function routerPkgRegister(server, rgen, settings){
  const { routes, options } = rgen(settings, server)
  const plugin = {
    pkg: { name: 'route_reg_' + rgen.name },
    register: server => server.route(routes)
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
  }
}
