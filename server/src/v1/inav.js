'use strict'
const _ = require('lodash')
const { SPECIAL_ACCOUNT_ID, INAV_IDENTITY, isMobileUA } = require('../utils')
const { ROOM_EVENTS } = require('../plugins/room')
const { getAnswerURL } = require('./form')
const { Forms } = require('../models')

async function notMangle(req){
  if (req.user.isAdmin) return false
  if (req.user.identity === INAV_IDENTITY.master) return false
  if (req.user.identity === INAV_IDENTITY.helper) return false
  return true
}

function bodyCheck(payload, keys){
  if (!payload) return '请求错误'
  if (!payload.roomId) return 'roomId错误'
  for (const key of keys) {
    if (typeof payload[key] === 'undefined') return '请求错误'
    if (key === 'targetId' && Object.keys(SPECIAL_ACCOUNT_ID).indexOf(payload.targetId) >= 0) return '用户不存在'
  }
}

async function sendCustomMessage(req, type, payload){
  // 设备类型 0其他 1手机 2PC
  const deviceType = !req.headers['user-agent'] ? 0 : isMobileUA(req.headers['user-agent']) ? 1 : 2
  const prohibitSpeak = 'N'
  const kickedOut = 'N'
  const sourceId = req.user.accountId
  const nickName = req.user.nickName
  const identity = req.user.identity
  const roomId = payload.roomId || req.payload.roomId
  const targetId = payload.targetId || req.payload.targetId
  const body = { type, roomId, sourceId, identity, nickName, avatar: '', deviceType, prohibitSpeak, kickedOut, targetId, ...payload }
  const $targetId = targetId && Object.values(SPECIAL_ACCOUNT_ID).indexOf(targetId) < 0 ? targetId : null
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)
  await req.server.methods.paas.sendCustomMessage(paasImId, sourceId, $targetId, body).catch(() => null)
}

// 只要在互动房间内，就算人数，不管有没有推流（互动流）
async function maxMemberCheck(req, paasInavId, maxMember){
  if (!maxMember) return false
  const accountSet = {}
  const users = await req.server.methods.paas.getIlsUsers(paasInavId).catch(() => [])
  const streams = await req.server.methods.paas.getIlsStreams(paasInavId).catch(() => [])
  if (Array.isArray(users)) for (const user of users) accountSet[user.accountId] = 1
  if (Array.isArray(streams)) for (const stream of streams) accountSet[stream.accountId] = 1
  const count = Object.keys(accountSet).length
  if (count >= maxMember) return false
  return true
}

// 发送tips
exports.sendTips = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId', 'text']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  await sendCustomMessage(req, ROOM_EVENTS.TIP_TEXT, { text: req.payload.text })
  return h.jdata({ sendToChatCustom: null })
}

// 让用户下麦
exports.down = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  req.log('info', `发送下麦操作 roomId:${roomId} targetId:${req.payload.targetId}`)
  if (req.payload.targetId) {
    await sendCustomMessage(req, ROOM_EVENTS.DOWN, {})
  } else {
    await sendCustomMessage(req, ROOM_EVENTS.DOWN_ALL, { targetId: SPECIAL_ACCOUNT_ID.EVERYONE })
  }

  const info = await req.server.methods.room.getRoom(roomId)
  // 为保险起见，再发一次消息
  setTimeout(() => {
    if (req.payload.targetId) {
      sendCustomMessage(req, ROOM_EVENTS.DOWN, {})
      // 强制离开
      req.server.methods.paas.kickInavStream(info.paasInavId, req.payload.targetId).catch(() => [])
    } else {
      sendCustomMessage(req, ROOM_EVENTS.DOWN_ALL, { targetId: SPECIAL_ACCOUNT_ID.EVERYONE })
    }
  }, 1000 * 3)

  return h.jdata({ sendToChatCustom: null })
}

// 申请上麦
exports.apply = async (req, h) => {
  /* @register method:post */
  const rs = bodyCheck(req.payload, ['roomId'])
  if (rs) return h.fail(rs)
  const userId = req.user.accountId
  const roomId = req.payload.roomId
  req.log('info', `用户申请上麦 roomId:${roomId} accountId:${userId}`)
  const deviceStatus = typeof req.payload.deviceStatus === 'number' ? req.payload.deviceStatus : 1

  const nickName = req.user.nickName || ''
  await req.server.methods.room.inavListAdd(roomId, 1, userId, req.user.identity, nickName)
  await sendCustomMessage(req, ROOM_EVENTS.REQUEST, { targetId: SPECIAL_ACCOUNT_ID.MANGLE, deviceStatus })
  return h.jdata({ sendToChatCustom: null })
}

