'use strict'
const querystring = require('querystring')
const _ = require('lodash')
const xlsx = require('xlsx')
const utils = require('../utils')
const { Forms } = require('../models')

exports.getAnswerURL = function (appId, id, roomId, formId, type){
  const search = querystring.stringify({ appId, type, id, roomId, formId })
  return `/pages/answer?` + search
}

// 表单列表，目前是和"互动房间"关联。您也可以实现自己的逻辑，和具体用户进行关联
exports.list = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (!roomId) return h.fail('roomId错误')
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page || '1'), 1, Number.MAX_SAFE_INTEGER)

  const where = { roomId }

  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Forms.findAndCountAll({ where, order, limit, offset })
  const appId = req.server.app.paas.appId
  const list = []

  for (const row of rows) {
    const form = row.toJSON()
    form.previewURL = exports.getAnswerURL(appId, form.id, roomId, form.formId, 'preview')
    form.id = '' + form.id
    list.push(form)
  }

  return h.jlist(list, page, count, page + 1)
}

// 表单创建/保存
exports.create = async (req, h) => {
  /* @register method:post */
  const roomId = req.payload.roomId
  const title = _.truncate(req.payload.title || '表单', 16)
  if (!roomId) return h.fail('roomId错误')
  let formId = req.payload.formId
  if (!formId && !req.payload.detail) return h.fail('formId错误')
  const appId = req.server.app.paas.appId

  if (!formId) {
    const body = utils.formReFormatSave(req.payload)
    formId = await req.server.methods.paas.createForm(body)
  }

  const record = { appId, roomId, formId, title }
  const row = await Forms.create(record)
  const form = row.toJSON()
  form.id = '' + form.id
  form.previewURL = exports.getAnswerURL(appId, form.id, roomId, form.formId, 'preview')

  // 通知主持人/助理
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'form', 'add', { data: form })
  return h.jdata(form)
}

// 表单获取
exports.fetch = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  const formId = req.query.formId
  if (!roomId) return h.fail('roomId错误')
  if (!formId) return h.fail('formId错误')

  let form = await req.server.methods.paas.getForm(formId)
  form = utils.formReFormat(form)
  return h.jdata(form)
}

// 表单更新
exports.update = async (req, h) => {
  /* @register method:post */
  const roomId = req.payload.roomId
  const id = req.payload.$id
  delete req.payload.$id
  delete req.payload.roomId
  const title = _.truncate(req.payload.title || '表单', 16)
  if (!roomId) return h.fail('roomId错误')
  if (!id) return h.fail('id错误')

  const appId = req.server.app.paas.appId
  const body = utils.formReFormatSave(req.payload)
  await req.server.methods.paas.updateForm(body)
  const $form = Forms.build({ id, title }, { isNewRecord: false })
  await $form.save()

  const row = await Forms.findByPk(id)
  const form = row.toJSON()
  form.id = '' + form.id
  form.previewURL = exports.getAnswerURL(appId, form.id, roomId, form.formId, 'preview')
  const cacheKey = 'formId.' + form.formId
  await req.server.methods.tinyCache.dropSmallCache(cacheKey)

  // 通知主持人/助理
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'form', 'update', { data: form })

  return h.jdata({})
}

// 表单删除
exports.delete = async (req, h) => {
  /* @register method:post */
  const roomId = req.payload.roomId
  const id = req.payload.id
  if (!roomId) return h.fail('roomId错误')
  if (!id) return h.fail('id错误')

  const where = { roomId, id }
  await Forms.destroy({ where })

  // 通知主持人/助理
  const rData = { id }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'form', 'del', { data: rData })
  return h.jdata({ roomId, id })
}

exports.result = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  const formId = req.query.formId
  const id = req.query.id
  if (!roomId) return h.fail('roomId错误')
  if (!formId) return h.fail('formId错误')
  if (!id) return h.fail('id错误')
  const form = await Forms.findByPk(id)
  const startTime = utils.datetimeFormat(form && form.createdAt - 1000 * 3600 * 24)
  const endTime = utils.datetimeFormat()
  const exportName = `${form && form.title || '表单'}导出`

  // write data
  const res = req.raw.res
  res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'content-disposition': 'inline;fileName=' + querystring.escape(`${exportName}_${Date.now()}.xlsx`)
  })
  // UTF8 BOM
  // res.write(new Buffer([0xEF, 0xBB, 0xBF]))

  if (!form) {
    res.end()
    return h.abandon
  }

  // data
  const accounts = await req.server.methods.room.listRoomEnterUser(roomId).catch(() => [])
  const rs = await req.server.methods.paas.getFormAnswers(formId, startTime, endTime).catch(() => {})
  let headerPos = 0
  const enterMap = accounts.reduce((map, item) => {map[item.accountId] = item;return map}, {})
  const headText = { '$id': '答题编号', '$accountId': '用户编号', '$createdAt': '答题时间', '$nickName': '昵称' }
  const headers = { '$id': headerPos++, '$accountId': headerPos++, '$createdAt': headerPos++, '$nickName': headerPos++ }
  for (const key of Object.keys(rs)) {
    const val = rs[key]
    if (Object.keys(val.answer).length) {
      for (const [answerId, answer] of _.toPairs(val.answer)) {
        if (headers[answerId]) continue
        headers[answerId] = headerPos++
        headText[answerId] = answer && answer.title
      }
    }
  }

  const list = []
  for (const key of Object.keys(rs)) {
    const val = rs[key]
    const accountId = val.third_party_user_id || ''
    const createdAt = val.created_at || ''
    const nickName = enterMap[accountId] && enterMap[accountId].nickName || utils.randomNickname()
    const answers = new Array(Object.keys(headers).length).fill('')
    answers[headers.$id] = key
    answers[headers.$accountId] = accountId
    answers[headers.$createdAt] = createdAt
    answers[headers.$nickName] = nickName
    if (Object.keys(val.answer).length) {
      for (const [answerId, answer] of _.toPairs(val.answer)) {
        answers[headers[answerId]] = answer.answer
      }
    }
    list.push(answers)
  }

  let headArr = []
  const i2h = _.invert(headers)
  for (let i = 0; i < Object.keys(headers).length; i++) {
    const text = headText[i2h[i]] || i2h[i] || ''
    headArr.push(text)
  }

  let buf
  try {
    const ws = xlsx.utils.aoa_to_sheet([
      headArr,
      ...list,
    ])
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, '导出')
    buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
  } catch (e) {
    res.end()
    return h.abandon
  }

  res.write(buf)
  res.end()

  return h.abandon
}
