'use strict'
const Boom = require('@hapi/boom')
const { Forms } = require('../models')
const _ = require('lodash')

// 表单列表，目前是和"互动房间"关联。您也可以实现自己的逻辑，和具体用户进行关联
exports.list = async (req, h) => {
  const roomId = req.query.roomId
  if (!roomId) return Boom.badRequest('roomId错误')
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page || '1'), 1, Number.MAX_SAFE_INTEGER)

  const where = { roomId }
  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows: forms, count } = await Forms.findAndCountAll({ where, order, limit, offset })

  return h.jlist(forms, page, count, page + 1)
}

// 表单创建/保存
exports.create = async (req, h) => {
  const roomId = req.payload.roomId
  const formId = req.payload.formId
  if (!roomId) return Boom.badRequest('roomId错误')
  if (!formId) return Boom.badRequest('formId错误')

  const record = { roomId, formId }
  const form = await Forms.create(record)

  return h.jdata(form)
}

// 表单创建/保存
exports.delete = async (req, h) => {
  const roomId = req.payload.roomId
  const formId = req.payload.formId
  if (!roomId) return Boom.badRequest('roomId错误')
  if (!formId) return Boom.badRequest('formId错误')

  const where = { roomId, formId }
  await Forms.destroy({ where })

  return h.jdata({ roomId, formId })
}
