const _ = require('lodash')
const utils = require('../utils')
const { Rooms, Vods } = require('../models')

// 删除房间 (仅demo管理使用)
exports.roomDelete = async (req, h) => {
  /* @register method:post */
  if (!req.payload) return h.jdata({})
  const ids = req.payload.ids
  if (!(Array.isArray(ids) && ids.length)) return h.fail('roomId错误')
  for (const roomId of ids) {
    await req.server.methods.room.roomAdminTryDelete(roomId)
  }
  return h.jdata({})
}

exports.vodDelete = async (req, h) => {
  /* @register method:post */
  if (!req.payload) return h.jdata({})
  const ids = req.payload.ids
  if (!(Array.isArray(ids) && ids.length)) return h.fail('roomId错误')
  await Vods.destroy({ where: { id: ids } })
  return h.jdata({})
}

exports.vodCreate = async (req, h) => {
  /* @register method:post */
  if (!req.payload) return h.jdata({})
  delete req.payload.id
  if (!req.payload.roomId) req.payload.roomId = utils.flakeId()
  const vod = Vods.build(req.payload)
  if (req.payload.ext) vod.set('ext', JSON.stringify(req.payload.ext))
  await vod.save()
  return h.jdata({})
}

exports.cleanRoomData = async (req, h) => {
  /* @register method:post */
  if (!req.payload) return h.jdata({})
  const roomId = req.payload.roomId
  const type = req.payload.type
  if (!roomId) return h.fail('roomId错误')

  req.server.methods.room.cleanRoomData(roomId, type)
  return h.jdata({})
}

// 房间列表 (仅demo管理使用)
exports.roomList = async (req, h) => {
  /* @register method:get */
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page), 1, Number.MAX_SAFE_INTEGER)

  const where = _.pick(req.query, ['paasLiveId', 'paasInavId', 'paasImId', 'id'])
  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Rooms.findAndCountAll({ where, order, limit, offset })

  const rooms = []
  for (const row of rows) {
    const room = row.toJSON()
    rooms.push(room)
  }

  return h.jlist(rooms, page, count, page + 1)
}

// 回放列表 (仅demo管理使用)
exports.vodList = async (req, h) => {
  /* @register method:get */
  const limit = _.clamp(_.toSafeInteger(req.query.limit || '10'), 1, 50)
  const page = _.clamp(_.toSafeInteger(req.query.page), 1, Number.MAX_SAFE_INTEGER)

  const where = _.pick(req.query, ['paasLiveId', 'roomId'])
  const offset = limit * (page - 1)
  const order = [['id', 'desc']]
  const { rows, count } = await Vods.findAndCountAll({ where, order, limit, offset })

  const rooms = []
  for (const row of rows) {
    const room = row.toJSON()
    rooms.push(room)
  }

  return h.jlist(rooms, page, count, page + 1)
}

// 房间列表 (仅demo管理使用)
exports.roomLivein = async (req, h) => {
  /* @register method:get */
  let rooms = []

  const paasLiveIds = await req.server.methods.paas.getLssLssPushing()
  if (Array.isArray(paasLiveIds) && paasLiveIds.length) {
    const lists = await Rooms.findAll({ where: { paasLiveId: paasLiveIds } })

    for (const row of lists) {
      const room = row.toJSON()
      rooms.push(room)
    }
  }
  return h.jlist(rooms, 0, rooms.length, 0)
}

// 房间状态
exports.roomStat = async (req, h) => {
  /* @register method:get */
  const roomId = req.query.roomId
  const room = await req.server.methods.room.getRoomInfo(roomId, { noCache: true })
  if (!room) return h.jdata()
  const data = {
    appId: room && room.appId || null,
    roomId: roomId,
    title: room && room.title || null,
    paasImId: room && room.paasImId || null,
    paasInavId	: room && room.paasInavId	 || null,
    paasLiveId: room && room.paasLiveId || null,
    status: room && room.status || null,
    liveStartAt: room && room.liveStartAt || null,
    masterId: room && room.masterId || null,
    helperId: room && room.helperId || null,
    ilsStatus: '',
    lssStatus: '',
    lssStartAt: '',
    lssEndAt: '',
    ilsStreams: [],
    accounts: [],
    ilsUsers: [],
  }

  const [imUsers, ilsUsers, ilsStreams, ilsStatus, lssStreamStatus] = await Promise.all([
    req.server.methods.paas.getImOnlineUser(room.paasImId, 1, 100).then(rs => rs.list, () => []),
    req.server.methods.paas.getIlsUsers(room.paasInavId).catch(() => []),
    req.server.methods.paas.getIlsStreams(room.paasInavId).catch(() => []),
    req.server.methods.paas.getIlsStatus(room.paasInavId).catch(() => []),
    req.server.methods.paas.getLssStreamStatus(room.paasLiveId).catch(() => null)
  ])

  // 仅标识是否有互动流，非旁路
  // 当前状态 0 无流 1 推流中
  data.ilsStatus = Number(ilsStatus) === 0 ? '无推流' : Number(ilsStatus) === 1 ? '推流中' :  `${ilsStatus}`

  if (lssStreamStatus) {
    const status = lssStreamStatus.streamStatus
    data.lssStatus = status === 1 ? '推流中' : status === 2 ? '未推流或推流结束' : status.toString()
    data.lssStartAt = lssStreamStatus.pushTime
    data.lssEndAt = lssStreamStatus.endTime
  }

  // 在线用户
  const accounts = {}
  for (const item of imUsers) accounts[item.accountId] = Object.assign(item, { invaStatus: '', streamId: '', imBlock: false, inavBlock: false })

  const ilsStreamsSet = {}
  // 互动房间用户列表
  for (const item of ilsUsers) {
    const accountId = item.accountId
    if (!accounts[accountId]) accounts[accountId] = {}
    // status: 1 推流中 2 观看中 3 受邀中 4 申请中
    const status = ({ 1: '推流中', 2: '观看中', 3: '受邀中', 4: '申请中' })[item.status] || item.status
    if (accounts) accounts[accountId].invaStatus = status
    else accounts[accountId] = { accountId, invaStatus: status }
    data.ilsStreams.push(accounts[accountId])
    ilsStreamsSet[accountId] = 1
  }

  // 互动流列表
  for (const item of ilsStreams) {
    const accountId = item.accountId
    const streamId= item.streamId
    if (!accounts[accountId]) accounts[accountId] = { accountId }
    if (accounts) accounts[accountId].streamId = streamId
    else accounts[accountId] = { accountId, streamId }
    if (!ilsStreamsSet[accountId]) data.ilsStreams.push(accounts[accountId])
  }

  data.accounts = Object.values(accounts)
  return h.jdata(data)
}
