'use strict'
const _ = require('lodash')
const utils = require('../utils')
const room = require('../plugins/room')

// 检测状态并发送开始旁路
async function liveBroadcastStartEmit(req, roomId, paasImId) {
  let rs
  await utils.wait(1000 * 6)
  // 检查旁路
  rs = await req.server.methods.tinyCache.getTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
  // 已经在backend里面发过了
  if (rs) return

  await utils.wait(1000 * 15)
  // 检查旁路
  rs = await req.server.methods.tinyCache.getTinyCache('live_broadcast_start.'+ roomId, Date.now()).catch(() => null)
  // 已经在backend里面发过了
  if (rs) return

  // 检查流是否在线 1推流中 2未推流或推流结束
  const rs0 = await req.server.methods.paas.getLssStreamStatus(roomId)
  const status = parseInt(rs0.streamStatus)
  if (status !== 1) req.server.log('info', `[${roomId}] Lss Stream is stop`)

  // 发送自定义消息，开始旁路
  const b = { type: 'live_broadcast_start', roomId, sourceId: utils.SPECIAL_ACCOUNT_ID.MASTER, targetId: utils.SPECIAL_ACCOUNT_ID.EVERYONE }
  const body = { ...b, time: Date.now() }
  await req.server.methods.paas.sendCustomMessage(paasImId, utils.SPECIAL_ACCOUNT_ID.SYSTEM, null, body).catch(() => null)
}

// 生成一个sid
exports.token = async (req, h) => {
  /* @register method:get auth:false */
  const token = req.user.token
  if (req.query.type === 'script') return h.response(`document.cookie='sid=${token};'`).type('application/javascript')
  return h.jdata({ token })
}

// 伪登陆
exports.login = async (req, h) => {
  /* @register method:post auth:false */
  const nickName = req.payload.nickName || utils.randomNickname()
  if (_.size(nickName) > 20) return h.fail('您的名称过长')
  let token = req.user.token || utils.randomId()
  let accountId = await req.user.getAccountIdByName(nickName)
  if (!accountId) {
    accountId = utils.flakeId().split('').reverse().join('')
    await req.user.saveAccountId(token, { accountId, nickName })
  }
  if (!req.user.accountId) {
    await req.user.saveAccountId(token, { accountId, nickName })
    setTimeout(() => req.user.saveSession().catch(() => null))
  }

  // check admin
  if (req.payload.sign && req.payload.time) {
    const rs = await utils.demoAuth(req.server.app.paas.appId, req.server.app.paas.secretKey, req.payload.time, req.payload.sign)
    if (!rs) return h.jdata({ auth: 0 })
    await req.user.saveAdminId(token, { accountId, nickName, isAdmin: true })
    return h.jdata({ auth: 1, accountId, token, nickName })
  }
  // 注意：同一个直播间两个AccountId不能同时拥有两个身份
  // const option = { path: '/', ttl: null }
  return h.jdata({ accountId, token, nickName }) // .state('token', token, option)
}

// 根据title或roomId获取互动房间信息
exports.info = async (req, h) => {
  /* @register auth:false */
  let roomId = req.query.roomId
  const title = req.query.title
  const isVod = req.query.isVod
  if (!(roomId || title)) return h.fail('参数错误，无法取得互动房间信息')
  let info
  let vod

  // 直播
  if (!isVod || isVod === '0' || isVod === 'false') {
    // 根据roomId取得互动房间信息
    if (title && !roomId) roomId = await req.server.methods.room.getRoomIdByTitle(title, false)
    info = await req.server.methods.room.getRoomInfo(roomId)
    if (!info) return h.jdata({ roomId: '', title, randomNickname: utils.randomNickname(), status: 0, vod: 1  })
    // 直播已结束
    if (info.status === 4) vod = await req.server.methods.room.getRoomVod(roomId).catch(() => null)

    const status = info.status
    // 录播生成状态： 1直播未开始/结束 2录播生成中/审核中 3已生成录播
    const vodStatus = !vod ? 1 : 3
    const result = { roomId: info.id, title: info.title, randomNickname: utils.randomNickname(), status, vod: vodStatus }
    return h.jdata(result)
  }

  // 录播
  do {
    // 首先取录播信息，根据roomId
    if (roomId) vod = await req.server.methods.room.getRoomVod(roomId)
    if (vod) break

    // 纯数字，尝试把这个数字作为roomId获取
    if ((/^\d+$/).test(title)) vod = await req.server.methods.room.getRoomVod(title)
    if (vod) break

    // 然后根据title取录播信息
    if (title) roomId = await req.server.methods.room.getRoomIdByTitle(title, true)
    if (!roomId) return h.fail('录播不存在')

    // 再次取录播信息，根据roomId
    if (roomId) vod = await req.server.methods.room.getRoomVod(roomId)
    if (vod) break

    const result = { roomId: roomId || '', title: title || '', randomNickname: utils.randomNickname(), status: 0, vod: 1 }
    return h.jdata(result)
  } while (false)

  // 录播生成状态： 1直播未开始/结束 2录播生成中/审核中 3已生成录播
  const vodStatus = vod ? 3 : 1
  const result = { roomId: vod && vod.roomId || roomId || '', title: vod && vod.title || title || '', randomNickname: utils.randomNickname(), status: 0, vod: vodStatus }
  return h.jdata(result)
}

