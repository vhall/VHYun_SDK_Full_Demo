'use strict'
const path = require('path')
const { Docs } = require('../models')
const _ = require('lodash')

async function tryFetchDocProcess (server, doc) {
  const now = Date.now()
  if (now < doc.createdAt + 1000 * 60 * 5) return
  if (now > doc.createdAt + 1000 * 3600 * 24) return
  const rs = await server.methods.paas.getDocumentInfo(doc.docId)
  if (!(rs && rs.page)) return
  // 1 待转码 2 转换中 3 转换成功 4 转换失败
  const status = rs.trans_status

  if (status === 4) {
    await Docs.update({ pageNum: rs.page || 0, process: -1 }, { where: { docId: doc.docId } })
    return
  }

  const values = { docId: doc.docId, pageNum: rs.page || 0, width: rs.width, height: rs.height, conversionType: rs.conversion_type }
  if (status === 3) values.process = 100
  await Docs.update(values, { where: { docId: doc.docId } })
  return values
}

// 文档列表，目前是和"互动房间"关联。您也可以实现自己的逻辑，和具体用户进行关联
exports.list = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (!roomId) return h.fail('roomId错误')
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page || '1'), 1, Number.MAX_SAFE_INTEGER)

  const where = { roomId }

  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Docs.findAndCountAll({ where, order, limit, offset })

  let fetch = page === 1 ? 3 : 0
  const list = []
  for (let row of rows) {
    let doc = row.toJSON()
    if (fetch && row.process === 0) {
      const rs = await tryFetchDocProcess(req.server , doc).catch(() => null)
      if (rs) doc = Object.assign(doc, rs)
    }
    fetch -= 1
    list.push({
      id: '' + doc.id,
      docId: doc.docId,
      roomId: doc.roomId,
      process: doc.process,
      pageNum: doc.pageNum,
      width: doc.width,
      height: doc.height,
      title: doc.title,
      ext: doc.ext,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
    })
  }

  return h.jlist(list, page, count, page + 1)
}

// 文档创建/保存
exports.create = async (req, h) => {
  const roomId = req.query.roomId
  const conversionType = req.query.conversion_type || ''
  if (!roomId) return h.fail('roomId错误')

  let res
  try {
    const query = {}
    if (conversionType) query.conversion_type = conversionType
    res = await req.server.methods.paas.createDocument(req.payload, query)
  } catch (e) {
    if (e.data && e.data.code === 30004) return h.fail('参数错误')
    return h.fail(e.message)
  }

  const appId = req.server.app.paas.appId
  const docId = res.document_id
  const title = res.file_name || ''
  const ext = path.extname(title).slice(1)
  if (!docId) return h.fail('docId错误')

  const record = { appId, roomId, docId, title, ext, conversionType }
  const doc = await Docs.create(record)
  const rData = {
    id: '' + doc.id,
    docId: doc.docId,
    roomId: doc.roomId,
    process: doc.process,
    pageNum: doc.pageNum,
    width: doc.width,
    height: doc.height,
    title: doc.title,
    ext: doc.ext,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  }

  // 通知主持人/助理
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'doc', 'add', { data: rData })
  return h.jdata(rData)
}
