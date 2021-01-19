'use strict'
const net = require('net')
const isIpPrivate = require('private-ip')
const Boom = require('@hapi/boom')
const util = require('util')
const fs = require('fs')
const _ = require('lodash')
const uuid = require('uuid')
const {safeParse} = require('@hapi/bourne')
const { flakeId, randomNickname, demoAuth } = require('../utils')
const { Rooms, Sessions } = require('../models')
// 互动房间身份
const INAV_IDENTITY = { master: 'master', helper: 'helper', guest: 'guest', player: 'player' }
const DEFAULT_AVATAR = 'https://static.vhallyun.com/jssdk/vhall-jssdk-chat/latest/images/avatar.png'
const MAX_MEMBER = 6

// 创建一个全新的room
async function createNewRoom(methods, sid, title, appId){
  const maxMember = MAX_MEMBER
  // 创建推流id
  const paasLiveId = await methods.paas.createLss()
  // 创建聊天id
  const paasImId = await methods.paas.createChannel()
  // 创建互动id
  const paasInavId = await methods.paas.createIls(maxMember)
  // 默认打开旁路开关
  // await methods.paas.setIlsAnotherOpen(paasInavId, true).catch(() => null)
  const record = { id: flakeId(), sid, appId, paasLiveId, paasImId, paasInavId, title: title || '', maxMember: maxMember, lastUse: null }
  // 保存房间信息到数据库
  const room = await Rooms.create(record)
  return methods.room.getRoom(room.id)
}

// 获取请求的info
async function fetchRequestUserInfo(req){
  const info = {}
  info.ip = req.info.remoteAddress
  info.userAgent = _.truncate(req.headers['user-agent'], { length: 255, omission: '' })
  info.origin = _.truncate(req.headers.origin || req.url.toString(), { length: 255, omission: '' })

  const xIp = _.trim(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].splice(',')[0]))
  if (xIp && net.isIP(xIp) && isIpPrivate(info.ip)) {
    info.ipAddress = xIp
  }
  return info
}

// 保存信息到session
async function saveSession(req, username){
  const sid = req.yar.id
  const info = await fetchRequestUserInfo(req)
  const record = { ...info, roomCounter: 1, from: 0, sid, username }
  await Sessions.upsert(record)
}

// 创建互动房间
exports.create = async (req, h) => {
  const sid = req.yar.id
  const { title, username } = req.payload
  if (!title) return Boom.badRequest('请填写互动房间名称')
  if (_.size(title) > 50) return Boom.badRequest('互动房间名称过长')
  if (!username) return Boom.badRequest('请填写您的名称')
  if (_.size(username) > 10) return Boom.badRequest('您的名称过长')

  // 新用户，保存用户session
  if (!req.state.sid) {
    try {
      await saveSession(req, username)
    } catch (e) {
      return Boom.serverUnavailable(e.message)
    }
  }

  // 创建次数计数
  const roomCounter = await req.yar.get('room_counter') || 0
  req.yar.set('room_counter', roomCounter + 1)

  let find
  try {
    find = await req.server.methods.room.getRoomByTitle(title)
  } catch (e) {
    return Boom.serverUnavailable(e.message)
  }
  let room
  if (find) {
    // 检查这个room是不是当前用户创建的，如果是，则直接返回
    if (find.sid === sid) {
      return h.jdata({ id: find.id, title: find.title, username, userId: sid })
    } else {
      // 已经创建，但是没有人用过
      if (!find.lastUse) {
        return h.jdata({ id: find.id, title: find.title, username, userId: sid })
      }
    }
    req.log('info', `room is use: ` + find.id + ' ' + find.title)

    try {
      room = find
      let $masterId = await req.server.methods.room.getRoomValue(room.id, 'master_user_id')
      const res = await req.server.methods.paas.getIlsUsers(room.paasInavId).catch(e => e)
      if (Array.isArray(res) && res.length) {
        if (res.length >= room.maxMember) return Boom.badRequest('这个互动房间名称已被使用')
        const masterInRoom = res.findIndex(item => item.third_party_user_id === $masterId) >= 0
        if (masterInRoom) return Boom.badRequest('这个互动房间名称已被使用')
      }

      await Rooms.update({ lastUse: null }, { where: { id: room.id } })
      await req.server.methods.room.setRoomValue(room.id, 'lastUse', '')
      req.yar.id = room.sid
    } catch (e) {
      return Boom.serverUnavailable('获取房间状态线人数出错：' + e.message)
    }
    // return Boom.badRequest('这个互动房间名称已被使用')
  }

  if (!room) {
    try {
      // 创建一个全新的room
      room = await createNewRoom(req.server.methods, sid, title, req.server.app.paas.appId)
    } catch (e) {
      return Boom.serverUnavailable('创建互动房间出错：' + e.message)
    }
  }

  return h.jdata({ id: room.id, title: room.title, username, userId: sid })
    .state('roomId', `${room.id}`, { isHttpOnly: false, isSecure: false, isSameSite: 'Lax', path: '/' })
}