// 创建互动房间
exports.create = async (req, h) => {
  /* @register method:post */
  const { title, type } = req.payload || {}
  if (!type) return h.fail('请填写互动房间类型')
  if (!title) return h.fail('请填写互动房间名称')
  if (_.size(title) > 50) return h.fail('互动房间名称过长')
  const accountId = req.user.accountId

  let info
  const findId = await req.server.methods.room.getRoomIdByTitle(title)
  // 房间已存在
  if (findId) {
    info = await req.server.methods.room.getRoomInfo(findId)
    if (info.type !== type) return h.fail('该直播间已作为其他推流类型使用')
    // 1未开播 2准备中 3直播中 4已结束
    if (info.status === 3) return h.fail('该直播间名称已被使用')

    if (info.status !== 4) {
      return h.jdata({ roomId: info.id, title: info.title, type: info.type, status: info.status })
    }
  }

  if ((/^\d+$/).test(title)) return h.fail('房间名不允许使用纯数字')
  // 已结束，则销毁旧的并创建一个新的
  if (info && info.status !== 4) await req.server.methods.room.destroyRoom(findId)

  const appId = req.server.app.paas.appId
  const room = await req.server.methods.room.createNewRoom(null, appId, type, title, accountId)

  req.log('info', `创建互动房间, roomId:${room.id} title:${title} accountId:${req.user && req.user.accountId}`)
  const status = room.status
  return h.jdata({ roomId: room.id, title: room.title, type: room.type, status })
}

// 重新开启互动房间
exports.reopen = async (req, h) => {
  /* @register method:post auth:false */
  const { roomId, title } = req.payload || {}
  const findId = await req.server.methods.room.getRoomIdByTitle(roomId || title)
  if (!findId) return h.fail('该直播间不存在')

  const info = await req.server.methods.room.getRoomInfo(findId)
  // 清理直播间数据，重新开播
  await req.server.methods.room.clearRoomAllCacheData(findId)

  req.log('info', `重新开启互动房间, roomId:${roomId} accountId:${req.user && req.user.accountId}`)
  const status = info.status
  return h.jdata({ roomId: info.id, title: info.title, type: info.type, status })
}