// 申请上麦同意
exports.agreeApply = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  const roomId = req.payload.roomId
  req.log('info', `申请上麦同意 roomId:${roomId} targetId:${req.payload.targetId}`)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const info = await req.server.methods.room.getRoom(roomId)
  // 检查互动房间人数是否超出预定人数 (不包含主持人和助理)
  if (!await maxMemberCheck(req, info.paasInavId, info.maxMember - 2)) h.fail('互动上麦人数超出限制')

  const check = await req.server.methods.room.hasInavList(roomId, 1, req.payload.targetId).catch(() => [])
  if (!check) return h.jdata({ sendToChatCustom: null })

  await req.server.methods.paas.agreeInavStream(info.paasInavId, req.payload.targetId).catch(() => null)
  sendCustomMessage(req, ROOM_EVENTS.REQUEST_CALLBACK_AGREE, { }).catch(() => null)

  // 保存列表
  const list = await req.server.methods.room.listRoomEnterUser(roomId, 1, req.payload.targetId).catch(() => [])
  const user = list.find(item => item.accountId === req.payload.targetId)
  const nickName = user.nickName || ''
  const identity = user.identity || INAV_IDENTITY.player
  await req.server.methods.room.inavList2Add(roomId, 1, req.payload.targetId, identity, nickName)
  await req.server.methods.room.inavListDel(roomId, 1, req.payload.targetId)

  // 通知管理员刷新
  const rData = { type: 1, accountId: req.payload.targetId }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'inav', 'del', { data: rData }).catch(() => null)

  return h.jdata({ sendToChatCustom: null })
}

// 申请上麦拒绝
exports.rejectApply = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  const roomId = req.payload.roomId
  req.log('info', `申请上麦拒绝 roomId:${roomId} targetId:${req.payload.targetId}`)
  if (await notMangle(req)) return h.fail('没有操作权限')

  const check = await req.server.methods.room.hasInavList(roomId, 1, req.payload.targetId).catch(() => [])
  if (!check) return h.jdata({ sendToChatCustom: null })

  sendCustomMessage(req, ROOM_EVENTS.REQUEST_CALLBACK_REJECT, { token: '' }).catch(() => null)
  await req.server.methods.room.inavListDel(req.payload.roomId, 1, req.payload.targetId)

  // 通知管理员刷新
  const rData = { type: 1, accountId: req.payload.targetId }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'inav', 'del', { data: rData }).catch(() => null)

  return h.jdata({ sendToChatCustom: null })
}

// 邀请上麦
exports.invite = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  const accountId = req.payload.targetId
  req.log('info', `邀请上麦 roomId:${roomId} targetId:${accountId}`)
  const info = await req.server.methods.room.getRoom(roomId)
  // 20秒内不重发
  const rs0 = await req.server.methods.room.hasInavList(roomId, 2, req.payload.targetId)
  if (rs0 && ((Date.now() - rs0.time) < 20000)) return h.jdata({ sendToChatCustom: null })

  // 检查互动房间人数是否超出预定人数 (不包含主持人和助理)
  if (!await maxMemberCheck(req, info.paasInavId, info.maxMember - 2)) return h.fail('互动上麦人数超出限制')

  await req.server.methods.paas.agreeInavStream(info.paasInavId, req.payload.targetId).catch(() => null)
  await sendCustomMessage(req, ROOM_EVENTS.INVITER, { token: '' })

  const list = await req.server.methods.room.listRoomEnterUser(roomId).catch(() => [])
  const user = list.find(item => item.accountId === req.payload.targetId)
  const nickName = user.nickName || ''
  const identity = user.identity || INAV_IDENTITY.player
  await req.server.methods.room.inavListAdd(roomId, 2, req.payload.targetId, identity, nickName)

  // 通知管理员刷新
  const rData = { type: 2, accountId: req.payload.targetId }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'inav', 'add', { data: rData }).catch(() => null)

  return h.jdata({ sendToChatCustom: null })
}

