'use strict'
const _ = require('lodash')
const {Docs} = require('../models')

async function findDocByDocId (docId) {
  const doc = await Docs.findOne({ where: { docId } })
  return doc
}

async function refreshDocInfo (paas, doc) {
  const data = await paas.getDocumentInfo(doc.docId)
  if (!doc.pageNum) doc.set('pageNum', data.page)
  if (!doc.width) doc.set('width', data.width)
  if (!doc.height) doc.set('height', data.height)
  if (!doc.conversionType) doc.set('conversionType', data.conversion_type)

  // 文档转换结果 1 待转码 2 转换中 3 转换成功 4 转换失败
  const status = Number(data.trans_status)
  if (status === 4) {
    doc.set('process', -1)
  } else if (status === 3) {
    doc.set('process', 100)
  } else if (status === 1) {
    // 待转码
  } else {
    const list = [data.converted_page, data.converted_page_swf, data.converted_page_jpeg].filter(i => i)
    const curr = _.max(list)
    const process = Math.trunc((curr) / data.page * 100)
    doc.set('process', process >= 100 ? 99 : process)
  }
}

async function refreshDoc(paas, docId) {
  let done = true
  const doc = await findDocByDocId(docId)
  if (!doc) return true

  done = doc.process >= 100 || doc.process < 0
  if (done) return true

  await refreshDocInfo(paas, doc)
  await doc.save()
  done = doc.process >= 100 || doc.process < 0
  return done
}

// 轮训查询查询是否转换完成，如果用于正式环境请使用回调
// ⚠️⚠️⚠️请勿在正式环境中使用⚠️⚠️⚠️
module.exports = function (server, options) {
  return async function (done, params) {
    const docId = params.docId
    if (!docId) return done()
    try {
      const ok = await refreshDoc(server.methods.paas, params.docId)
      if (ok) done()
    } catch (e) {
      server.log(['error', 'task'], e)
    }
  }
}
