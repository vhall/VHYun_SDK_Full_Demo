import { getProxy, safeParse } from '@/utils/index'

// 实例化聊天sdk，注意聊天sdk应优先初始化
export async function initChat(option){
  const rs = await VhallChat.createInstance(option)
  const disableAll = typeof rs.disable_all !== 'undefined' ? rs.disable_all : rs.disableAll
  const disable = typeof rs.disable !== 'undefined' ? rs.disable : rs.disableAll
  const chat = rs.message ? rs.message : rs
  return { chat, disableAll, disable }
}

// 实例化互动sdk
export async function initRTC(option){
  try {
    // if (typeof useMsgV4 === 'boolean' && useMsgV4 === true) msgEventProxy({ name: 'vhall-jssdk-interaction', version: '2.2.4' }, function (msg, event, cb) {})
    if (typeof useMsgV4 === 'boolean' && useMsgV4 === true) msgEventProxy({ name: 'vhall-jssdk-interaction', version: '2.3.1' }, function (msg, event, cb) {})
    const { vhallrtc, currentStreams } = await new Promise((resolve, reject) => window.VhallRTC.createInstance(option, resolve, reject))
    return { rtc: vhallrtc, currentStreams }
  } catch (e) {
    console.error(e)
  }
}

// 实例化文档sdk
export async function initDoc(option){
  if (typeof useMsgV4 === 'boolean' && useMsgV4 === true){
    msgEventProxy({ name: 'vhall-jssdk-doc', version: '3.1.5' }, function (msg, event, cb) {
      msg.on('document', function (ev) {
        cb(docMsgTr(ev))
      })
    })
  }

  let doc
  const promise = new Promise((resolve, reject) => {
    doc = window.VHDocSDK.createInstance(option, () => resolve(doc), reject)
  })
  // window['VhallMsg'] = VhallMsg
  await promise
  return doc
}

function docMsgTr(ev) {
  const o = {
    msg_id: ev.msgId,
    app_id: ev.appId,
    channel: ev.channelId,
    service_type: 'service_document',
    msg_source: 'prefix01',
    sender_id: ev.sourceId,
    bu: '1',
    pv: 0,
    uv: 0,
    context: JSON.stringify(ev.context),
    data: JSON.stringify(ev.data),
    date_time: "2021-06-13 03:41:29",
  }
  return o
}

function msgEventProxy(sdk, callback) {
  // proxy doc over msg v4
  const VhallMsg = window.VhallMsg
  if (!VhallMsg) return Promise.reject()

  function fkInstance (success, fail) {
    return function (rs) {
      rs.info = { document_server: 'https://cnstatic01.e.vhall.com/document', log_server: '' }
      const rsp = getProxy(rs, {
        connect: null,
        addEventListener: function () {
          return function (e, cb) {
            callback(rs, e, cb)
          }
        }
      })
      rs.join.call(rs).then(function () {}, fail)
      return success ? success(rsp) : rsp
    }
  }
  window['VhallMsg'] = getProxy(VhallMsg, { createInstance: function (origin) {
      window['VhallMsg'] = VhallMsg
      return function (option, success, fail) {
        option.sdk = sdk
        origin(option, fkInstance(success, fail), fail)
      }
    }})

}

export function getStreamsInfo(rtc) {
  if (!rtc) return []
  const { local: { user }, remote: { users } } = rtc.getRoomInfo()
  const lists = []
  // 本地 & 远程
  for (const {accountId, streams} of [user, ...users]) {
    for (const stream of streams) {
      const attributes = safeParse(stream.attributes) || {}
      lists.push({
        type: stream.type, // local remote
        status: stream.state ?? stream.status, // type-local: 0 未推流 1 已推流， type-remote：0 未订阅 1 已订阅
        streamType: stream.streamType, // screen: 3, video && audio: 2, video: 1, audio: 0
        streamId: stream.streamId,
        userId: accountId || attributes.userId,
        nickName: attributes.nickName,
        identity: attributes.identity,
        audio: stream.streamType === 2 || stream.streamType === 0,
        video: stream.streamType === 2 || stream.streamType === 1 || stream.streamType === 3,
        audioMuted: stream.audioMuted,
        videoMuted: stream.videoMuted
      })
    }
  }
  return lists
}

export function getStreamInfo(rtc, streamId) {
  const streams = getStreamsInfo(rtc)
  return streams.filter(stream => stream.streamId === streamId)[0]
}

/** 实例化播放器sdk */
export async function initPlayer(option){
  const {vhallplayer} = await new Promise((resolve,reject)=> window.VhallPlayer.createInstance(option,resolve,reject))
  return vhallplayer
}

// 获取视频/音频设备列表，功能由互动sdk提供
export async function getDevices(){
  const devices = await new Promise((resolve, reject) => window.VhallRTC.getDevices({}, resolve, reject))
  return devices
}
