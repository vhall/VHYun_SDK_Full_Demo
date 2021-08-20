'use strict'
const _ = require('lodash')
const { Op } = require('sequelize')
const { Rooms, Vods } = require('../models')
const { SPECIAL_ACCOUNT_ID, flakeId } = require('../utils')
const internals = {}
const oneDay = 1000 * 3600 * 24
const ROOM_VISIBLE_TIME = oneDay * 7
const MAX_LIST_LENGTH = 1000
const MAX_LIST_FORM_LENGTH = 15
const MAX_MEMBER = 6

const ROOM_EVENTS = {
  // 观众上麦申请
  REQUEST: 'vrtc_connect_apply',
  REQUEST_CALLBACK: 'vrtc_connect_agree',
  REQUEST_CALLBACK_AGREE: 'vrtc_connect_agree',
  REQUEST_CALLBACK_REJECT: 'vrtc_connect_refused',
  // 邀请上麦
  INVITER: 'vrtc_connect_invite',
  INVITER_CALLBACK_AGREE: 'vrtc_connect_invite_agree',
  INVITER_CALLBACK_REJECT: 'vrtc_connect_invite_refused',
  // 麦克风/摄像头
  CLOSE_MIC: 'vrtc_mute',
  CLOSE_MIC_ALL: 'vrtc_mute_all',
  OPEN_MIC: 'vrtc_mute_cancel',
  OPEN_MIC_ALL: 'vrtc_mute_all_cancel',
  CLOSE_CAMERA: 'vrtc_frames_forbid',
  CLOSE_CAMERA_ALL: 'vrtc_frames_forbid_all',
  OPEN_CAMERA: 'vrtc_frames_forbid_cancel',
  OPEN_CAMERA_ALL: 'vrtc_frames_forbid_cancel_all',
  // 被下麦
  DOWN: 'vrtc_disconnect_handle',
  DOWN_ALL: 'vrtc_disconnect_handle_all',
  // 房间
  KICK: 'room_kickout',
  UNKICK: 'room_kickout_cancel',
  MUTE: 'room_mute',
  MUTE_ALL: 'room_mute_all',
  UNMUTE: 'room_mute_cancel',
  UNMUTE_ALL: 'room_mute_all_cancel',
  TIP_TEXT: 'room_tip_text',
  SEND_FORM: 'questionnaire_push',
  LIVE_START: 'live_start',
  LIVE_STOP: 'live_over',
  LIVE_START_ANOTHER: 'live_broadcast_start',
  LIVE_STOP_ANOTHER: 'live_broadcast_stop',
  RESOURCE_CHANGE: 'room_resource_change'
}

