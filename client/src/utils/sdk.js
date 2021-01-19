import { safeParse } from '@hapi/bourne'

// 实例化聊天sdk，注意聊天sdk应优先初始化
export async function initChat(option){
  const { message, disable_all, disable } = await new Promise((resolve, reject) => window.VhallChat.createInstance(option, resolve, reject))
  return { chat: message, disable_all, disable }
}

// 实例化互动sdk
export async function initRTC(option){
  const { vhallrtc, currentStreams } = await new Promise((resolve, reject) => window.VhallRTC.createInstance(option, resolve, reject))
  return { rtc: vhallrtc, currentStreams }
}

// 实例化文档sdk
export async function initDoc(option){
  const doc = await new Promise((resolve, reject) => {
    const doc = window.VHDocSDK.createInstance(option, () => {
      resolve(doc)
    }, reject)
  })
  // 使用Object.seal密封对象，避免vue深度最终sdk实例内部，造成不必要的麻烦
  return doc
}

export function getStreamsInfo(rtc) {
  if (!rtc) return null
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