// 开始推流（旁路）(您应该自己检查权限)
exports.another = async (req, h) => {
  const { roomId, open, maxScreenStream, time } = req.payload
  if (!roomId) return Boom.badRequest('互动房间没有指定')
  let room = await req.server.methods.room.getRoom(roomId)
  if (!room) return Boom.badRequest('互动房间不存在')

  // 判断用户是否有"推流"权限（仅限主持人）
  const master_user_id = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
  // const helper_user_id = await req.server.methods.room.getRoomValue(roomId, 'helper_user_id')
  if (master_user_id !== req.yar.id && room.sid !== req.yar.id) {
    return Boom.badRequest('没有推流权限')
  }

  const dpi = 'BROADCAST_VIDEO_PROFILE_720P_1' // 1280x720 (默认)
  const layout = req.payload.layout || 'CANVAS_LAYOUT_PATTERN_FLOAT_6_5D' // 大屏铺满，一行5个悬浮于下面
  const userId = master_user_id || room.sid
  if (open) {
    try {
      // 启动旁路推流
      await req.server.methods.paas.pushIlsAnother(room.paasInavId, room.paasLiveId, dpi, layout)
    } catch (e) {
      return Boom.serverUnavailable('启动旁路推流出错：' + e.message)
    }

    // 设置最大屏占比的流
    if (maxScreenStream) await req.server.methods.paas.setMaxScreenStream(room.paasInavId, maxScreenStream).catch(e => e)

    await req.server.methods.room.setRoomValue(roomId, 'live_start_at', Date.now())

    // 发送自定义消息，通知客户端已经开始直播
    const msg = { type: 'live_start', time: time || Date.now(), roomId, masterId: userId }
    await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: userId })
  } else {

    // 关闭页面
    if (req.payload.unload) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      let $masterId = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
      let masterId = $masterId || room.sid
      const list = await req.server.methods.paas.getIlsUsers(room.paasInavId).catch(e => [])
      if (Array.isArray(list) && list.length) {
        const masterInRoom = list.findIndex(item => item.third_party_user_id === masterId) >= 0
        if (masterInRoom) return h.jdata({})
      }
    }

    // 停止旁路推流
    const res = await req.server.methods.paas.pushIlsAnotherStop(room.paasInavId).catch(e => e)
    if (res instanceof Error) {
      // 已关闭
      if (res.data.code !== 60003) {
        req.log('warn', `关闭旁路出错，${res.message}`)
      }
    }
    await req.server.methods.room.setRoomValue(roomId, 'live_start_at', -1)

    // 发送自定义消息，通知客户端已经停止直播
    const msg = { type: 'live_stop', time: time || Date.now() }
    await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: userId })
  }
  return h.jdata({})
}