// 邀请上麦同意
exports.agreeInvite = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  const userId = req.user.accountId
  const roomId = req.payload.roomId
  req.log('info', `邀请上麦同意 roomId:${roomId} targetId:${userId}`)
  const rs0 = await req.server.methods.room.hasInavList(roomId, 2, userId)
  const rs1 = await req.server.methods.room.hasInavList2(roomId, userId)
  if (!rs0 && !rs1) return h.fail('请检查邀请')

  // 只发一次，而后从列表删除
  if (rs0) await sendCustomMessage(req, ROOM_EVENTS.INVITER_CALLBACK_AGREE, { targetId: SPECIAL_ACCOUNT_ID.MANGLE })

  // 添加到列表并清理列表
  if (!rs1) {
    // const list = await req.server.methods.room.listRoomEnterUser(roomId).catch(() => [])
    // const user = list.find(item => item.accountId === req.payload.targetId)
    const nickName = req.user.nickName || ''
    const identity = req.user.identity || INAV_IDENTITY.player
    await req.server.methods.room.inavList2Add(roomId, 2, req.payload.targetId, identity, nickName)
  }
  if (rs0) await req.server.methods.room.inavListDel(roomId, 2, userId)

  // 通知管理员刷新
  const rData = { type: 2, accountId: userId }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'inav', 'del', { data: rData }).catch(() => null)

  return h.jdata({ sendToChatCustom: null })
}

// 邀请上麦拒绝
exports.rejectInvite = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  const userId = req.user.accountId
  const roomId = req.payload.roomId
  req.log('info', `邀请上麦拒绝 roomId:${roomId} targetId:${userId}`)
  await sendCustomMessage(req, ROOM_EVENTS.INVITER_CALLBACK_REJECT, { targetId: SPECIAL_ACCOUNT_ID.MANGLE })
  await req.server.methods.room.inavListDel(roomId, 2, userId)

  // 通知管理员刷新
  const rData = { type: 2, accountId: userId }
  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'inav', 'del', { data: rData }).catch(() => null)

  return h.jdata({ sendToChatCustom: null })
}

// 关闭/开启 麦克风/摄像头
exports.handleDevice = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId', 'device', 'close']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  const targetId = req.payload.targetId
  const close = req.payload.close
  const device = req.payload.device
  req.log('info', `设备操作 roomId:${roomId} targetId:${targetId} device:${device} close:${close}`)
  const k = `${close ? 'close' : 'open'}-${device}-${targetId ? 'user' : 'all'}`
  const es = {
    'close-camera-user': ROOM_EVENTS.CLOSE_CAMERA,
    'close-camera-all': ROOM_EVENTS.CLOSE_CAMERA_ALL,
    'close-mic-user': ROOM_EVENTS.CLOSE_MIC,
    'close-mic-all': ROOM_EVENTS.CLOSE_MIC_ALL,
    'open-camera-user': ROOM_EVENTS.OPEN_CAMERA,
    'open-camera-all': ROOM_EVENTS.OPEN_CAMERA_ALL,
    'open-mic-user': ROOM_EVENTS.OPEN_MIC,
    'open-mic-all': ROOM_EVENTS.OPEN_MIC_ALL
  }
  const type = es[k]
  if (!type) return h.fail('不支持的操作')
  await sendCustomMessage(req, type, { targetId: targetId || SPECIAL_ACCOUNT_ID.EVERYONE, device, close })
  return h.jdata({ sendToChatCustom: null })

  // const text = `主持人/助理提醒您开启${req.payload.device === 'camera' ? '摄像头' : '麦克风'}`
  // await sendCustomMessage(req, ROOM_EVENTS.TIP_TEXT, { targetId: req.payload.targetId, text, roomId })
  // return h.jdata({ sendToChatCustom: null })
}

// 踢出房间
exports.kick = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const text = req.payload.text || '您已被踢出房间'
  const roomId = req.payload.roomId
  req.log('info', `踢出房间 roomId:${roomId} targetId:${req.payload.targetId}`)
  await sendCustomMessage(req, ROOM_EVENTS.KICK, { text })
  const targetUserId = req.payload.targetId

  const list = await req.server.methods.room.listRoomEnterUser(roomId).catch(() => [])
  const user = list.find(item => item.accountId === targetUserId)

  await req.server.methods.room.kickAccountAdd(roomId, { accountId: targetUserId, ...user }, req.user.accountId, req.user.identity)

  // 通过自定义消息实现踢出，没有连接级别的踢出
  // 有概率会无法踢出，为保险起见，所以再发一次消息
  setTimeout(() => {
    sendCustomMessage(req, ROOM_EVENTS.KICK, { text }).catch(() => null)
    req.server.methods.paas.leaveIlsUser(roomId, targetUserId).catch(() => [])
  }, 1000 * 3)

  // 通知管理员刷新
  const rData = { accountId: targetUserId }
  await req.server.methods.room.resourceChange(roomId, req.user.accountId, 'kick', 'add', { data: rData })
  return h.jdata({ sendToChatCustom: null })
}

