'use strict'
const qs = require('querystring')
const crypto = require('crypto')
const wreck = require('@hapi/wreck')
const FormData = require('form-data')
const bourne = require('@hapi/bourne')
const Boom = require('@hapi/boom')
const _ = require('lodash')

let APP_ID = ''
let SECRET_KEY = ''
let PAAS_BASE = 'https://api.vhallyun.com'

const V32V4_MSG_TYPE = {
  chat: 'service_im',
  document: 'service_document',
  room: 'service_room',
  custom: 'service_custom',
  service_im: 'chat',
  service_document: 'document',
  service_room: 'room',
  service_custom: 'custom'
}

function datetimeFormat (tt) {
  const t = tt instanceof Date ? tt : tt === undefined ? new Date() : new Date(tt)
  const _mon = t.getMonth() + 1 >= 10 ? t.getMonth() + 1 : '0' + (t.getMonth() + 1)
  const _d = _.padStart(t.getDate().toString(), 2, '0')
  const _h = _.padStart(t.getHours().toString(), 2, '0')
  const _m = _.padStart(t.getMinutes().toString(), 2, '0')
  const _s = _.padStart(t.getSeconds().toString(), 2, '0')
  return `${t.getFullYear()}-${_mon}-${_d} ${_h}:${_m}:${_s}`
}

// 请求签名，签名方法见 http://www.vhallyun.com/docs/show/18
function _sign(dict){
  delete dict.sign
  const str = _.flatMap(_.sortBy(_.toPairs(dict), '0')).join('')
  const md5 = crypto.createHash('md5')
  md5.write(SECRET_KEY)
  md5.write(str)
  md5.write(SECRET_KEY)
  return md5.digest('hex')
}

async function _pipe_request(path, payload, query, headers){
  query = query || {}
  query.app_id = APP_ID
  query.signed_at = Math.trunc(Date.now() / 1000)
  query.sign = _sign(query)
  const uri = path + '?' + qs.stringify(query)
  const res = await wreck.post(uri, { headers, timeout: 1000 * 20, baseUrl: PAAS_BASE, payload })
  //  转换为json对象，bourne是JSON.parse的简单包装
  const data = bourne.safeParse(res.payload, { protoAction: 'ignore' })
  if (data) {
    data._res = res.res
    if (data.code && (Number(data.code) !== 200)) {
      const err = new Error(data.msg)
      err.data = data
      throw err
    }
  }
  return data
}

async function _request(path, query){
  if (!query) query = {}
  query.app_id = APP_ID
  query.signed_at = Math.trunc(Date.now() / 1000)
  query.sign = _sign(query)
  const uri = path + '?' + qs.stringify(query)
  const res = await wreck.get(uri, { timeout: 1000 * 20, baseUrl: PAAS_BASE })
  //  转换为json对象，bourne是JSON.parse的简单包装
  const data = bourne.safeParse(res.payload, { protoAction: 'ignore' })
  if (data) {
    // console.log(data.code, path, data.msg, JSON.stringify(query))
    // data._res = res.res_request
    if (data.code && (Number(data.code) !== 200)) {
      const err = new Error(data.msg)
      err.data = data
      throw err
    }
  }
  return data
}

async function _request_post(path, body){
  if (!body) body = {}
  for (const [key, value] of _.toPairs(body)) {
    if (typeof value === 'undefined') body[key] = ''
    else if (typeof value === 'number') body[key] = `${value}`
  }
  body.app_id = APP_ID
  body.signed_at = Math.trunc(Date.now() / 1000)
  body.sign = _sign(body)
  const form = new FormData()
  for (const [key, value] of _.toPairs(body)) {
    if (typeof value === 'undefined' || value === null) continue
    form.append(key, value)
  }
  let res
  try {
    res = await wreck.post(path, {
      timeout: 1000 * 20,
      baseUrl: PAAS_BASE,
      headers: form.getHeaders(),
      payload: form
    })
  } catch (err) {
    err.data = {}
    throw err
  }
  //  转换为json对象，bourne是JSON.parse的简单包装
  const data = bourne.safeParse(res.payload, { protoAction: 'ignore' })
  if (data) {
    // console.log(data.code, path, data.msg, JSON.stringify(body))
    // data._res = res.res
    if (data.code && (Number(data.code) !== 200)) {
      let err = new Error(data.msg)
      if (typeof Boom !== 'undefined') err = new Boom(data.msg, { statusCode: 400, data: {} })
      err.data = data
      if (err.output && err.output.payload) err.output.payload.statusCode = data.code
      throw err
    }
  }
  return data
}

