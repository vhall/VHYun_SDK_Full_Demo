'use strict'
const wreck = require('@hapi/wreck')
const bourne = require('@hapi/bourne')
const qs = require('querystring')
const crypto = require('crypto')
const _ = require('lodash')
const moment = require('moment')

let APP_ID = ''
let SECRET_KEY = ''
let PAAS_BASE = 'https://api.vhallyun.com'

// 请求签名，签名方法见 http://www.vhallyun.com/docs/show/18
function _sign(dict) {
    delete dict.sign
    const str = _.flatMap(_.sortBy(_.toPairs(dict), '0')).join('')
    const md5 = crypto.createHash('md5')
    md5.write(SECRET_KEY)
    md5.write(str)
    md5.write(SECRET_KEY)
    return md5.digest('hex')
}

async function _pipe_request(path, payload, query, headers) {
  query = query || {}
  query.app_id = APP_ID
  query.signed_at = Math.trunc(Date.now() / 1000)
  query.sign = _sign(query)
  const uri = path + '?' + qs.stringify(query)
  const res = await wreck.post(uri, {headers, timeout: 1000 * 20, baseUrl: PAAS_BASE, payload})
  //  转换为json对象，bourne是JSON.parse的简单包装
  const data = bourne.safeParse(res.payload, {protoAction: 'ignore'})
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

async function _request(path, query) {
    if (!query) query = {}
    query.app_id = APP_ID
    query.signed_at = Math.trunc(Date.now() / 1000)
    query.sign = _sign(query)
    const uri = path + '?' + qs.stringify(query)
    const res = await wreck.post(uri, {timeout: 1000 * 20, baseUrl: PAAS_BASE})
    //  转换为json对象，bourne是JSON.parse的简单包装
    const data = bourne.safeParse(res.payload, {protoAction: 'ignore'})
    if (data) {
        // console.log(data.code, path, data.msg, JSON.stringify(query))
        // data._res = res.res
        if (data.code && (Number(data.code) !== 200)) {
            const err = new Error(data.msg)
            err.data = data
            throw err
        }
    }
    return data
}

// 直播API，参见 http://www.vhallyun.com/docs/show/31
const lss = {
    createLss: async function () {
        const res = await _request('/api/v2/room/create')
        return res.data.room_id
    },
    disableLss: async function (room_id) {
        const res = await _request('/api/v2/room/disable', {room_id})
        return res.data
    },
    enableLss: async function (room_id) {
        const res = await _request('/api/v2/room/enable', {room_id})
        return res.data
    },
    deleteLss: async function (room_id) {
        const res = await _request('/api/v2/room/delete', {room_id})
        return res.data
    },
    getLssLssPusher: async function (room_id) {
        const expire_time = moment().add(30, 'day').format('YYYY/MM/DD HH:mm:ss')
        const res = await _request('/api/v2/room/get-push-info', {room_id, expire_time})
        return res.data
    },
    getLssLssPushing: async function () {
        const res = await _request('/api/v2/room/get-pushing-stream-list')
        return res.data.room_list
    },
    setRecordOpen: async function (open) {
        // const res = await _request('/api/v2/room/get-pushing-list', {open_record: open ? 1 : 0})
        // return res.data.room_list
    },
}
// 互动API，参见 http://www.vhallyun.com/docs/show/145
const ils = {
    createIls: async function (max_member) {
        const res = await _request('/api/v2/inav/create', {join_max_num: max_member || 8})
        return res.data.inav_id
    },
    disableIls: async function (inav_id) {
        const res = await _request('/api/v2/inav/disable', {inav_id})
        return res.data
    },
    enableIls: async function (id) {
        const res = await _request('/api/v2/inav/enable', {inav_id})
        return res.data
    },
    deleteIls: async function (inav_id) {
        const res = await _request('/api/v2/inav/delete', {inav_id})
        return res.data
    },
    // 获取房间状态
    getIlsStatus: async function (inav_id) {
        const res = await _request('/api/v2/inav/get-status', {inav_id})
        return res.data.status
    },
  // 发起旁路
    pushIlsAnother: async function (inav_id, room_id, dpi, layout, max_screen_stream) {
        const res = await _request('/api/v2/inav/push-another', {inav_id, room_id, dpi, layout, max_screen_stream})
        return res.data
    },
    // 设置最大屏占比流
    setMaxScreenStream: async function (inav_id, max_screen_stream) {
        const res = await _request('/api/v2/inav/set-max-screen-stream', {inav_id, max_screen_stream})
        return res.data
    },
    // 停止旁路
    pushIlsAnotherStop: async function (inav_id) {
        const res = await _request('/api/v2/inav/stop-push-another', {inav_id})
        return res.data
    },
    // 旁路开关
    setIlsAnotherOpen: async function (is_open) {
        const res = await _request('/api/v2/inav/set-publish-another', {is_open: is_open ? 1 : 0})
        return res.data
    },
    // 互动房间布局
    setIlsLayout: async function (inav_id, layout) {
        const res = await _request('/api/v2/inav/set-layout', {layout, inav_id})
        return res.data
    },
    // 获取互动房间流状态
    getIlsStreams: async function (inav_id) {
        const res = await _request('/api/v2/inav/get-stream', {inav_id})
        return res.data.list
    },
    // 恢复互动被踢出人
    resetIlsKickUser: async function (inav_id, third_party_user_id) {
        const res = await _request('/api/v2/inav/reset-kick-inav', {inav_id, third_party_user_id})
        return res.data
    },
    // 获取互动被踢出人列表
    getIlsKickList: async function (inav_id) {
        const res = await _request('/api/v2/inav/get-kick-inav-list', {inav_id})
        return res.data.lists
    },
    // 获取正在直播中的互动房间内的用户列表
    getIlsUsers: async function (inav_id) {
      const res = await _request('/api/v2/inav/inav-user-list', {inav_id})
      return res.data
    },
}
// 聊天API，参见 http://www.vhallyun.com/docs/show/372
const im = {
    // 创建聊天房间
    createChannel: async function () {
        const res = await _request('/api/v2/channel/create')
        return res.data.channel_id
    },
    // 删除聊天房间
    deleteChannel: async function (channel_id) {
        const res = await _request('/api/v2/channel/delete', {channel_id})
        return res.data
    },
    // 发送聊天消息
    sendMessage: async function (channel_id, body) {
        const res = await _request('/api/v2/message/send', {...body, channel_id})
        return res.data
    },
    // 发送聊天消息
    deleteMessage: async function (channel_id, msg_id) {
        const res = await _request('/api/v2/message/delete', {msg_id, channel_id})
        return res.data
    },
    // 设置用户聊天信息
    setChannelUserInfo: async function (third_party_user_id, nick_name, avatar) {
        const res = await _request('/api/v2/channel/save-user-info', {third_party_user_id, nick_name, avatar})
        return res.data
    },
    getImOnlineUser: async function (channel_id, curr_page, page_size) {
        const res = await _request('/api/v2/channel/get-userid-list', {channel_id, curr_page, page_size})
        return res.data
    },
}
// 文档api
const doc = {
    getDocumentInfo: async function (document_id) {
        const res = await _request('/api/v2/document/get-info', {document_id})
        return res.data
    },
    getDocumentNum: async function (document_id) {
        const res = await _request('/api/v2/document/get-num', {document_id})
        return res.data
    },
    // 流式传输
    createDocument: async function (stream, query) {
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
    },
}

const paas = {
    // 创建paas平台token，参见 http://www.vhallyun.com/docs/show/19
    createPaasToken: async (settings) => {
        const options = {
            third_party_user_id: '',	// 第三方用户ID是开发者自有用户系统里用户的唯一标识，详见上文。
            // expire_time: "",	// 过期时间 默认为一天，最大为1天,最小为1秒 格式为: 2017/01/01 00:00:00
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
            // data_collect_manage: "",	// 在使用数据收集服务SDK 允许管理问卷 时传入此参数，参数值目前只支持传入all
            // data_collect_submit: "",	// 在使用数据收集服务SDK 允许提交问卷答卷 时传入此参数，参数值目前只支持传入all
            // data_collect_view: "",	// 在使用数据收集服务SDK 允许浏览问卷信息 时传入此参数，参数值目前只支持传入all
            ...settings,
        }
        const res = await _request('/api/v1/base/create-v2-access-token', options)
        return res.data.access_token
    },
    ...lss,
    ...ils,
    ...im,
    ...doc,
}

exports.paas = paas

exports.plugin = {
    pkg: {name: 'paas-method'},
    register: async function (server, options) {
        APP_ID = options.appId || ''
        SECRET_KEY = options.secretKey || ''
        PAAS_BASE = options.paasBase || PAAS_BASE || ''

        if (!(APP_ID && SECRET_KEY)) throw new Error('APP_ID和SECRET_KEY的配置是必须的')
        for (const method of _.keys(paas)) {
            if (typeof paas[method] !== 'function') continue
            server.method('paas.' + method, paas[method], {})
        }
    },
}