// 根据token或roomId获取互动房间信息
exports.init = async (req, h) => {
  const sid = req.yar.id
  const roomId = req.query.roomId || req.state.roomId
  const title = req.query.title
  if (!(roomId && sid || title)) return Boom.badRequest('参数错误，无法取得互动房间信息')
  const sessionRoomId = req.state.roomId
  let room

  // 根据roomId取得互动房间信息
  if (roomId) room = await req.server.methods.room.getRoom(roomId || sessionRoomId)
  if (title) room = await req.server.methods.room.getRoomByTitle(title)
  if (!room) return Boom.badRequest('互动房间信息不存在')

  const result = { roomId: room.id, title: room.title, username: randomNickname() }
  return h.jdata(result)
    .state('roomId', `${result.roomId}`, { isHttpOnly: false, isSecure: false, isSameSite: 'Lax', path: '/' })
}

// 进入互动房间需要的信息及权限分配
// 注意，这里是demo，如果要在您自己的应用中使用，您需要实现自己的更为准确的权限管理
// 特别需要注意的是，用户的权限是需要和房间进行关连的，即用户在a房间是创建者，在b房间不是
exports.enter = async (req, h) => {
  const { roomId, username, identity } = req.payload || {}
  if (!roomId) return Boom.badRequest('房间名不能为空')
  if (!username) return Boom.badRequest('用户昵称不能为空')
  if (!INAV_IDENTITY[identity]) return Boom.badRequest('身份设置不正确')

  const sid = req.yar.id
  const sessionRoomId = req.state.roomId
  const tokenOptions = {}
  let room
  let accountId
  let token

  if (!req.state.sid) {
    return Boom.badRequest('请检查您是否阻止了cookie')
  }

  try {
    room = await req.server.methods.room.getRoom(roomId)
  } catch (e) {
    return Boom.serverUnavailable('获取房间出错：' + e.message)
  }
  if (!room) return Boom.badRequest('互动房间不存在')

  // 随机分配一个一个accountId （为了方便演示才随机分配的，实际操作中建议对应到用户，且不需要更新）
  accountId = null // (req.state.user && req.state.user.userId)
  // 恢复之前的用户id（根据用户名，主持人不需要）
  if (identity !== INAV_IDENTITY.master) {
    const userId = await req.server.methods.room.getRoomUserIdByNameAndIdentity(roomId, identity, username).catch(() => null)
    if (userId) accountId = userId
  } else {
    accountId = sid
  }
  if (!accountId) {
    accountId = uuid.v4()
  }

  let $masterId = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
  let masterId = $masterId || room.sid
  let helperId = await req.server.methods.room.getRoomValue(roomId, 'helper_user_id')
  let masterInRoom
  let helperInRoom
  if (helperId === masterId) helperId = null
  // 检查人数 (观看端不限制人数)
  if (identity !== INAV_IDENTITY.player) {
    let list = []
    // 查询在互动房间的人
    const pi = req.server.methods.paas.getIlsUsers(room.paasInavId).catch(e => e)
    const pm = req.server.methods.paas.getImOnlineUser(room.paasImId, 1, 100).catch(e => e)
    try {
      const res = await pi
      if (Array.isArray(res) && res.length) {
        if (res.length >= room.maxMember) return Boom.badRequest('该房间已满员')
        list = list.concat(res.map(item => item.third_party_user_id))
      }
    } catch (e) {
      return Boom.serverUnavailable('获取在线人数出错：' + e.message)
    }

    // 查询在房间的人
    try {
      const res = await pm
      if (res) {
        if (Array.isArray(res.list)) list = list.concat(res.list)
        for (const [userId, $ctx] of Object.entries(res.context)) {
          const ctx = safeParse($ctx)
          if (!ctx) continue
          if (ctx.identity === INAV_IDENTITY.master) { masterInRoom = true; continue }
          if (ctx.identity === INAV_IDENTITY.helper) { helperInRoom = true; continue }
          list.push(userId)
        }
      }
    } catch (e) {
      return Boom.serverUnavailable('获取在线人数出错：' + e.message)
    }

    list = _.filter(_.uniq(list))
    // 去掉主持人和助理
    if (masterId) masterInRoom = masterInRoom || list.findIndex(item => item === masterId) >= 0
    if (helperId) helperInRoom = helperInRoom || list.findIndex(item => item === helperId) >= 0
    list = list.filter(item => item !== helperId && item !== masterId)

    // 检查是否有主持人在线
    if (identity === INAV_IDENTITY.master) {
      if (masterInRoom) return Boom.badRequest('主持人已进入直播间，请选择其他角色')
    } else if (identity === INAV_IDENTITY.helper) {
      if (helperInRoom) return Boom.badRequest('助理已进入直播间，请选择其他角色')
    } else {
      // 去掉主持人和助理
      if (list.length >= (room.maxMember - 2)) return Boom.badRequest('该房间已满员')
    }
  }

  if (identity === INAV_IDENTITY.master) {
    // 只有是当前是创建者才有主播权限
    if (!(accountId === room.sid || accountId === $masterId)) {
      if (room.lastUse) {
        return Boom.badRequest('此互动房间已被使用')
      }
      // 房间没有人在使用
      const status = await req.server.methods.paas.getIlsStatus(room.paasInavId).catch(e => null)
      // 这个房间正在推流中，不可被复用
      if (status === 1) return Boom.badRequest('此互动房间你没有推流端权限')
    }
    // 把room设置为已使用
    await req.server.methods.room.setRoomValue(roomId, 'lastUse', new Date()).catch(() => null)
    await Rooms.update({ lastUse: new Date() }, { where: { id: room.id } })
    // 主持人进入，则把结束直播状态变更为暂未开始
    await req.server.methods.room.setRoomValue(roomId, 'live_start_at', 0).catch(() => null)
  }

  // 检查用户是否在黑名单里面
  const ids = await req.server.methods.paas.getIlsKickList(room.paasInavId).catch(() => [])
  if (Array.isArray(ids) && ids.indexOf(accountId) >= 0) {
    if (identity !== INAV_IDENTITY.master) return Boom.badRequest('您已被踢出，无法进入')
    // 主持人被设置为黑名单了（正式使用时不可能会出现），则取消
    await req.server.methods.paas.resetIlsKickUser(roomId, accountId).catch(() => null)
  }

  if (identity === INAV_IDENTITY.master) {
    accountId = sid
    await req.server.methods.room.setRoomValue(roomId, 'master_user_id', accountId)
  } else if (identity === INAV_IDENTITY.helper) {
    await req.server.methods.room.setRoomValue(roomId, 'helper_user_id', accountId)
  }

  // 创建paas平台token，参见 http://www.vhallyun.com/docs/show/19
  if (identity === INAV_IDENTITY.master) {
    // 后端来操作推流和旁路，这里不需要给权限了
    // tokenOptions.publish_stream = room.paasLiveId // 推流
    // tokenOptions.publish_inav_another = room.paasInavId // 推旁路直播/结束推旁路直播
  }
  // 助理和推流端特有权限
  if (identity === INAV_IDENTITY.master || identity === INAV_IDENTITY.helper) {
    tokenOptions.kick_inav = room.paasInavId // 踢出互动房间/取消踢出互动房间
    tokenOptions.publish_inav_stream = room.paasInavId // 推流(互动流)
    tokenOptions.kick_inav_stream = room.paasInavId // 踢出某一路流
    tokenOptions.askfor_inav_publish = room.paasInavId // 邀请推流/取消邀请推流
    tokenOptions.audit_inav_publish = room.paasInavId // 审核申请上麦
    tokenOptions.apply_inav_publish = room.paasInavId // 申请上麦
  }
  // 嘉宾特有权限
  if (identity === INAV_IDENTITY.guest) {
    tokenOptions.publish_inav_stream = room.paasInavId // 推流
    tokenOptions.kick_inav = room.paasInavId // 踢人
    tokenOptions.apply_inav_publish = room.paasInavId // 申请上麦
  }

  // 在使用文档演示SDK获取access_token时需要
  tokenOptions.operate_document = room.paasImId // 文档
  tokenOptions.chat = room.paasImId // 聊天
  tokenOptions.third_party_user_id = accountId
  // 最终向paas平台申请一个token
  try {
    token = await req.server.methods.paas.createPaasToken(tokenOptions)
  } catch (e) {
    return Boom.serverUnavailable('生成token失败：' + e.message)
  }

  try {
    // 设置用户info
    await req.server.methods.paas.setChannelUserInfo(accountId, username, DEFAULT_AVATAR)
  } catch (e) {
    return Boom.serverUnavailable('设置用户info失败：' + e.message)
  }
  const user = { avatar: '', username: username, userId: accountId, token, identity }
  req.server.methods.room.setRoomUser(roomId, user).catch(() => null)
  req.server.methods.room.setRoomUserIdOfNameAndIdentity(roomId, user.userId, user.identity, user.username).catch(() => null)

  const liveStartAt = await req.server.methods.room.getRoomValue(roomId, 'live_start_at')

  const $room = { ...room, appId: room.appId || req.server.app.paas.appId, liveStartAt }
  return h.jdata({ room: $room, user })
    .state('roomId', `${roomId}`, { isHttpOnly: false, isSecure: false, isSameSite: 'Lax', path: '/' })
}

