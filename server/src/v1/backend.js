'use strict'
const crypto = require('crypto')
const { Docs, Vods, Rooms } = require('../models')
const _ = require('lodash')

// 在这里做签名检查处理
function checkSignature(secretKey, payload){
  if (!payload) return false
  const { signature, ...dict } = payload
  if (!signature) return false

  // 禁用次行打开签名检查
  return true

  const md5_1 = crypto.createHash('md5')
  md5_1.write(secretKey)
  const privateKey = md5_1.digest('hex')

  const md5 = crypto.createHash('md5')
  for (const [k, v] of _.sortBy(_.toPairs(dict), '0')) {
    md5.write(k + '|' + privateKey + '|' + v)
  }
  return md5.digest('hex') === signature
}

// 转码进度回调，保存进度
async function docProcess(req){
  const { refer, time, document_id, trans_status, converted_type, converted_process, status } = req.payload
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
}

// 回播文件生成，记录
async function recordSuccess(req){
  const { datetime, status, errno, vod_id, room_id } = req.payload
  const room = await Rooms.findOne({ where: { paasLiveId: room_id } })
  if (!room) return
  if (Number(status) === 1) {
    const roomId = room.id
    const record = { vodId: vod_id, roomId }
    // const [vod, isCreated] = await Vods.findOrCreate({ where: { vodId: vod_id }, defaults: record })
  } else {
    // 失败
  }
}

async function liveStatChange(req) {
  const { time, room_id, status } = req.payload
  let room
  try {
    room = await req.server.methods.room.getRoom(room_id)
  } catch (e) {
    req.log('warn', `find room error：${room_id}，` + e.message)
    return
  }
  if (!room) return req.log('warn', `room not found：${room_id}`)
  const liveStartAt = await req.server.methods.room.getRoomValue(room_id, 'live_start_at')
  // status 1 推流中 2 未推流
  if (Number(status) === 1) {
    if (liveStartAt > 0) return
    await req.server.methods.room.setRoomValue(room_id, 'live_start_at', time * 1000)

    // 发送自定义消息
    const msg = { type: 'live_start_another_at', time: Date.now() }
    await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: room.sid })
  } else if (Number(status) === 2) {
    if (liveStartAt === 0) return
    await req.server.methods.room.setRoomValue(room_id, 'live_start_at', 0)

    // 发送自定义消息
    const msg = { type: 'live_stop_another_at', time: Date.now() }
    await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: room.sid })
  }
}

// 回调列表
// 点播： https://www.vhallyun.com/docs/show/428 https://www.vhallyun.com/docs/show/496
// 文档： https://www.vhallyun.com/docs/show/427
// 直播： https://www.vhallyun.com/docs/show/434
exports.callback = async (req, h) => {
  if (req.method === 'get') return h.response('success')
  // check signature
  if (!checkSignature(req.server.app.paas.secretKey, req.payload)) return h.response('success')

  if (!req.payload) return h.response('success')
  const { event } = req.payload
  if (!event) return h.response('success')

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
        await liveStatChange(req)
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
      // 生成回放完成 (旧版，建议使用新版)
      case 'record/created-success':
        req.log('info', 'event: record/created-success, ' + JSON.stringify(req.payload))
        break
      // 回播转码成功回调 (旧版，建议使用新版)
      case 'record/trans-over':
        req.log('info', 'event: record/trans-over, ' + JSON.stringify(req.payload))
        break

      default:
        req.log(['callback', 'info'], event, JSON.stringify(req.payload))
    }
  } catch (e) {
    //
  }
  return h.response('success')
}
