'use strict'
const _ = require('lodash')
const crypto = require('crypto')
const { Docs, Vods, Rooms } = require('../models')
const utils = require('../utils')

// 在这里做签名检查处理
function checkSignature(secretKey, payload){
  if (!payload) return false
  const { signature, ...dict } = payload
  if (!signature) return false

  // 禁用次行打开签名检查
  // return true

  const md5_1 = crypto.createHash('md5')
  md5_1.write(secretKey)
  const privateKey = md5_1.digest('hex')

  const md5 = crypto.createHash('md5')
  for (const [k, v] of _.sortBy(_.toPairs(dict), '0')) {
    md5.write(k + '|' + privateKey + '|' + v)
  }
  return md5.digest('hex') === signature
}

function getCueActiveMark(cue, docs) {
  const cuepoint = cue && cue.cuepoint
  if (!Array.isArray(cuepoint)) return
  if (cuepoint.length < 2) return
  const docSet = docs.reduce((set, a) => { set[a.doc_id] = a.title; return set }, {})

  const marks = []
  const pos = {}
  for (const item of cuepoint) {
    if (!item) continue
    // if (item.resend) continue
    const created_at = Math.round(item.created_at)
    if (!created_at) continue
    let content = null
    try {
      content = JSON.parse(item.content2 || item.content)
    } catch (e) {
      return
    }
    const commands = content.command
    if (!commands) return []
    const command = commands[0]
    if (!command) return []
    const event = command.event
    const type = command.type
    if (!(event === 'operate' && type === 'active')) continue
    if (pos[created_at]) continue
    pos[created_at] = 1

    const desc = docSet[content.docId]
    if (!desc) continue
    marks.push({ time_point: created_at, desc: _.truncate(desc, { length: 16 }) })
  }
  return marks
}

// 转码进度回调，保存进度
async function docProcess(req){
  const { time, document_id, trans_status, converted_type, converted_process, status } = req.payload
  if (!document_id) return
  // 查询数据库保存的文档信息
  const doc = await Docs.findOne({ where: { docId: document_id } })
  if (!doc) return
  if (doc.process >= 100) return

  // 获取文档信息并保存
  if (!doc.pageNum) {
    const docInfo = await req.server.methods.paas.getDocumentInfo(document_id).catch(() => null)
    if (docInfo) {
      doc.set('pageNum', docInfo.page)
      doc.set('width', docInfo.width)
      doc.set('height', docInfo.height)
      doc.set('conversionType', docInfo.conversion_type)
    }
  }

  if (status === 1) {
    doc.set('process', 100)
  } else if (status === 2) {
    doc.set('process', -1)
  } else {
    const process = _.toSafeInteger(converted_process)
    doc.set('process', _.clamp(process, 0, 100))
  }
  await doc.save()
  const roomId = doc.roomId
  req.server.methods.room.resourceChange(roomId, null, 'doc', 'update', doc.toJSON()).catch(() => null)
}

// 自动打点
async function updateVodMark(req, vod){
  if (!vod) return
  const vodId = vod.vodId
  const docs = await Docs.findAll({ where: { roomId: vod.roomId }, attributes: ['doc_id', 'title'] })
  if (!docs.length) return
  const cue = await req.server.methods.paas.getCueFile(vodId)
  if (!cue) return
  if (cue.usrdata && cue.usrdata.length) return
  if (!Array.isArray(cue.cuepoint)) return
  const marks = getCueActiveMark(cue, docs.map(i => i.toJSON()))
  if (!(Array.isArray(marks) && marks.length)) return
  await req.server.methods.paas.updateVodPointFrameTasks(vodId, marks)
}

// 回播文件生成，记录
async function recordSuccess(req){
  const paasLiveId = req.payload.room_id
  // 1为生成功，2为失败
  const status = Number(req.payload.status)
  const vodId = req.payload.vod_id
  const taskId = req.payload.task_id
  const datetime = req.payload.datetime // if (!paasLiveId) return

  const roomId = await req.server.methods.room.getRoomIdByPaasId('paasLiveId', paasLiveId)
  const room = await req.server.methods.room.getRoom(roomId)
  if (!room) return

  if (status === 2) {
    const errno = req.payload.errno
    req.log('error', `服务器生成回放失败，roomId: ${roomId} taskId: ${taskId} errno: ${errno}`)
    return
  }
  if (status !== 1) return
  req.log('info', `服务器生成回放成功，roomId: ${roomId} vodId: ${vodId}`)
  const record = { vodId, roomId, ..._.pick(room, ['paasLiveId', 'type', 'appId', 'title']) }
  const [vod, isCreated] = await Vods.findOrCreate({ where: { vodId, roomId }, defaults: record })
  req.server.methods.paas.updateVodTags(vodId, [roomId, room.title]).catch(() => null)
  updateVodMark(req, vod).catch(() => null)
  // 清理缓存中的回放，让其加载最新的回放
  await req.server.methods.room.clearRoomVod(roomId)
}

