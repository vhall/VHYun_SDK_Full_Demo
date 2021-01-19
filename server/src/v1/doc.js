'use strict'
const path = require('path')
const Boom = require('@hapi/boom')
const { Docs } = require('../models')
const _ = require('lodash')

// 文档列表，目前是和"互动房间"关联。您也可以实现自己的逻辑，和具体用户进行关联
exports.list = async (req, h) => {
  const roomId = req.query.roomId
  if (!roomId) return Boom.badRequest('roomId错误')
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page || '1'), 1, Number.MAX_SAFE_INTEGER)

  const where = { roomId }
  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Docs.findAndCountAll({ where, order, limit, offset })
  const forms = rows.map(doc => doc.toJSON())

  return h.jlist(forms, page, count, page + 1)
}

// 文档创建/保存
exports.create = async (req, h) => {
  const roomId = req.query.roomId
  const conversionType = req.query.conversion_type || ''
  if (!roomId) return Boom.badRequest('roomId错误')

  let res
  try {
    const query = {}
    if (conversionType) query.conversion_type = conversionType
    res = await req.server.methods.paas.createDocument(req.payload, query)
  } catch (e) {
    if (e.data && e.data.code === 30004) return Boom.badRequest('参数错误')
    return Boom.badRequest(e.message)
  }

  const docId = res.document_id
  const title = res.file_name
  const ext = path.extname(title).slice(1)
  if (!docId) return Boom.badRequest('docId错误')

  const record = { roomId, docId, title, ext, conversionType }
  const doc = await Docs.create(record)

  // 演示模式用户可能配置不了回调，这里用轮训查询查询是否转换完成
  // ⚠️⚠️⚠️请勿在正式环境中使用⚠️⚠️⚠️
  if (req.server.app.demoMode) {
    // 每8秒查询一次，超过一个小时就不管了，默认失败
    const opt = { end: new Date(Date.now() + 1000 * 3600), rule: '*/8 * * * * *' }
    req.server.methods.task.addTask('doc-' + docId, 'doc-process', opt, { docId })
  }

  return h.jdata(doc)
}