// 取消踢出房间
exports.unkick = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  // 已经踢出的，通知不到本人了
  // await sendCustomMessage(req, ROOM_EVENTS.UNKICK, { targetId: req.payload.targetId })
  const targetUserId = req.payload.targetId
  req.log('info', `取消踢出房间 roomId:${roomId} targetId:${targetUserId}`)
  await req.server.methods.room.kickAccountDel(roomId, targetUserId)

  // 通知管理员刷新
  const rData = { accountId: targetUserId }
  await req.server.methods.room.resourceChange(roomId, req.user.accountId, 'kick', 'del', { data: rData })
  return h.jdata({ sendToChatCustom: null })
}

// 禁言
exports.mute = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  const targetUserId = req.payload.targetId
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)

  if (!req.payload.targetId) {
    await req.server.methods.paas.setMuteAll(paasImId, true)
    const text = req.payload.text || '全局禁言已开启'
    await sendCustomMessage(req, ROOM_EVENTS.MUTE_ALL, { text, targetId: SPECIAL_ACCOUNT_ID.EVERYONE })
    return h.jdata({ sendToChatCustom: null })
  }

  // const list = await req.server.methods.room.listRoomEnterUser(roomId).catch(() => [])
  // const user = list.find(item => item.accountId === targetUserId)
  // await req.server.methods.room.muteAccountAdd(roomId, { accountId: targetUserId, ...user }, req.user.accountId, req.user.identity)
  await req.server.methods.paas.setMute(paasImId, true, targetUserId)
  const text = req.payload.text || '您已被禁言'
  await sendCustomMessage(req, ROOM_EVENTS.MUTE, { text })

  // 通知管理员刷新
  const rData = { accountId: targetUserId }
  await req.server.methods.room.resourceChange(roomId, req.user.accountId, 'mute', 'add', { data: rData })
  return h.jdata({ sendToChatCustom: null })
}

// 取消禁言
exports.unmute = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'targetId']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  if (await notMangle(req)) return h.fail('没有操作权限')
  const roomId = req.payload.roomId
  const targetUserId = req.payload.targetId
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)

  if (!req.payload.targetId) {
    await req.server.methods.paas.setMuteAll(paasImId, false)
    const text = req.payload.text || '全局禁言已关闭'
    await sendCustomMessage(req, ROOM_EVENTS.UNMUTE_ALL, { text, targetId: SPECIAL_ACCOUNT_ID.EVERYONE })
    return h.jdata({ sendToChatCustom: null })
  }

  // await req.server.methods.room.muteAccountDel(roomId, targetUserId)
  await req.server.methods.paas.setMute(paasImId, false, targetUserId)
  const text = req.payload.text || '您已被取消禁言'
  await sendCustomMessage(req, ROOM_EVENTS.UNMUTE, { text })

  // 通知管理员刷新
  const rData = { accountId: targetUserId }
  await req.server.methods.room.resourceChange(roomId, req.user.accountId, 'mute', 'del', { data: rData })
  return h.jdata({ sendToChatCustom: null })
}

// 上麦操作
exports.inavApplyCall = async (req, h) => {
  /* @register method:post */
  const keys = ['roomId', 'status']
  const rs = bodyCheck(req.payload, keys)
  if (rs) return h.fail(rs)
  const userId = req.user.accountId
  const roomId = req.payload.roomId
  const rs1 = await req.server.methods.room.hasInavList2(roomId, userId)
  if (!rs1) return h.fail('请检查邀请')

  const info = await req.server.methods.room.getRoom(roomId)
  await req.server.methods.paas.agreeInavStream(info.paasInavId, req.user.accountId).catch(() => null)
  return h.jdata()
}