// 进入互动房间需要的信息及权限分配
// 注意，这里是demo，如果要在您自己的应用中使用，您需要实现自己的更为准确的权限管理
// 特别需要注意的是，用户的权限是需要和房间进行关连的，即用户在a房间是创建者，在b房间不是
exports.enter = async (req, h) => {
  /* @register method:post */
  const { roomId, identity } = req.payload || {}
  if (!roomId) return h.fail('房间id不能为空')
  if (!utils.INAV_IDENTITY[identity]) return h.fail('身份设置不正确')
  const accountId = req.user.accountId
  const nickName = req.user.nickName || utils.randomNickname()
  let tokenOptions = {}

  const info = await req.server.methods.room.getRoomInfo(roomId)
  if (!info) h.fail('互动房间不存在')
  // status: 1未开播 2准备中 3直播中 4已结束

  req.log('info', `用户进入直播间(pre), roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)

  const pIsOnline = req.server.methods.paas.checkUserOnline(info.paasImId, accountId)
  const pIsMute = req.server.methods.paas.getMuteStat(info.paasImId, accountId).catch(() => null)
  const pOnline = identity === utils.INAV_IDENTITY.guest ? req.server.methods.paas.getImOnlineUser(info.paasImId, 1, 100).catch(() => null): Promise.resolve(null)
  const pIsKick = req.server.methods.room.isKickUser(roomId, accountId)

  // 检查用户是否在黑名单里面（检查互动sdk的黑名单没必要，不需要管互动的黑名单）
  // APP的SDK也切换至新SDK后，黑名单就可以走SDK了，这里暂时自行维护
  const isKick = await pIsKick
  if (isKick) {
    // 如果主持人在黑名单则需要移除他（理论上是不会有的，但是demo数据有可能会混乱）
    if (identity === utils.INAV_IDENTITY.master) await req.server.methods.room.kickAccountDel(roomId, accountId)
    else return h.fail('该用户已被踢出')
  }

  // 主持人检查，主持人只能有一个
  if (identity === utils.INAV_IDENTITY.master) {
    const isOnline = await pIsOnline
    if (isOnline) {
      req.log('warn', `当前账户已在直播间中, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
      return h.fail('当前账户已在直播间中')
    }
    if (info.status === 4) {
      req.log('warn', `该直播间已结束直播, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
      return h.fail('该直播间已结束直播')
    }

    // 尝试从其他人那里夺取直播间支持人（仅demo需要）
    if (info.masterId && info.masterId !== accountId) {
      // 防止两个不同的账户互抢主持人身份
      if (info.status === 2 && (info.lastUse + 1000 * 60) > Date.now()) return h.fail('其他账户已作为主持人在直播间中')
      else if (info.status === 2) {
        const isOnline = await req.server.methods.paas.checkUserOnline(info.paasImId, info.masterId)
        if (isOnline) return h.fail('其他账户已作为主持人在直播间中')
      } else if (info.status === 3) return h.fail('该直播间名称已被使用')
    }
    // 保存主持人
    if (info.masterId !== accountId) await req.server.methods.room.setRoomMaster(roomId, accountId)
    // 已经开播，则不进行转换
    if (info.status !== 3) await req.server.methods.room.setRoomLiveStat(roomId, 2, Date.now())
  }
  // 助理检查，助理只能有一个
  else if (identity === utils.INAV_IDENTITY.helper) {
    // id 是主持人的ID
    if (info.masterId === accountId) {
      req.log('warn', `该账户已作为主持人在直播间中, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
      return h.fail('该账户已作为主持人在直播间中')
    }
    // 存在助理，且与现有助理id冲突
    if (info.helperId && info.helperId !== accountId) {
      // 现有助理是否在线
      const isOnline = await req.server.methods.paas.checkUserOnline(info.paasImId, info.helperId)
      if (isOnline) {
        req.log('warn', `其他账户已作为助理在直播间中, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
        return h.fail('其他账户已作为助理在直播间中')
      }
    }
    // 现在设置新的助理id
    if (info.helperId !== accountId) await req.server.methods.room.setRoomHelper(roomId, accountId)
  } else {
    // 不能与现有的主持人助理账户冲突 (不论在不在线)
    if ((info.helperId && info.helperId === accountId) || (info.masterId && info.masterId === accountId)) {
      req.log('warn', `该账户已作为其他身份在直播间中, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
      return h.fail('该账户已作为其他身份在直播间中')
    }

    // 嘉宾或助理不检查在线冲突
    // 观众和嘉宾（不连接互动）不限制在线数量
    // const isOnline = await pIsOnline
    // if (isOnline) {
    //   req.log('warn', `该账户已作为其他身份在直播间中, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
    //   return h.fail('该账户已作为其他身份在直播间中')
    // }
  }

  // 限制嘉宾在线人数
  if (identity === utils.INAV_IDENTITY.guest) {
    const maxMember = (info.maxMember || 2) - 2
    const rs = await pOnline
    const online = !Array.isArray(rs && rs.list) ? [] : rs.list.map(i => i.identity === utils.INAV_IDENTITY.guest ? i.accountId : null).filter(i => i)
    if (online.length >= maxMember && online.indexOf(accountId) < 0) {
      req.log('warn', `该直播间嘉宾人数超出限制, roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity}`)
      return h.fail('该直播间嘉宾人数超出限制')
    }
  }

  // 禁言状态
  const isMute = await pIsMute

  const room = {
    roomId: info.id,
    title: info.title,
    type: info.type,
    liveStartAt: info.liveStartAt,
    status: info.status,
    isVod: false,
    hasVod: false,
    isMute: !!(isMute && isMute.mute),
    isMuteAll: !!(isMute && isMute.muteAll),
  }
  const sdk = {
    appId: info.appId,
    accountId: accountId,
    nickName: nickName,
    identity: identity,
    paasLiveId: info.paasLiveId,
    paasInavId: info.paasInavId,
    paasImId: info.paasImId,
    recordId: '',
    token: '', // sdk的token
    isVod: false,
  }
  const user = {
    userId: accountId,
    avatar: '',
    accountId,
    nickName,
    identity,
  }

  // 保存用户信息
  await req.server.methods.room.saveRoomEnterUser(roomId, user)

  // 创建paas平台token，参见 http://www.vhallyun.com/docs/show/19
  tokenOptions = Object.assign({}, utils.getTokenOption(identity, info.paasImId, info.paasLiveId, info.paasInavId))
  // 为了demo的简洁性，增加以下权限
  tokenOptions.kick_inav = info.paasInavId // 踢出互动房间/取消踢出互动房间
  tokenOptions.publish_inav_stream = info.paasInavId // 推流(互动流)

  // 最终向paas平台申请一个token
  sdk.token = await req.server.methods.paas.createPaasToken(accountId, tokenOptions)

  req.log('debug', `用户进入直播间(post), roomId:${roomId} accountId:${req.user && req.user.accountId} identity:${identity} token: ${sdk.token} nickName:${user.nickName}`)
  return h.jdata({ room, sdk, user })
}

// 进入点播需要的信息
exports.vod = async (req, h) => {
  /* @register method:post,get auth:true */
  const roomId = req.query.roomId || (req.payload && req.payload.roomId)
  if (!roomId) return h.fail('房间id不能为空')
  const nickName = req.user.nickName || utils.randomNickname()
  let accountId = req.user.accountId || utils.flakeId().split('').reverse().join('')

  const room1 = await req.server.methods.room.getRoom(roomId)
  const vod = await req.server.methods.room.getRoomVod(roomId)

  if (!room1 && !vod) return h.fail('房间不存在')

  // 判断暂未生成回放或回放正在生成
  const room = {
    roomId: roomId,
    title: vod && vod.title || room1.title,
    type: vod && vod.type || 1,
    liveStartAt: 0,
    status: vod ? 3 : 1, // 1直播未开始/结束 2录播生成中 3已生成录播
    isVod: true,
  }
  const sdk = {
    appId: vod && vod.appId || room1.appId,
    accountId: accountId,
    nickName: nickName,
    identity: utils.INAV_IDENTITY.player,
    paasLiveId: vod && vod.paasLiveId || '',
    paasInavId: '',
    recordId: vod && vod.vodId || '',
    paasImId: vod && vod.paasImId || '',
    token: '', // sdk的token
    isVod: true,
    hasVod: true,
  }
  const user = {
    userId: accountId,
    avatar: '',
    accountId,
    nickName,
    identity: utils.INAV_IDENTITY.player,
  }

  // 从ext覆盖
  if (vod && vod.ext && vod.ext.overwrite) {
    Object.assign(sdk, _.pick(vod.ext.overwrite, Object.keys(sdk)))
    Object.assign(user, _.pick(vod.ext.overwrite, Object.keys(user)))
    if(vod.ext.overwrite.accountId) accountId = vod.ext.overwrite.accountId
  }

  // token
  if (!sdk.token && sdk.appId === req.server.app.paas.appId) {
    // 创建paas平台token，参见 http://www.vhallyun.com/docs/show/19
    const tokenOptions = utils.getTokenOption('', sdk.paasImId || '', '', '')
    // 最终向paas平台申请一个token
    sdk.token = await req.server.methods.paas.createPaasToken(accountId, tokenOptions)
  }

  user.accountId = accountId
  user.userId = accountId
  return h.jdata({ room, sdk, user })
}

// 开始推流（旁路）(您应该自己检查权限)
exports.another = async (req, h) => {
  /* @register method:post */
  const { open, maxScreenStream, time } = req.payload
  const roomId = req.payload.roomId || req.query.roomId
  if (!roomId) return h.fail('互动房间没有指定')
  const info = await req.server.methods.room.getRoomInfo(roomId)
  if (!info) return h.fail('互动房间不存在')

  // 判断用户是否有"推流"权限（仅限主持人）
  // if (info.masterId && info.masterId !== req.user.accountId) return h.fail('没有推流权限')

  const dpi = 'BROADCAST_VIDEO_PROFILE_720P_1' // 1280x720 (默认)
  const layout = req.payload.layout || 'CANVAS_LAYOUT_PATTERN_FLOAT_6_5D' // 大屏铺满，一行5个悬浮于下面
  const userId = req.user.accountId

  if (open) {
    req.log('info', `开启旁路推流, roomId:${roomId} accountId:${userId}`)
    try {
      // 启动旁路推流
      await req.server.methods.paas.pushIlsAnother(info.paasInavId, info.paasLiveId, dpi, layout)
    } catch (e) {
      return h.fail('启动旁路推流出错：' + e.message)
    }

    // 设置最大屏占比的流
    if (maxScreenStream) await req.server.methods.paas.setMaxScreenStream(info.paasInavId, maxScreenStream).catch(() => null)
    await req.server.methods.room.setRoomLiveStat(roomId, 3, Date.now())

    // 不是正在直播
    if (info.status !== 3) {
      await utils.wait(100)
      // 发送自定义消息，通知客户端已经开始直播
      const msg = {
        roomId,
        type: room.ROOM_EVENTS.LIVE_START,
        targetId: utils.SPECIAL_ACCOUNT_ID.EVERYONE,
        sourceId: utils.SPECIAL_ACCOUNT_ID.EVERYONE,
        masterId: info.masterId || '',
        identity: utils.INAV_IDENTITY.master,
        deviceType: 0,
        nickName: '',
        avatar: '',
        time: time || Date.now(),
      }
      await req.server.methods.paas.sendCustomMessage(info.paasImId, utils.SPECIAL_ACCOUNT_ID.SYSTEM, null, msg).catch(() => null)
      // 发送开始旁路消息
      liveBroadcastStartEmit(req, roomId, info.paasImId).catch(() => null)
    }
  } else {
    req.log('info', `停止旁路推流, roomId:${roomId}`)
    // 停止旁路推流
    const res = await req.server.methods.paas.pushIlsAnotherStop(info.paasInavId).catch(e => e)
    if (res instanceof Error) {
      // 已关闭
      if (res.data.code !== 60003) {
        req.log('warn', `关闭旁路出错，${res.message}`)
      }
    }
    await req.server.methods.room.setRoomLiveStat(roomId, 4, Date.now())

    // 停顿一下
    await utils.wait(100)
    // 发送自定义消息，通知客户端已经开始直播
    const msg = {
      roomId,
      type: room.ROOM_EVENTS.LIVE_STOP,
      targetId: utils.SPECIAL_ACCOUNT_ID.EVERYONE,
      sourceId: utils.SPECIAL_ACCOUNT_ID.EVERYONE,
      masterId: info.masterId || '',
      identity: utils.INAV_IDENTITY.master,
      deviceType: 0,
      nickName: '',
      avatar: '',
      time: time || Date.now(),
    }
    // { type: 'service_custom', body: JSON.stringify(msg), third_party_user_id: userId }
    await req.server.methods.paas.sendCustomMessage(info.paasImId, utils.SPECIAL_ACCOUNT_ID.SYSTEM, null, msg).catch(() => null)
  }
  return h.jdata({})
}

// 直播中检查
exports.checkLivein = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  if (!roomId) return h.fail('互动房间没有指定')
  const info = await req.server.methods.room.getRoomInfo(roomId)
  if (!info) return h.jdata()
  // if (info.masterId !== req.user.accountId) return h.jdata()

  const [ilsStatus, rs1] = await Promise.all([
    req.server.methods.paas.getIlsStatus(info.paasInavId).catch(() => null),
    req.server.methods.paas.getLssStreamStatus(info.paasLiveId).catch(() => null)
  ])

  // ilsStatus: 0 无流 1 推流中
  // 1 推流中 2 未推流或推流结束
  const streamStatus = rs1.streamStatus
  return h.jdata({ ilsStatus, streamStatus })
}

// 页面卸载检查
exports.unload = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  const event = req.query.event
  if (!roomId) return h.fail('互动房间没有指定')
  const info = await req.server.methods.room.getRoomInfo(roomId)
  if (!info) return h.fail('互动房间不存在')
  if (info.masterId !== req.user.accountId) return h.jdata()

  req.log('info', `页面关闭, roomId:${roomId} accountId:${req.user && req.user.accountId}`)
  await utils.wait(1000 * 10)
  // 关闭页面
  // await new Promise(resolve => setTimeout(resolve, 1000))
  // let $masterId = await req.server.methods.room.getRoomValue(roomId, 'master_user_id')
  // let masterId = $masterId || room.sid
  // const list = await req.server.methods.paas.getIlsUsers(room.paasInavId).catch(e => [])
  // if (Array.isArray(list) && list.length) {
  //   const masterInRoom = list.findIndex(item => item.third_party_user_id === masterId) >= 0
  //   if (masterInRoom) return h.jdata({})
  // }
}

exports.report = async (req, h) => {
  /* @register method:get,post auth:false */
  return h.jdata()
}
