'use strict'
const path = require('path')
const utils = require('../utils')
const _ = require('lodash')

async function getStaticPage (server, filepath, option) {
  option = option || {}
  let publicPath = server.app.hostStatic
  if (!publicPath.endsWith('/')) publicPath = publicPath + '/'
  const payload = await server.methods.tinyCache.getPageOrCache(filepath, { baseUrl: publicPath })
  if (typeof payload !== 'string') return payload
  return utils.htmlProcess(payload, option)
  // DomUtils.filter
  // 过滤出相对路径的url
  // const elems = DomUtils.filter(elem => elem.attribs && !utils.isFullUrl(elem.attribs.src || elem.attribs.herf), root)
}

function failPage (h, message) {
  return h.response(`<center><h1>${message || '错误'}</h1></center>`).type('text/html; charset=utf-8')
}

// 表单填写
exports.answer = async (req, h) => {
  /* @register */
  const formId = req.query.formId
  const roomId = req.query.roomId
  if (!roomId) return failPage(h, '参数roomId不存在')
  if (!req.query.id) return failPage(h, '参数id不存在')
  if (!formId) return failPage(h, '参数formId不存在')
  const accountId = req.user.accountId
  const isMobile = utils.isMobileUA(req.headers['user-agent'])
  const inject = { accountId, isSave: false, sdkToken: '', API_BASE: req.server.app.hostSite, isMobile, formData: null }

  const cacheKey = 'formId.' + formId
  const rs0 = await req.server.methods.tinyCache.getSmallCache(cacheKey)
  if (rs0) inject.formData = utils.formReFormat(rs0)
  else {
    try {
      const rs1 = await req.server.methods.paas.getForm(formId)
      if (rs1) {
        inject.formData = utils.formReFormat(rs1)
        await req.server.methods.tinyCache.setSmallCache(cacheKey, rs1).catch(() => null)
      }
    } catch (e) {
      inject.error = e.message
    }
  }

  // 是否填写过
  if (accountId) {
    inject.sdkToken = await req.server.methods.tinyCache.getTokenOrCache('form', accountId, { })
    const answer = await req.server.methods.room.hasFormAnswer(roomId, req.user.accountId, req.query.id).catch(() => false)
    inject.isSave = !!answer

    // 填写记录
    if (answer) {
      inject.answerData = await req.server.methods.paas.getAnswer(answer.formId, answer.answerId)
    }
  }

  const body = await getStaticPage(req.server, './answer.html', { inject })
  return h.response(body).type('text/html; charset=utf-8').header('Cache-Control', 'no-store')
}

exports.views = async (vtype, req, h) => {
  const roomId = req.params && req.params.roomId
  let room
  if (vtype === 'publisher' || vtype === 'helper' || vtype === 'watcher') {
    if (!roomId) h.redirect('/')
    room = await req.server.methods.room.getRoom(roomId)
    if (!room) return failPage(h, '该房间不存在')
  }
  // 点播
  else if (vtype === 'vod') {
    const room1 = await req.server.methods.room.getRoom(roomId)
    const vod = await req.server.methods.room.getRoomVod(roomId)
    if (!vod && !room1) return failPage(h, '该房间不存在')
    room = vod
  }

  const isMobile = utils.isMobileUA(req.headers['user-agent'])
  const inject = { API_BASE: req.server.app.hostSite, useMsgV4: false }
  const page = isMobile ? './index_h5.html' : './index.html'
  // to publisher
  const body = await getStaticPage(req.server, page, { inject })
  return h.response(body).type('text/html; charset=utf-8').header('Cache-Control', 'no-store')
}

// 主持人
exports.publisher = async (req, h) => {
  /* @register path:/publisher/{roomId} */
  return exports.views('publisher', req, h)
}
// 助理
exports.helper = async (req, h) => {
  /* @register path:/helper/{roomId} */
  return exports.views('helper', req, h)
}
// 嘉宾/观众
exports.watcher = async (req, h) => {
  /* @register path:/watcher/{roomId} */
  return exports.views('watcher', req, h)
}
// 回放
exports.vod = async (req, h) => {
  /* @register path:/vod/{roomId} */
  return exports.views('vod', req, h)
}
// 首页
exports.index = async (req, h) => {
  /* @register path:/ */
  return exports.views('', req, h)
}

// exports.public = (server) => {
//   /* @register gen:true */
//   return ({
//     method: 'get',
//     path: '/{param*}',
//     handler: async function (req, h) {
//       const rs = await wreck.get(req.path, { baseUrl: req.server.app.hostSite })
//       return h.response(rs.payload).type(rs.res.headers['content-type'] || 'text/html; charset=utf-8')
//     }
//   })
// }

exports.public = (server) => {
  /* @register gen:true */
  return ({
    method: 'get',
    path: '/{param*}',
    handler: {
      directory: {
        path: path.join(server.app.projectRoot, 'public'),
        index: true
      }
    }
  })
}