// 下麦操作
exports.inavDownCall = async (req, h) => {
  /* @register method:post */
  const roomId = req.payload.roomId
  const accountId = req.user.accountId
  if (!roomId) return h.fail('roomId不存在')
  req.server.methods.room.inavListDel(roomId, 1, accountId).catch(() => null)
  req.server.methods.room.inavListDel(roomId, 2, accountId).catch(() => null)
  req.server.methods.room.removeInavList2(roomId, accountId).catch(() => null)
  await sendCustomMessage(req, ROOM_EVENTS.TIP_TEXT, { text: '用户已下麦', targetId: SPECIAL_ACCOUNT_ID.MANGLE }).catch(() => null)
  return h.jdata()
}

// 发送表单
exports.sendForm = async (req, h) => {
  /* @register method:post */
  const { id, roomId } = req.payload
  if (!id) return h.fail('id错误')
  if (!roomId) return h.fail('roomId错误')
  if (await notMangle(req)) return h.fail('没有操作权限')
  const form = await Forms.findOne({ where: { roomId: roomId, id } })
  const appId = req.server.app.paas.appId
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)

  const data = {
    roomId,
    id: `${id}`,
    questionnaireId: `${id}`,
    title: form.title || '表单填写',
    formId: form.formId,
    targetId: SPECIAL_ACCOUNT_ID.EVERYONE,
    answerPage: getAnswerURL(appId, `${id}`, roomId, form.formId, '')
  }

  // 发布表单到聊天
  const sourceId = req.user.accountId
  const nickName = req.user.nickName || ''
  const identity = req.user.identity
  // chat sub type: image link text video voice
  const body = { type: 'link', subType: ROOM_EVENTS.SEND_FORM, roomId, sourceId, identity, nickName, avatar: '', deviceType: 0, targetId: SPECIAL_ACCOUNT_ID.EVERYONE }
  await req.server.methods.paas.getImv3().sendMessage(paasImId, 'chat', sourceId, null, body).catch(e => null)

  // 发布自定义消息
  await sendCustomMessage(req, ROOM_EVENTS.SEND_FORM, data)

  await req.server.methods.room.formPub(roomId, id, data.formId, data.title)
  if (form.status !== 2) {
    // 将表单设置为已发布
    form.set({ status: 2, publishAt: new Date() })
    await form.save()
  }

  req.server.methods.room.resourceChange(roomId, req.user.accountId, 'form', 'change', { roomId, data: form.toJSON() })
  return h.jdata({ sendToChatCustom: null })
}

// 填写表单
exports.answerForm = async (req, h) => {
  /* @register method:post */
  const { id, roomId, data, client } = req.payload
  if (!id) return h.fail('id错误')
  if (!roomId) return h.fail('roomId错误')
  if (!Array.isArray(data) || !data.length) return h.fail('答案不能为空')
  const answers = {}
  for (const item of data) {
    if (!item) continue
    answers[item.id] = item.replys || ''
    // answers.push({ id: item.id, replys: item.replys })
  }

  let formId = req.payload.formId || form.formId
  if (!formId) {
    const form = await Forms.findOne({ where: { roomId: roomId, id } })
    formId = form && form.formId
  }
  if (!formId) return h.fail('表单未发布或不存在')

  // 保存用户答题
  const rs1 = await req.server.methods.paas.saveFormAnswer(formId, client, req.user.accountId, JSON.stringify(answers))
  // 本地保存用户答题列表
  await req.server.methods.room.saveFormAnswer(roomId, req.user.accountId, id, formId, client, rs1.id)

  return h.jdata({ id: rs1.id })
}

// 在线用户数量统计
exports.onlineCount = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (!roomId) return h.fail('roomId错误')
  const channelId = await req.server.methods.room.getChannelIdOfRoomId(roomId)
  const count = await req.server.methods.paas.getImOnlineUV(channelId)
  return h.jdata({ count })
}

// 被踢出用户列表
exports.kickList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (req.query.page && Number(req.query.page) > 1) return h.jlist([], Number(req.query.page), 0, Number(req.query.page) + 1)
  if (!roomId) return h.fail('roomId错误')
  if (await notMangle(req)) return h.fail('没有操作权限')
  const rs0 = await req.server.methods.room.kickAccounts(roomId)
  const accounts = []
  for (const item of rs0) {
    if (!item.accountId) continue
    accounts.push({
      accountId: item.accountId,
      identity: item.identity || INAV_IDENTITY.player,
      nickName: item.nickName,
      avatar: '',
      deviceType: 0, // 设备类型：0未检测 1手机端 2PC 3SDK
      status: 0, // 在线状态：0离线 1在线
      isSpeak: false,
      isMute: false,
      isKick: true
    })
  }
  return h.jlist(accounts, 1, accounts.length, 2)
}