// 在线用户列表
exports.onlineUser = async (req, h) => {
  const roomId = req.query.roomId || req.state.roomId
  if (!roomId) return Boom.badRequest('roomId错误')
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 500)
  const page = _.clamp(_.toSafeInteger(req.query.page), 1, Number.MAX_SAFE_INTEGER)

  let room
  try {
    room = await req.server.methods.room.getRoom(roomId)
  } catch (e) {
    return Boom.serverUnavailable('获取房间出错：' + e.message)
  }
  if (!room) return Boom.badRequest('互动房间不存在')
  const channelId = room.paasImId
  let data
  try {
    data = await req.server.methods.paas.getImOnlineUser(channelId, page, limit)
    if (!data) return h.jlist([], 0, 0, 0)
  } catch (e) {
    return Boom.serverUnavailable('获取用户列表出错：' + e.message)
  }

  const disableUsers = new Set(data.disable_users)
  const total = data.total
  const list = []
  // const list = data.list
  for (const [userId, ctx] of Object.entries(data.context)) {
    const u = safeParse(ctx) || {}
    list.push({
      userId: userId,
      identity: u.identity || INAV_IDENTITY.player,
      nickName: u.nick_name || u.nickName || '',
      avatar: u.avatar || '',
      isImDisable: disableUsers.has(userId),
    })
  }

  return h.jlist(list, page, total, page + 1)
}