const paasBase = {
  // 创建paas平台token，参见 http://www.vhallyun.com/docs/show/19
  createPaasToken: async (accountId, settings) => {
    const options = {
      third_party_user_id: accountId || '',	// 第三方用户ID是开发者自有用户系统里用户的唯一标识，详见上文。
      expire_time: "" || undefined,	// 过期时间 默认为一天，最大为1天,最小为1秒 格式为: 2017/01/01 00:00:00
      publish_stream: '',	// 在使用直播推流SDK获取access_token时必须传入此参数，参数对应的值为直播房间ID（room_id） (通过直播API下创建直播房间接口获得)
      chat: '',	// 在使用聊天SDK获取access_token时必须传入此参数，参数对应的值为聊天频道ID（channel_id）(通过消息API下创建频道接口获得)
      operate_document: '',	// 在使用文档演示SDK获取access_token时必须传入此参数，参数对应的值为聊天频道ID（channel_id） (通过消息API下创建频道接口获得)
      kick_inav: '',	// 在使用互动SDK 踢出互动房间/取消踢出互动房间 时需要传入此参数，参数值对应的为互动房间ID（ivav_id）
      publish_inav_stream: '',	// 在使用互动SDK 推流 时需要传入此参数，参数值对应的为互动房间ID（ivav_id）
      kick_inav_stream: '',	// 在使用互动SDK 踢出某一路流 时传入此参数，参数值对应的为互动房间ID（ivav_id）
      askfor_inav_publish: '',	// 在使用互动SDK 邀请推流/取消邀请推流 时传入此参数，参数值对应的为互动房间ID（ivav_id）
      audit_inav_publish: '',	// 在使用互动SDK 审核申请上麦 时传入此参数，参数值对应的为互动房间ID（ivav_id）
      publish_inav_another: '',	// 在使用互动SDK 推旁路直播/结束推旁路直播 时传入此参数，参数值对应的为互动房间ID（ivav_id）
      apply_inav_publish: '',	// 在使用互动SDK 申请上麦 时传入此参数，参数值对应的为互动房间ID（ivav_id）
      data_collect_manage: '',	// 在使用数据收集服务SDK 允许管理问卷 时传入此参数，参数值目前只支持传入all
      data_collect_submit: '',	// 在使用数据收集服务SDK 允许提交问卷答卷 时传入此参数，参数值目前只支持传入all
      data_collect_view: '',	// 在使用数据收集服务SDK 允许浏览问卷信息 时传入此参数，参数值目前只支持传入all
      ...settings
    }
    const res = await _request_post('/api/v1/base/create-v2-access-token', options)
    return res.data.access_token
  },
  callbackFailList: async (event, startTime) => {
    const rs = await _request_post('/api/v1/callback/fail-list', { event, start_time: datetimeFormat(startTime) })
    return rs.data
  },
}
// 点播API
const vod = {
  updateVodDocInfo: async function (vodId, titles){
    const rs = await _request_post('/api/v2/vod', { action: 'SubmitUpdateDocInfo', vod_id: vodId, doc_titles: JSON.stringify(titles) })
    return rs.data
  },
  updateVodKeyFrameDesc: async function (vodId, points){
    const rs = await _request_post('/api/v2/vod', { action: 'AddKeyFrameDesc', vod_id: vodId, point_sections: JSON.stringify(points) })
    return rs.data
  },
  updateVodPointFrameTasks: async function (vodId, points){
    const rs = await _request_post('/api/v2/vod', { action: 'SubmitAddPointFrameTasks', vod_id: vodId, point_sections: JSON.stringify(points) })
    return rs.data
  },
  updateVodTags: async function (vodId, tags){
    const rs = await _request_post('/api/v2/vod', { action: 'CreateVodTags', vod_id: vodId, point_sections: typeof tags === 'string' ? tags : tags.join(',') })
    return rs.data
  },
  getCueFile: async function (vodId) {
    const accountId = 'admin'
    const expire_time = datetimeFormat(new Date(Date.now() + 1000 * 60))
    const token = await paasBase.createPaasToken(accountId, { expire_time })
    const body = { package_check: 'package_check', record_id: vodId, access_token: token, client: 'pc_browser', third_party_user_id: accountId }
    const rs = await _request_post('/sdk/v2/demand/get-record-watch-info', body)
    if (!(rs.data && rs.data.cue_point)) return null
    const cue = await wreck.get(rs.data.cue_point)
    return bourne.safeParse(cue.payload, { protoAction: 'ignore' })
  }
}
// 直播API，参见 http://www.vhallyun.com/docs/show/31
const lss = {
  createLss: async function (){
    const res = await _request_post('/api/v2/room/create')
    return res.data.room_id
  },
  disableLss: async function (paasLiveId){
    const res = await _request_post('/api/v2/room/disable', { room_id: paasLiveId })
    return res.data
  },
  enableLss: async function (paasLiveId){
    const res = await _request_post('/api/v2/room/enable', { room_id: paasLiveId })
    return res.data
  },
  deleteLss: async function (paasLiveId){
    const res = await _request_post('/api/v2/room/delete', { room_id: paasLiveId })
    return res.data
  },
  getLssLssPusher: async function (paasLiveId){
    // 不需要此功能
  },
  getLssLssPushing: async function (){
    const res = await _request_post('/api/v2/room/get-pushing-stream-list')
    if (!Array.isArray(res.data.room_list)) return []
    return res.data.room_list
  },
  getLssStreamStatus: async function (paasLiveId){
    const rs = await _request_post('/api/v2/room/get-stream-status', { room_ids: paasLiveId })
    if (!rs.data[paasLiveId]) return null
    return {
      pushTime: rs.data[paasLiveId].push_time === '0000-00-00 00:00:00' ? null : rs.data[paasLiveId].push_time,
      endTime: rs.data[paasLiveId].end_time === '0000-00-00 00:00:00' ? null : rs.data[paasLiveId].end_time,
      // 1 推流中 2 未推流或推流结束
      streamStatus: Number(rs.data[paasLiveId].stream_status)
    }
  }
}
// 互动API，参见 http://www.vhallyun.com/docs/show/145
const ils = {
  createIls: async function (maxMember){
    const res = await _request_post('/api/v2/inav/create', { join_max_num: maxMember || 16 })
    return res.data.inav_id
  },
  disableIls: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/disable', { inav_id: paasInavId })
    return res.data
  },
  enableIls: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/enable', { inav_id: paasInavId })
    return res.data
  },
  deleteIls: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/delete', { inav_id: paasInavId })
    return res.data
  },
  // 获取房间状态
  getIlsStatus: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/get-status', { inav_id: paasInavId })
    // 0 无流 1 推流中
    return Number(res.data.status)
  },
  // 发起旁路
  pushIlsAnother: async function (paasInavId, paasLiveId, dpi, layout, maxScreenStream){
    const res = await _request_post('/api/v2/inav/push-another', { inav_id: paasInavId, room_id: paasLiveId, dpi, layout, max_screen_stream: maxScreenStream || undefined })
    return res.data
  },
  // 设置最大屏占比流
  setMaxScreenStream: async function (paasInavId, maxScreenStream){
    const res = await _request_post('/api/v2/inav/set-max-screen-stream', { inav_id: paasInavId, max_screen_stream: maxScreenStream })
    return res.data
  },
  // 停止旁路
  pushIlsAnotherStop: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/stop-push-another', { inav_id: paasInavId })
    return res.data
  },
  // 旁路开关
  setIlsAnotherOpen: async function (open){
    const res = await _request_post('/api/v2/inav/set-publish-another', { is_open: open ? 1 : 0 })
    return res.data
  },
  // 互动房间布局
  setIlsLayout: async function (paasInavId, layout){
    const res = await _request_post('/api/v2/inav/set-layout', { layout, inav_id: paasInavId })
    return res.data
  },
  // 恢复互动被踢出人
  resetIlsKickUser: async function (paasInavId, accountId){
    const res = await _request_post('/api/v2/inav/reset-kick-inav', { inav_id: paasInavId, third_party_user_id: accountId })
    return res.data
  },
  // 获取互动被踢出人列表
  getIlsKickList: async function (paasInavId){
    const res = await _request_post('/api/v2/inav/get-kick-inav-list', { inav_id: paasInavId })
    // ['aaa', 'bbb']
    return res.data.lists
  },
  // 获取互动房间流状态
  getIlsStreams: async function (paasInavId){
    const rs = await _request_post('/api/v2/inav/get-stream', { inav_id: paasInavId })
    const result = []
    if (!(Array.isArray(rs.data && rs.data.list) && rs.data.list.length)) return result
    for (const datum of rs.data.list) {
      // status 用户状态 1 推流中 2 观看中 3 受邀中 4 申请中
      result.push({ accountId: datum.third_party_user_id, streamId: datum.stream_id })
    }
    return result
  },
  // 获取正在直播中的互动房间内的用户列表
  getIlsUsers: async function (paasInavId){
    const rs = await _request_post('/api/v2/inav/inav-user-list', { inav_id: paasInavId })
    const result = []
    if (!(Array.isArray(rs.data) && rs.data.length)) return result
    for (const datum of rs.data) {
      // status 用户状态 1 推流中 2 观看中 3 受邀中 4 申请中
      result.push({ status: Number(datum.status), accountId: datum.third_party_user_id })
    }
    return result
  },
  kickInavStream: async function (paasInavId, accountId){
    return null
  },
  // fixme
  leaveIlsUser: async function (paasInavId, accountId){
    if (!accountId) return
    const expire_time = datetimeFormat(new Date(Date.now() + 1000 * 60))
    const token = await paasBase.createPaasToken(accountId, { kick_inav: paasInavId, kick_inav_stream: paasInavId, expire_time })
    const body = { package_check: 'package_check', inav_id: paasInavId, access_token: token, client: 'pc_browser', third_party_user_id: accountId, kick_user_id: accountId }
    const rs = await _request_post('/sdk/v2/inav/leave-room-force-inav', body)
    return rs.data
  },
  agreeInavStream: async function (paasInavId, accountId){
    if (!accountId) return
    return null
    // const expire_time = datetimeFormat(new Date(Date.now() + 1000 * 60))
    // const token = await paasBase.createPaasToken(accountId, { askfor_inav_publish: paasInavId, apply_inav_publish: paasInavId, audit_inav_publish: paasInavId, expire_time })
    // const body0 = { package_check: 'package_check', inav_id: paasInavId, client: 'pc_browser', access_token: token }
    // const body1 = Object.assign({ access_token: token, third_party_user_id: accountId, askfor_third_user_id: accountId }, body0)
    // const rs0 = await _request_post('/sdk/v2/inav/askfor-inav-publish', body1).catch(e => e)
    // const body2 = Object.assign({ access_token: token, third_party_user_id: accountId, type: 1, stream_id: '0' }, body0)
    // const rs1 = await _request_post('/sdk/v2/inav/user-publish-callback', body2).catch(e => e)
    // return rs0
  },
}
// 聊天API，参见 http://www.vhallyun.com/docs/show/372
const imv3 = {
  // 创建聊天房间
  createChannel: async function (){
    const res = await _request_post('/api/v2/channel/create')
    return res.data.channel_id
  },
  // 删除聊天房间
  deleteChannel: async function (paasImId){
    const res = await _request_post('/api/v2/channel/delete', { channel_id: paasImId })
    return res.data
  },
  // 发送聊天消息
  sendMessage: async function (paasImId, msgType, accountId, targetId, body){
    const senderId = accountId || (body && body.sourceId) || '$system'
    const type = V32V4_MSG_TYPE[msgType] || msgType
    const context = JSON.stringify({ accountId: senderId, nick_name: '', avatar: '' })
    const rs = await _request_post('/api/v2/message/send', {
      channel_id: paasImId,
      type,
      body: JSON.stringify({ type: body.type, text_content: body }),
      client: 'pc_browser',
      no_audit: 1,
      context,
      third_party_user_id: senderId
    })
    return rs.data
  },
  // 发送自定义消息
  sendCustomMessage: async function (paasImId, accountId, target_id, body){
    const senderId = accountId || (body && body.sourceId) || '$system'
    const context = JSON.stringify({ accountId: senderId, nick_name: '', avatar: '' })
    const rs = await _request_post('/api/v2/message/send', {
      channel_id: paasImId,
      type: V32V4_MSG_TYPE.custom,
      body: JSON.stringify(body),
      client: 'pc_browser',
      no_audit: 1,
      context,
      third_party_user_id: senderId
    })
    return rs.data
  },
  // 删除聊天消息
  deleteMessage: async function (paasImId, msgId){
    const res = await _request_post('/api/v2/message/delete', { msg_id: paasImId, channel_id: msgId })
    return res.data
  },
  // 设置用户聊天信息（即将废弃的接口）
  setChannelUserInfo: async function (accountId, nickName, avatar){
    const res = await _request_post('/api/v2/channel/save-user-info', { third_party_user_id: accountId, nick_name: nickName, avatar })
    return res.data
  },
  // 禁言
  setMute: async function (paasImId, mute, accountId){
    const type = mute ? 'disable' : 'permit'
    const res = await _request_post('/api/v2/channel/set-channel', { channel_id: paasImId, type, third_party_user_id: '$system', target_id: accountId })
    return res.data
  },
  // 禁言频道
  setMuteAll: async function (paasImId, mute){
    const type = mute ? 'disable_all' : 'permit_all'
    const res = await _request_post('/api/v2/channel/set-channel', { channel_id: paasImId, type, third_party_user_id: '$system' })
    return res.data
  },
  // 检查用户在线
  checkUserOnline: async function (paasImId, accountId){
    const rs = await _request_post('/api/v2/channel/check-user-online', { channel_id: paasImId, third_party_user_ids: accountId })
    return rs.data.connections && rs.data.connections[accountId]
  },
  // 在线用户列表
  getImOnlineUser: async function (paasImId, page, size){
    const rs = await _request_post('/api/v2/channel/get-userid-list', { channel_id: paasImId, curr_page: page || 1, page_size: size || 10 })
    const result = {
      total: 0,
      page: page,
      pageAll: 1,
      list: []
    }
    if (!(Array.isArray(rs.data.list) && rs.data.list.length)) return result
    result.total = rs.data.total
    result.page = rs.data.page_num
    result.pageAll = rs.data.page_all
    const contexts = rs.data.context || {}
    for (const accountId of rs.data.list) {
      const context = bourne.safeParse(contexts[accountId]) || {}
      result.list.push({
        accountId,
        nickName: context.nickName || context.nick_name || '',
        avatar: context.avatar || '',
        identity: context.identity || ''
      })
    }
    return result
  },
  // 禁言用户列表
  getImMuteList: async function (paasImId){
    const rs = await _request_post('/api/v2/channel/get-userid-list', { channel_id: paasImId, curr_page: 1, page_size: 1 })
    const result = {
      total: 0,
      page: 1,
      pageAll: 1,
      list: []
    }
    if (!(Array.isArray(rs.data.disable_users) && rs.data.disable_users.length)) return result
    const contexts = rs.data.context || {}
    for (const accountId of rs.data.disable_users) {
      const context = bourne.safeParse(contexts[accountId]) || {}
      result.list.push({
        accountId,
        nickName: context.nickName || '',
        avatar: context.avatar || '',
        identity: context.identity || ''
      })
    }

    return result
  },
  // 在线用户数量
  getImOnlineUV: async function (paasImId){
    const res = await _request_post('/api/v2/channel/get-userid-list', { channel_id: paasImId, curr_page: 1, page_size: 1 })
    return res.data.total || 0
  },
  // 获取禁言状态
  getMuteStat: async function (paasImId, accountId){
    const rs = await _request_post('/api/v2/channel/get-userid-list', { channel_id: paasImId, curr_page: 1, page_size: 1 })
    const result = {
      mute: false,
      muteAll: rs.data.channel_disable
    }
    if (!accountId) return result
    if (Array.isArray(rs.data.disable_users)) result.mute = rs.data.disable_users.indexOf(accountId) >= 0
    return result
  }
}
// 聊天API v4
const imv4 = {
  // 创建聊天房间
  createChannel: async function (description){
    const res = await _request_post('/api/v4/im/channel-create', { description })
    return res.data.channel_id
  },
  // 删除聊天房间
  deleteChannel: async function (paasImId){
    const res = await _request_post('/api/v4/im/channel-delete', { channel_id: paasImId })
    return res.data
  },
  // 在v4被废弃，空实现
  setChannelUserInfo: async function (accountId, nickName, avatar){
    return null
  },
  // 发送消息
  sendMessage: async function (channel_id, msg_type, user_id, target_id, body){
    const msg_data = typeof body === 'string' ? body : JSON.stringify(body || {})
    const res = await _request_post('/api/v4/im/send-message', {
      channel_id,
      msg_type,
      user_id,
      target_id: target_id || channel_id,
      msg_data: msg_data,
      terminal: 'pc_browser'
    })
    return res.data
  },
  // 发送Room消息
  sendRoomMessage: async function (channel_id, user_id, target_id, body){
    const msg_data = typeof body === 'string' ? body : JSON.stringify(body || {})
    const res = await _request_post('/api/v4/im/send-message', {
      channel_id,
      msg_type: 'room',
      user_id,
      target_id: target_id || channel_id,
      msg_data: msg_data,
      terminal: 'pc_browser'
    })
    return res.data
  },
  // 发送Room消息
  sendCustomMessage: async function (channel_id, user_id, target_id, body){
    const msg_data = typeof body === 'string' ? body : JSON.stringify(body || {})
    const res = await _request_post('/api/v4/im/send-message', {
      channel_id,
      msg_type: 'custom',
      user_id,
      target_id: target_id || channel_id,
      msg_data: msg_data,
      terminal: 'pc_browser'
    })
    return res.data
  },
  // 删除聊天消息
  deleteMessage: async function (paasImId, msgId){
    const res = await _request_post('/api/v4/im/delete-message', { paasImId, msg_id: msgId })
    return res.data
  },
  // 在线用户列表
  getImOnlineUser: async function (paasImId, page, size){
    const rs = await _request_post('/api/v4/im/get-user-list', { channel_id: paasImId, curr_page: page || 1, page_size: size || 10 })
    const result = {
      total: 0,
      page: page,
      pageAll: -1,
      list: []
    }
    if (!(Array.isArray(rs.data.list) && rs.data.list.length)) return result
    result.total = rs.data.total
    result.page = rs.data.page_num
    result.pageAll = rs.data.page_all
    for (const item of rs.data.list) {
      const item1 = Object.assign({}, bourne.safeParse(item.context), item)
      result.list.push({
        accountId: item1.uid || item1.accountId,
        hide: item1.hide,
        nickName: item1.nickName || item1.nick_name || '',
        avatar: item1.avatar || '',
        identity: item1.identity || ''
      })
    }
    return result
  },
  // 禁言列表
  getImMuteList: async function (paasImId, page, size){
    const rs = await _request_post('/api/v4/im/channel-get-mute-list', { channel_id: paasImId, curr_page: page || 1, page_size: size || 10 })
    const result = {
      total: 0,
      page: 1,
      pageAll: 1,
      list: []
    }
    if (!(Array.isArray(rs.data.mute_list) && rs.data.mute_list.length)) return result
    for (const item of rs.data.mute_list) {
      const item1 = Object.assign({}, bourne.safeParse(item.context), item)
      result.list.push({
        accountId: item1.uid || item1.accountId,
        nickName: item1.nickName || item1.nick_name || '',
        avatar: item1.avatar || '',
        identity: item1.identity || ''
      })
    }
    return result
  },
  // 设置禁言
  setMute: async function (accountId, mute, accounts){
    const res = await _request_post('/api/v4/im/channel-set-mute-list', {
      channel_id: accountId,
      mute: mute ? 1 : 0,
      mute_list: accounts.join(',')
    })
    return res.data
  },
  // 频道禁言
  setMuteAll: async function (accountId){
    const res = await _request_post('/api/v4/im/channel-set-mute-list', { channel_id: accountId })
    return res.data
  },
  // 检查用户在线
  checkUserOnline: async function (paasImId, accountId){
    const rs = await _request_post('/api/v2/channel/check-user-online', { channel_id: paasImId, third_party_user_ids: accountId })
    return rs.data.connections && rs.data.connections[accountId]
  },
  // 在线用户数量
  getImOnlineUV: async function (paasImId){
    const res = await _request_post('/api/v4/im/get-online-pv-uv', { channel_id: paasImId })
    return res.data.socket_users || 0
  },
  // 获取禁言状态
  getMuteStat: async function (paasImId, accountId){
    const pr0 = _request_post('/api/v4/im/channel-get-mute-status', { channel_id: paasImId })
    const pr1 = accountId ? _request_post('/api/v4/im/channel-get-mute-list', { channel_id: paasImId }) : Promise.resolve(null)
    const rs0 = await pr0
    const rs1 = await pr1
    const result = {
      mute: false,
      muteAll: !!rs0.data.mute
    }
    if (!accountId) return result
    if (Array.isArray(rs1.data.mute_list)) result.mute = rs1.data.mute_list.indexOf(accountId) >= 0
    return result
  }
}
// 文档api
const doc = {
  getDocumentInfo: async function (documentId){
    const res = await _request_post('/api/v2/document/get-info', { document_id: documentId })
    return res.data
  },
  getDocumentNum: async function (documentId){
    const res = await _request_post('/api/v2/document/get-num', { document_id: documentId })
    return res.data
  },
  // 流式传输
  createDocument: async function (stream, query){
    const headers = {
      'connection': 'close',
      'accept': 'application/json',
      // 'accept-encoding': 'gzip',
      'cache-control': 'no-cache'
    }
    for (const key of ['content-length', 'content-type']) {
      if (stream.headers[key]) headers[key] = stream.headers[key]
    }
    const res = await _pipe_request('/api/v2/document/create', stream, query, headers)
    return res.data
  }
}
// 表单api
const form = {
  createForm: async function (body){
    const res = await _request_post('/api/v2/form/create', body)
    return res.data.id
  },
  updateForm: async function (body){
    const res = await _request_post('/api/v2/form/update', body)
    return res.data
  },
  getForm: async function (formId){
    const res = await _request_post('/api/v2/form/get', { id: formId })
    return res.data
  },
  saveFormAnswer: async function (formId, client, accountId, answer){
    const res = await _request_post('/api/v2/answer/create', {
      id: formId,
      third_party_user_id: accountId,
      client: client || 'pc_browser',
      answer
    })
    return res.data
  },
  getFormAnswers: async function (formId, startTime, endTime){
    const res = await _request_post('/api/v2/answer/list-all', {
      id: formId,
      start_time: startTime,
      end_time: endTime
    })
    return res.data
  },
  getAnswer: async function (formId, answerId){
    const res = await _request_post('/api/v2/answer/get', { id: formId, answer_id: answerId })
    return res.data
  }
}

const paas = {
  imv3: imv3,
  imv4: imv4,
  ...paasBase,
  ...vod,
  ...lss,
  ...ils,
  ...imv3,
  ...doc,
  ...form,
}

exports.paas = paas

exports.config = function config(appId, secretKey, paasBase){
  APP_ID = appId || ''
  SECRET_KEY = secretKey || ''
  PAAS_BASE = paasBase || PAAS_BASE || ''
  // console.log(APP_ID, SECRET_KEY, PAAS_BASE)
}

exports.plugin = {
  pkg: { name: 'paas-method' },
  register: async function (server, options){
    exports.config(options.appId, options.secretKey, options.paasBase)

    if (!(APP_ID && SECRET_KEY)) throw new Error('APP_ID和SECRET_KEY的配置是必须的')
    for (const method of _.keys(paas)) {
      if (typeof paas[method] !== 'function') continue
      server.method('paas.' + method, paas[method], {})
    }

    server.method('paas.getImv3', () => paas.imv3, {})
    server.method('paas.getImv4', () => paas.imv4, {})
  }
}