// 在线用户列表
exports.onlineList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (!roomId) return h.fail('roomId错误')
  const info = await req.server.methods.room.getRoom(roomId)
  if (!info) return h.jlist([], 1, 0, 2)
  const paasImId = info.paasImId
  const paasInavId = info.paasInavId
  if (!paasImId) return h.jlist([], 1, 0, 2)

  const pr0 = req.server.methods.paas.getImOnlineUser(paasImId, 1, 100)
  const pr1 = req.server.methods.paas.getImMuteList(paasImId)
  const pr2 = req.server.methods.room.listRoomEnterUser(roomId)
  // const pr3 = req.server.methods.room.inavList2List(roomId)
  // const pr4 = req.server.methods.room.inavLists(roomId)
  // const pr6 = req.server.methods.paas.getIlsUsers(info.paasInavId).catch(() => [])
  const pr7 = req.server.methods.paas.getIlsStreams(paasInavId).catch(() => [])

  const rs0 = await pr0
  const rs1 = await pr1
  const rs2 = await pr2
  // const rs3 = await pr3
  // const rs4 = await pr4
  const rs7 = await pr7

  // const onlineMap = rs0.list.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const muteMap = rs1.list.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const enterMap = rs2.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const inavMap = rs7.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  // const inavPaddingMap = rs4.reduce((map, item) => { map[item.accountId] = item; return map; }, {})

  const userSet = {}
  for (const item of rs0.list) {
    const accountId = item.accountId
    if (userSet[accountId]) continue
    const inav = inavMap[accountId]
    const enter = enterMap[accountId] || {}
    const mute = muteMap[accountId]
    userSet[accountId] = {
      accountId: accountId,
      nickName: item.nickName || enter.nickName || '',
      avatar: item.avatar || enter.avatar || '',
      identity: item.identity || enter.identity || INAV_IDENTITY.player,
      deviceType: 0, // 设备类型：0未检测 1手机端 2PC 3SDK
      status: 1, // 在线状态：0离线 1在线
      isSpeak: !!inav,
      isMute: !!mute,
      isKick: false
    }
  }

  // 排序
  const sorts = {
    [INAV_IDENTITY.master]: 0,
    [INAV_IDENTITY.helper]: 1,
    [INAV_IDENTITY.guest]: 2,
    [INAV_IDENTITY.player]: 3,
  }
  const list = _.values(userSet).sort((a, b) => sorts[a.identity] - sorts[b.identity])
  return h.jlist(list, 1, list.length, 2)
}

// 被禁言用户用户列表
exports.muteList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (req.query.page && Number(req.query.page) > 1) return h.jlist([], Number(req.query.page), 0, Number(req.query.page) + 1)
  if (!roomId) return h.fail('roomId错误')
  if (await notMangle(req)) return h.fail('没有操作权限')
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)
  if (!paasImId) return h.jlist([], 1, 0, 2)

  const pr1 = req.server.methods.paas.getImMuteList(paasImId)
  const pr2 = req.server.methods.room.listRoomEnterUser(roomId)
  const pr3 = req.server.methods.room.inavList2List(roomId)

  const rs1 = await pr1
  const rs2 = await pr2
  const rs3 = await pr3

  const enterMap = rs2.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const inavMap = rs3.reduce((map, item) => { map[item.accountId] = item; return map; }, {})

  const userSet = {}
  for (const item of rs1.list) {
    const accountId = item.accountId
    if (userSet[accountId]) continue
    const inav = inavMap[accountId]
    const enter = enterMap[accountId] || {}
    userSet[accountId] = {
      accountId: accountId,
      nickName: item.nickName || enter.nickName || '',
      avatar: item.avatar || enter.avatar || '',
      identity: item.identity || enter.identity || INAV_IDENTITY.player,
      deviceType: 0, // 设备类型：0未检测 1手机端 2PC 3SDK
      status: 1, // 在线状态：0离线 1在线
      isSpeak: !!inav,
      isMute: true,
      isKick: false
    }
  }

  const accounts = _.values(userSet)
  return h.jlist(accounts, 1, accounts.length, 2)
}