// 让用户下麦 (您应该自己检查权限)
exports.invaStreamDown = async (req, h) => {
  const { roomId, targetId, userId, identity } = req.payload
  if (!roomId) return Boom.badRequest('互动房间没有指定')
  let room = await req.server.methods.room.getRoom(roomId)
  if (!room) return Boom.badRequest('互动房间不存在')

  try {
    // 发送自定义消息，通知客户端被下线
    const msg = { type: 'inva_stream_down', roomId, targetId, identity }
    await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: userId })
  } catch (e) {
    return Boom.serverUnavailable('发送指令失败：' + e.message)
  }

  return h.jdata({})
}

// 被踢出用户列表
exports.roomKickList = async (req, h) => {
  const roomId = req.query.roomId || req.state.roomId
  if (!roomId) return Boom.badRequest('roomId错误')
  let ids = []

  const room = await req.server.methods.room.getRoom(roomId)
  if (!room) return Boom.badRequest('互动房间不存在')
  try {
    ids = await req.server.methods.paas.getIlsKickList(room.paasInavId)
  } catch (e) {
    return Boom.serverUnavailable('获取列表出错：' + e.message)
  }
  const list = []
  for (const userId of ids) {
    const user = await req.server.methods.room.getRoomUser(roomId, userId).catch(() => null)
    if (user) {
      delete user.token
      const u = Object.assign({ userId }, user)
      if (!u.username) u.username = randomNickname()
      list.push(u)
    }
  }

  return h.jlist(list, 1, list.length, 2)
}