const room = {
  async _getRoomData(roomId){
    if (!roomId) return null
    roomId = '' + roomId
    let room = await internals._cacheRoom.get(roomId)
    if (room) return room
    const $room = await Rooms.findByPk(roomId, {})
    if (!$room) return
    room = $room.toJSON()
    room.roomId = room.id
    internals._cacheRoom.set(roomId, room)
    return room
  },
  async _getRoomDataNoCache(roomId){
    if (!roomId) return null
    roomId = '' + roomId
    const $room = await Rooms.findByPk(roomId, {})
    if (!$room) return null
    return $room.toJSON()
  },
  async _getRoomVodData(roomId){
    if (!roomId) return null
    roomId = '' + roomId
    let vod = await internals._cacheRoomVod.get(roomId)
    if (vod) return vod
    const vods = await Vods.findAll({ where: { roomId }, order: [['updated_at', 'desc']], limit: 3 })
    if (!vods[0]) return
    vod = vods[0].toJSON()
    internals._cacheRoomVod.set(roomId, vod)
    return vod
  },
  async _getRoomInfoData(roomId){
    if (!roomId) return null
    roomId = '' + roomId
    const $info = await internals._cacheRoomInfo.get(roomId)
    const info = {
      status: 1,
      vod: 0,
      liveStartAt: 0,
      liveEndAt: 0,
      masterId: null,
      helperId: null
    }
    return Object.assign(info, $info)
  },
  // 清理room的缓存数据
  async clearRoomAllCacheData(roomId){
    if (!roomId) return
    await internals._cacheRoom.drop(roomId)
    await internals._cacheRoomInfo.drop(roomId)
    await internals._cacheKick.drop(roomId)
    await internals._cacheInav.drop(roomId)
    await internals._cacheInav2.drop(roomId)
    await internals._cacheForm.drop(roomId)
    await internals._cacheUserEnter.drop(roomId)
  },
  async cleanRoomData(roomId, type){
    if (!roomId) return
    const types = (type || '').split(',')
    if (!types) return internals.clearRoomAllCacheData(roomId)
    for (const type1 of types) types[type1] = 1
    if (types.room) await internals._cacheRoom.drop(roomId)
    if (types.info) await internals._cacheRoomInfo.drop(roomId)
    if (types.kick) await internals._cacheKick.drop(roomId)
    if (types.inav) await internals._cacheInav.drop(roomId)
    if (types.inav2) await internals._cacheInav2.drop(roomId)
    if (types.form) await internals._cacheForm.drop(roomId)
    if (types.vod) await internals._cacheRoomVod.drop(roomId)
    if (types.enter) await internals._cacheUserEnter.drop(roomId)
  },
  // 创建一个全新的room
  async createNewRoom(preSave, appId, type, title, sid){
    const maxMember = MAX_MEMBER
    // 创建推流id
    const paasLiveId = await internals._methods.paas.createLss()
    // 创建聊天id
    const paasImId = await internals._methods.paas.createChannel()
    // 创建互动id
    const paasInavId = await internals._methods.paas.createIls()
    // record
    const record = { id: flakeId(), sid, appId, paasLiveId, paasImId, paasInavId, title: title || '', maxMember: maxMember, lastUse: null }
    // pre save
    if (preSave) await preSave(record)
    // 保存房间信息到数据库
    await Rooms.create(record)
    try {
      await internals._cacheTitle2Room.set(record.title, record.id)
      await internals._cachePaasId2Room.set('paasLiveId.' + record.paasLiveId, record.id)
      await internals._cachePaasId2Room.set('paasImId.' + record.paasImId, record.id)
      await internals._cachePaasId2Room.set('paasInavId.' + record.paasInavId, record.id)
    } catch (orz) {
    }
    // info
    return this.getRoomInfo(record.id)
  },
  async getRoom(roomId){
    return this._getRoomData(roomId)
  },
  async getRoomInfo(roomId, opt){
    let room
    if (opt && opt.noCache) room = await this._getRoomDataNoCache(roomId)
    else room = await this._getRoomData(roomId)
    if (!room) return null
    const info = await this._getRoomInfoData(roomId)
    return Object.assign(room, info)
  },
  async getRoomIdByTitle(title, visibleAll){
    if (!title) return null
    // 用房间id做title的情况（不管任何时间，都查出来）
    if (typeof title === 'number' || (/^\d+$/).test(title)) {
      const room = await this._getRoomData(title)
      if (room) return room.id
    }

    // 只cache很短时间
    const roomId0 = await internals._cacheTitle2Room.get(title)
    if (roomId0) {
      const rs = await this._getRoomData(roomId0)
      if (rs) return roomId0
    }

    // 只能看见最近一周创建的直播间
    const now = new Date()
    const sub = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const lastWeek = now.getTime() - (sub * 1000) - ROOM_VISIBLE_TIME
    const where = { title, createdAt: { [Op.between]: [new Date(lastWeek), now] } }
    if (visibleAll) delete where.createdAt
    const room = await Rooms.findOne({ where, attributes: ['id'] })
    if (room) return room.id
    return null
  },
  async getRoomIdByPaasId(key, paasId){
    let roomId
    if (['paasLiveId', 'paasImId', 'paasInavId'].indexOf(key) < 0) throw new Error('key error')
    roomId = await internals._cachePaasId2Room.get(key + '.' + paasId)
    if (roomId) return roomId
    const room = await Rooms.findOne({ where: { [key]: paasId }, attributes: ['id'] })
    return room && room.id
  },
  async getChannelIdOfRoomId(roomId){
    const info = await this._getRoomData(roomId)
    return info && info.paasImId
  },
  async setRoomMaster(roomId, accountId){
    if (!accountId) return
    if (!roomId) return
    roomId = '' + roomId
    const info = await this._getRoomInfoData(roomId)
    info.masterId = accountId
    await internals._cacheRoomInfo.set(roomId, info)
  },
  async setRoomHelper(roomId, accountId){
    if (!accountId) return
    if (!roomId) return
    roomId = '' + roomId
    const info = await this._getRoomInfoData(roomId)
    info.helperId = accountId
    await internals._cacheRoomInfo.set(roomId, info)
  },
  async setRoomLiveStat(roomId, stat, time){
    if (!stat) return
    if (!roomId) return
    roomId = '' + roomId
    const info = await this._getRoomInfoData(roomId)
    const origin = Object.assign({}, info)
    // status: 1未开播 2准备中 3直播中 4已结束
    // vod:  1直播未开始/结束 2录播生成中 3已生成录播
    if (stat === 1) {
      info.status = stat
      info.liveStartAt = 0
      info.liveEndAt = 0
      info.vod = 1
    } else if (stat === 2) {
      info.status = stat
      info.liveStartAt = 0
      info.liveEndAt = 0
      info.vod = 1
    } else if (stat === 3) {
      info.status = stat
      info.liveStartAt = time || Date.now()
      info.liveEndAt = 0
      info.vod = 1
    } else if (stat === 4) {
      info.status = stat
      info.liveEndAt = time || Date.now()
      info.vod = 2 // 录播生成中
    }
    await internals._cacheRoomInfo.set(roomId, info)
    return origin
  },
  async setRoomVodStat(roomId, stat, time){
    if (!stat) return
    if (!roomId) return
    roomId = '' + roomId
    const info = await this._getRoomInfoData(roomId)
    const origin = Object.assign({}, info)
    // status: 1未开播 2准备中 3直播中 4已结束
    // vod:  1直播未开始/结束 2录播生成中 3已生成录播
    info.status = 4 // 已结束
    info.vod = stat
    await internals._cacheRoomInfo.set(roomId, info)
    return origin
  },
  async destroyRoom(roomId, force){
    const room = this.getRoom(roomId)
    if (!room) return
    await Rooms.destroy({ where: { id: roomId }, force: !!force })
    await this.clearRoomAllCacheData(roomId)
  },
  // 录播
  async getRoomVod(roomId){
    const vod = await this._getRoomVodData(roomId)
    if (!vod) return null

    // 点播不与直播公用im
    if (!vod.paasImId) {
      // 创建聊天id
      const paasImId = await internals._methods.paas.createChannel()
      await Vods.update({ paasImId }, { where: { id: vod.id } })
      vod.paasImId = paasImId
      await internals._cacheRoomVod.set('' + roomId, vod)
    }

    return vod
  },
  async clearRoomVod(roomId){
    await internals._cacheRoomVod.drop(roomId)
  },
  async roomAdminTryDelete(roomId){
    const room = await internals._getRoomDataNoCache(roomId)
    if (!room) return
    if (room.paasInavId) {
      const status = await internals._methods.paas.getIlsStatus(room.paasInavId).catch(e => null)
      // 这个房间正在推流中，跳过，不删除房间
      if (status === 1) return
    }

    // 删除
    await internals.destroyRoom(roomId, true)
    if (room.paasLiveId) internals._methods.paas.deleteIls(room.paasLiveId).catch(() => null)
    if (room.paasInavId) internals._methods.paas.deleteLss(room.paasInavId).catch(() => null)
    return true
  }
}