// 直播状态更改
async function liveStatChange(req){
  const time = req.payload.time
  const paasLiveId = req.payload.room_id
  const status = Number(req.payload.status)
  // status 1 推流中 2 未推流

  const roomId = await req.server.methods.room.getRoomIdByPaasId('paasLiveId', paasLiveId)
  if (!roomId) return req.log('error', `回调未找到对应直播房间：${paasLiveId}`)
  const room = await req.server.methods.room.getRoom(roomId)

  // 开始推流
  if (status === 1) {
    const rs = await req.server.methods.tinyCache.getTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
    const origin = await req.server.methods.room.setRoomLiveStat(roomId, 3, time * 1000)
    req.server.methods.tinyCache.setTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
    // 已经在直播了
    if (rs && origin.status === 3) return

    // 发送自定义消息，开始旁路
    const b = { type: 'live_broadcast_start', roomId, sourceId: utils.SPECIAL_ACCOUNT_ID.MASTER, targetId: utils.SPECIAL_ACCOUNT_ID.EVERYONE }
    const body = { ...b, time: Date.now() }
    await req.server.methods.paas.sendCustomMessage(room.paasImId, utils.SPECIAL_ACCOUNT_ID.SYSTEM, null, body).catch(() => null)
  }

  // 结束推流
  else if (status === 2) {
    req.server.methods.tinyCache.dropTinyCache('live_broadcast_start.'+ roomId).catch(() => null)
    function stop_emit() {
      const b = { type: 'live_broadcast_stop', roomId, sourceId: utils.SPECIAL_ACCOUNT_ID.MASTER, targetId: utils.SPECIAL_ACCOUNT_ID.EVERYONE }
      const body = { ...b, time: Date.now() }
      return req.server.methods.paas.sendCustomMessage(room.paasImId, utils.SPECIAL_ACCOUNT_ID.SYSTEM, null, body).catch(() => null)
    }

    const info = await req.server.methods.room.getRoomInfo(roomId)
    // 已经结束
    if (info.status === 4) return stop_emit()

    // 以下是未点击结束推流出现的情况
    // 如果页面刷新，则会断开，延迟设置状态
    await utils.wait(5 * 1000)
    let rs
    rs = await req.server.methods.tinyCache.getTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
    // rs = await req.server.methods.paas.getIlsStatus()
    if (rs) {
      // 还在推流中，可能是闪断了
      req.server.log('info', `[${roomId}] stream is continue at: ${rs}`)
      return
    }
    await utils.wait(55 * 1000)
    rs = await req.server.methods.tinyCache.getTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
    if (rs) {
      // 还在推流中，可能是重推了
      req.server.log('info', `[${roomId}] stream is continue at: ${rs}`)
      return
    }

    const origin = await req.server.methods.room.setRoomLiveStat(roomId, 4, 0)
    // if (origin.status === 4) return
    // 发送自定义消息
    stop_emit()
  }
}

// 回调列表
// 点播： https://www.vhallyun.com/docs/show/496 https://www.vhallyun.com/docs/show/428
// 文档： https://www.vhallyun.com/docs/show/427
// 直播： https://www.vhallyun.com/docs/show/434
exports.callback = async (req, h) => {
  if (req.method === 'get') return h.response('success')
  if (!req.payload) return h.response('success')
  // 注意，部分回调没有appId
  const appId = req.payload.app_id
  const event = req.payload.event

  req.log('callback', req.payload)
  // appId 和预期不一样
  // if (appId !== req.server.app.paas.appId) return h.response('success')
  // 事件名称不存在
  if (!event) return h.response('success')
  // check signature
  if (!checkSignature(req.server.app.paas.secretKey, req.payload)) return h.response('success')

  try {
    switch (event) {
      // 文档转码进度
      case 'document/trans-conversion-process':
        await docProcess(req)
        break
      // 文档转码完成
      case 'document/trans-over':
        await docProcess(req)
        break

      // 直播房间流状态变更 （开始和结束）
      case 'lives/stream-change-status':
        await Promise.race([liveStatChange(req), utils.wait(1000)])
        req.log('info', 'event: lives/stream-change-status, ' + JSON.stringify(req.payload))
        break

      // 生成回放完成 (新版)
      case 'CreateRecordComplete':
        await recordSuccess(req)
        break
      // 视频单个清晰度转码完成
      case 'SingleTranscodeComplete':
        req.log('info', 'event: SingleTranscodeComplete, ' + JSON.stringify(req.payload))
        break
      // 视频全部清晰度转码完成
      case 'AllTranscodeComplete':
        req.log('info', 'event: AllTranscodeComplete, ' + JSON.stringify(req.payload))
        break
      // 点播截图完成
      case 'SnapshotComplete':
        req.log('info', 'event: SnapshotComplete, ' + JSON.stringify(req.payload))
        break
      // 智能审核完成
      case 'AIMediaAuditComplete':
        req.log('info', 'event: AIMediaAuditComplete, ' + JSON.stringify(req.payload))
        break
      // 生成回放完成 (旧版，不再建议使用，建议使用新版)
      case 'record/created-success':
        req.log('info', 'event: record/created-success, ' + JSON.stringify(req.payload))
        break
      // 回播转码成功回调 (旧版，不再建议使用，建议使用新版)
      case 'record/trans-over':
        req.log('info', 'event: record/trans-over, ' + JSON.stringify(req.payload))
        break

      default:
        req.log(['callback', 'info'], event, JSON.stringify(req.payload))
    }
  } catch (e) {
    req.log('error', e)
  }
  return h.response('success')
}