// 踢出用户
exports.kickUser = async (req, h) => {
  const { roomId, userId } = req.payload
  if (!roomId) return Boom.badRequest('互动房间没有指定')
  if (!userId) return Boom.badRequest('用户id没有指定')
  let room = await req.server.methods.room.getRoom(roomId)
  if (!room) return Boom.badRequest('互动房间不存在')

  let $masterId = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
  let masterId = $masterId || room.sid
  let helperId = await req.server.methods.room.getRoomValue(roomId, 'helper_user_id')

  if (userId === masterId || userId === helperId) {
    // why ???
    return h.jdata({})
  }

  await new Promise(resolve => setTimeout(resolve, 500))
  // 发送自定义消息
  const msg = { type: 'kick_inav', targetId: userId, time: Date.now() }
  await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: masterId })

  return h.jdata({})
}

// 取消踢出用户
exports.unkickUser = async (req, h) => {
  const { roomId, userId } = req.payload
  if (!roomId) return Boom.badRequest('互动房间没有指定')
  if (!userId) return Boom.badRequest('用户id没有指定')
  let room = await req.server.methods.room.getRoom(roomId)
  if (!room) return Boom.badRequest('互动房间不存在')

  let $masterId = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
  let masterId = $masterId || room.sid

  // 发送自定义消息
  const msg = { type: 'unkick_inav', targetId: userId, time: Date.now() }
  await req.server.methods.paas.sendMessage(room.paasImId, { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: masterId })

  return h.jdata({})
}

// report
exports.report = async (req, h) => {
  const roomId = req.payload && req.payload.roomId || req.query.roomId
  if (roomId) {
    req.log(['info', 'room', 'report'], Object.assign({}, req.query, req.payload))
  }
  return h.jdata({})
}

// 删除房间 (仅demo管理使用)
exports.roomDelete = async (req, h) => {
  if (!req.payload) return h.jdata({ })
  if (!await demoAuth(req.server.app.paas.secretKey, req.query.time, req.query.sha1)) return h.jdata({ })
  const ids = req.payload.ids
  if (!(Array.isArray(ids) && ids.length)) return Boom.badRequest('roomId错误')
  req.server.methods.task.addTask('room-clean-by-id', 'room-clean', Date.now() + 3000, { done: true, ids })
  return h.jdata({ })
}

// 房间列表 (仅demo管理使用)
exports.roomList = async (req, h) => {
  if (!await demoAuth(req.server.app.paas.secretKey, req.query.time, req.query.sha1)) return h.jlist([], 0, 0, 0)
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page), 1, Number.MAX_SAFE_INTEGER)

  const where = _.pick(req.query, ['sid', 'paasLiveId', 'paasInavId', 'paasImId', 'id'])
  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Rooms.findAndCountAll({ where, order, limit, offset })

  const sids = _.map(rows, 'sid')
  let sessions = {}
  if (sids.length) {
    const rows = await Sessions.findAll({ where: { sid: sids } })
    sessions = _.keyBy(rows, 'sid')
  }

  const rooms = []
  for (const row of rows) {
    const room = row.toJSON()
    room.session = sessions[room.sid] && sessions[room.sid].toJSON()
    rooms.push(room)
  }

  return h.jlist(rooms, page, count, page + 1)
}

// 房间列表 (仅demo管理使用)
exports.roomLivein = async (req, h) => {
  let rooms = []
  if (!await demoAuth(req.server.app.paas.secretKey, req.query.time, req.query.sha1)) return h.jlist([], 0, 0, 0)

  const paasLiveIds = await req.server.methods.paas.getLssLssPushing()
  if (Array.isArray(paasLiveIds) && paasLiveIds.length) {
    const lists = await Rooms.findAll({ where: { paasLiveId: paasLiveIds } })

    const sids = _.map(lists, 'sid')
    let sessions = {}
    if (sids.length) {
      const rows = await Sessions.findAll({ where: { sid: sids } })
      sessions = _.keyBy(rows, 'sid')
    }

    for (const row of lists) {
      const room = row.toJSON()
      room.session = sessions[room.sid] && sessions[room.sid].toJSON()
      rooms.push(room)
    }
  }
  return h.jlist(rooms, 0, rooms.length, 0)
}