// 以下操作仅供参考，并非严谨
// 真实环境中可能会遇到高并发，导致丢数据
const roomInav = {
  // 直播间已发布表单列表
  async formList(roomId){
    const rs = await internals._cacheForm.get(roomId)
    const list = []
    for (const r of Array.isArray(rs) ? rs : []) {
      if (r && r.id) list.push(r)
    }
    return list
  },
  // 发布表单
  async formPub(roomId, id, formId, title){
    let list = await this.formList(roomId)
    list = list.filter(i => !(i.id === id))
    list.push({ id, formId, title, opTime: Date.now() })
    if (list.length > MAX_LIST_FORM_LENGTH) list = list.slice(list.length - MAX_LIST_FORM_LENGTH)
    await internals._cacheForm.set(roomId, list)
  },
  // 1邀请/2申请上麦用户列表
  async inavLists(roomId){
    const rs = await internals._cacheInav.get(roomId)
    const list = []
    for (const r of Array.isArray(rs) ? rs : []) {
      if (!(r && r.accountId && r.type)) continue
      // 邀请超时，则移除
      if (r.type === 2 && Date.now() - r.time > 1000 * 20) continue
      if (r && r.accountId) list.push(r)
    }
    return list
  },
  // 1邀请/2申请上麦
  async inavListAdd(roomId, type, accountId, identity, nickName){
    // 仅记录申请，不记录邀请
    // if (type !== 1) return
    const list = await this.inavLists(roomId)
    let filters = list.filter(item => !(item.accountId === accountId && item.type === type))
    if (filters.length > MAX_LIST_LENGTH) filters = filters.slice(list.length - MAX_LIST_LENGTH)
    filters.push({
      accountId: accountId,
      type: type,
      time: Date.now(),
      identity: identity,
      nickName: nickName
    })
    await internals._cacheInav.set(roomId, filters)
  },
  // 在申请列表中
  async hasInavList(roomId, type, accountId){
    const list = await this.inavLists(roomId)
    return list.filter(item => item.accountId === accountId && item.type === type)[0]
  },
  // 同意/拒绝 邀请/申请上麦
  async inavListDel(roomId, type, accountId){
    // 仅记录申请，不记录邀请
    // if (type !== 1) return
    const list = await this.inavLists(roomId)
    const filters = list.filter(item => !(item.accountId === accountId && item.type === type))
    if (list.length === filters.length) return
    await internals._cacheInav.set(roomId, filters)
  },
  // 被同意/被邀请的用户列表
  async inavList2List(roomId){
    const rs = await internals._cacheInav2.get(roomId)
    const list = []
    for (const r of Array.isArray(rs) ? rs : []) {
      if (r && r.accountId) list.push(r)
    }
    return list
  },
  async hasInavList2(roomId, accountId){
    const list = await this.inavList2List(roomId)
    return list.filter(item => item.accountId === accountId)[0]
  },
  async inavList2Add(roomId, type, accountId, identity, nickName){
    // type: 1申请 2邀请
    const list = await this.inavList2List(roomId)
    let filters = list.filter(item => item.accountId === accountId)
    if (filters.length > MAX_LIST_LENGTH) filters = filters.slice(filters.length - MAX_LIST_LENGTH)
    filters.push({
      accountId: accountId,
      type: type,
      time: Date.now(),
      identity: identity,
      nickName: nickName
    })
    await internals._cacheInav2.set(roomId, filters)
  },
  async removeInavList2(roomId, accountId){
    const list = await this.inavList2List(roomId)
    const filter = list.filter(item => item.accountId !== accountId)
    if (list.length === filter.length) return
    await internals._cacheInav2.set(roomId, filter)
  },
  // 被踢出用户列表
  async kickAccounts(roomId){
    const rs = await internals._cacheKick.get(roomId)
    const list = []
    for (const r of Array.isArray(rs) ? rs : []) {
      if (r && r.accountId) list.push(r)
    }
    return list
  },
  // 是否是被踢出用户
  async isKickUser(roomId, accountId){
    const list = await this.kickAccounts(roomId)
    return list.filter(item => item.accountId === accountId)[0]
  },
  // 加入被踢出用户
  async kickAccountAdd(roomId, user, opAccountId, opIdentity){
    let list = await this.kickAccounts(roomId)
    const hasAccount = list.some(item => item.accountId === user.accountId)
    if (hasAccount) return
    if (list.length > MAX_LIST_LENGTH) list = list.slice(list.length - MAX_LIST_LENGTH)
    list.push({
      accountId: user.accountId,
      nickName: user.nickName,
      identity: user.identity,
      opTime: Date.now(),
      opAccount: opAccountId,
      opIdentity: opIdentity
    })
    await internals._cacheKick.set(roomId, list)
  },
  // 删除被踢出用户
  async kickAccountDel(roomId, accountId){
    const list = await this.kickAccounts(roomId)
    const filters = list.filter(item => !(item.accountId === accountId))
    if (list.length === filters.length) return
    await internals._cacheKick.set(roomId, filters)
  },
  // 资源更新通知
  async resourceChange(roomId, userId, resource, change, data){
    const body = { ...data, type: ROOM_EVENTS.RESOURCE_CHANGE, targetId: SPECIAL_ACCOUNT_ID.MANGLE, resource, change }
    body.sourceId = userId || SPECIAL_ACCOUNT_ID.SYSTEM
    const paasImId = await room.getChannelIdOfRoomId(roomId)
    await internals._methods.paas.sendCustomMessage(paasImId, userId || null, null, body).catch(() => null)
  },
  // 用户答题的题目列表
  async getFormAnswer(roomId, accountId){
    const cacheKey = [roomId, accountId].join('.')
    const rs = await internals._cacheUserAnswer.get(cacheKey)
    const list = []
    for (const r of Array.isArray(rs) ? rs : []) if (r) list.push(r)
    return list
  },
  // 用户是否答过此题
  async hasFormAnswer(roomId, accountId, id){
    const list = await this.getFormAnswer(roomId, accountId)
    return list.filter(item => item.id === id)[0]
  },
  // 设置用户答过此题
  async saveFormAnswer(roomId, accountId, id, formId, client, answerId){
    const cacheKey = [roomId, accountId].join('.')
    let list = await this.getFormAnswer(roomId, accountId)
    list = list.filter(i => i.id !== id)
    list.push({
      accountId,
      id,
      formId,
      client,
      answerId
    })
    await internals._cacheUserAnswer.set(cacheKey, list)
  },
  // 直播间用户列表，非在线用户列表
  async listRoomEnterUser(roomId){
    const list = await internals._cacheUserEnter.get(roomId)
    if (!Array.isArray(list)) return []
    return list
  },
  // 保存用户
  async saveRoomEnterUser(roomId, user){
    const accounts = await this.listRoomEnterUser(roomId)
    const accountId = user.accountId
    const filters = accounts.filter(item => item.accountId !== accountId)
    filters.push(user)
    await internals._cacheUserEnter.set(roomId, filters)
  }
}