// 在麦上用户列表
exports.inavList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (req.query.page && Number(req.query.page) > 1) return h.jlist([], Number(req.query.page), 0, Number(req.query.page) + 1)
  if (!roomId) return h.fail('roomId错误')
  if (await notMangle(req)) return h.fail('没有操作权限')
  const paasImId = await req.server.methods.room.getChannelIdOfRoomId(roomId)
  if (!paasImId) return h.jlist([], 1, 0, 2)

  const info = await req.server.methods.room.getRoomInfo(roomId)
  const pr1 = req.server.methods.paas.getImMuteList(paasImId)
  const pr2 = req.server.methods.room.listRoomEnterUser(roomId)
  // const pr3 = req.server.methods.room.inavList2List(roomId)
  // const pr4 = req.server.methods.paas.getIlsUsers(info.paasInavId).catch(() => [])
  const pr5 = req.server.methods.paas.getIlsStreams(info.paasInavId).catch(() => [])

  const rs1 = await pr1
  const rs2 = await pr2
  // const rs3 = await pr3
  // const rs4 = await pr4
  const rs5 = await pr5

  const muteMap = rs1.list.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const enterMap = rs2.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  // const inavUserSet = rs4.reduce((map, item) => { map[item.accountId] = item; return map; }, {})
  const streamUserSet = rs5.reduce((map, item) => { map[item.accountId] = item; return map; }, {})

  // const inavUserSet2 = Object.assign({}, inavUserSet, streamUserSet)
  const inavUserSet2 = streamUserSet
  delete inavUserSet2[info.masterId]
  delete inavUserSet2[info.helperId]
  const userSet = {}
  for (const accountId of Object.keys(inavUserSet2)) {
    if (userSet[accountId]) continue
    const enter = enterMap[accountId] || {}
    const mute = muteMap[accountId]
    userSet[accountId] = {
      accountId: accountId,
      nickName: enter.nickName || '',
      avatar: enter.avatar || '',
      identity: enter.identity || INAV_IDENTITY.player,
      deviceType: 0, // 设备类型：0未检测 1手机端 2PC 3SDK
      status: 1, // 在线状态：0离线 1在线
      isSpeak: true,
      isMute: !!mute,
      isKick: false
    }
  }

  const accounts = _.values(userSet)
  return h.jlist(accounts, 1, accounts.length, 2)
}

// 申请用户列表
exports.inavPaddingList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (req.query.page && Number(req.query.page) > 1) return h.jlist([], Number(req.query.page), 0, Number(req.query.page) + 1)
  if (!roomId) return h.fail('roomId错误')
  if (await notMangle(req)) return h.fail('没有操作权限')
  const inavLists = await req.server.methods.room.inavLists(roomId)
  const accountSet = {}
  const accounts = []
  // 申请上麦或被邀请上麦的用户 (倒序排列)
  for (const item of inavLists.reverse()) {
    if (!item.accountId) continue
    if (accountSet[item.accountId]) continue
    accountSet[item.accountId] = 1
    accounts.push({
      accountId: item.accountId,
      identity: item.identity || INAV_IDENTITY.player,
      nickName: item.nickName,
      avatar: '',
      isSpeak: false,
      type: item.type, // 1申请 2已邀请
      deviceType: 0, // 设备类型：0未检测 1手机端 2PC 3SDK
      status: 0, // 在线状态：0离线 1在线
      isMute: false,
      isKick: false
    })
  }
  return h.jlist(accounts, 1, accounts.length, 2)
}

// 已发布表单列表
exports.formList = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (req.query.page && Number(req.query.page) > 1) return h.jlist([], Number(req.query.page), 0, Number(req.query.page) + 1)
  if (!roomId) return h.fail('roomId错误')
  const appId = req.server.app.paas.appId
  // 直播间已发布表单列表
  const list = await req.server.methods.room.formList(roomId)
  // 答题列表
  const answers = await req.server.methods.room.getFormAnswer(roomId, req.user.accountId)
  const answerSet = {}
  for (const answer of answers) answerSet[answer.id] = 2

  for (const item of list) {
    item.answerPage = getAnswerURL(appId, item.id, roomId, item.formId, 'pc')
    // 1未填写 2已填写
    item.status = answerSet[item.id] ? 2 : 1
  }
  return h.jlist(list, 1, list.length, 2)
}