exports.ROOM_EVENTS = ROOM_EVENTS
exports.plugin = {
  pkg: { name: 'room-method' },
  register: async function (server, options){
    internals._methods = server.methods
    internals._cacheKick = server.cache({ segment: 'inva.kick', expiresIn: oneDay * 10 })
    internals._cacheInav = server.cache({ segment: 'inva.inav', expiresIn: oneDay })
    internals._cacheInav2 = server.cache({ segment: 'inva.allow', expiresIn: oneDay })
    internals._cacheForm = server.cache({ segment: 'inva.form', expiresIn: oneDay * 3 })
    internals._cacheUserEnter = server.cache({ segment: 'inva.user.enter', expiresIn: oneDay * 7 })
    internals._cacheUserAnswer = server.cache({ segment: 'inva.user.answer', expiresIn: oneDay * 7 })
    internals._cacheRoom = server.cache({ segment: 'room', expiresIn: oneDay * 10 })
    internals._cacheRoomVod = server.cache({ segment: 'vod', expiresIn: oneDay * 10 })
    internals._cacheRoomInfo = server.cache({ segment: 'room.info', expiresIn: oneDay * 3 })
    internals._cacheTitle2Room = server.cache({ segment: 'room.title2room', expiresIn: oneDay * 3 })
    internals._cachePaasId2Room = server.cache({ segment: 'room.paasid2room', expiresIn: oneDay * 3 })

    for (const method of _.keys(room)) {
      if (typeof room[method] !== 'function') continue
      internals[method] = room[method]
      server.method('room.' + method, room[method], {})
    }

    for (const method of _.keys(roomInav)) {
      if (typeof roomInav[method] !== 'function') continue
      internals[method] = roomInav[method]
      server.method('room.' + method, roomInav[method], {})
    }
  }
}
