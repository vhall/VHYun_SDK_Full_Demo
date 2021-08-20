let i = 0

// 创建本地流
export async function createLocalStream(rtc, data = {}){
  if (!rtc) return
  // 由于需要将流放在自定义位置，但sdk不支持不挂载，所以先创建一个不显示的dom，以获得本地流
  const el = document.createElement('div')
  el.style.display = 'none'
  el.id = 'local-stream-' + i++
  document.body.appendChild(el)
  const videoCodec = data.codecs ?? undefined

  let profile = {}
  if (typeof data.profile === 'string') profile = VhallRTC[data.profile]
  profile = Object.assign({}, profile, VhallRTC && VhallRTC.RTC_VIDEO_PROFILE_720P_16x9_M || {})

  // 火狐对profile支持有问题
  if (navigator.userAgent.indexOf('Firefox/') >= 0) profile = {}
  const opt = {
    videoNode: el.id,
    audio: data.audio ?? true,
    video: data.video ?? true,
    mute: {
      audio: false,
      video: false
    },
    speaker: data.speaker ?? false,
    simulcast: data.simulcast ?? true,
    audioDevice: data.audioDevice,
    videoDevice: data.videoDevice,
    profile: profile,
    attributes: data.attributes,
    videoCodec
  }

  let streamId
  try {
    const data = await new Promise((resolve, reject) => rtc.createStream(opt, resolve, reject))
    streamId = data.streamId
    rtc.stopStream({ streamId })
  } catch (e) {
    const t = e?.data?.error?.type
    if (t === 'access-denied') {
      if (opt.speaker) throw new Error('桌面共享已取消')
      else throw new Error('设备捕获已取消')
    }
    const err = new Error(e.message)

    err.code = e.code
    err.data = e.data
    throw err
  }
  let audio = opt.audio
  let video = opt.video
  try {
    const res = await new Promise((resolve, reject) => rtc.getStreamMute({ streamId }, resolve, reject))
    audio = !res?.audioMuted ?? true
    video = !res?.videoMuted ?? true
  } catch (e) {
    //
  }

  el.remove()
  return { audioDevice: data.audioDevice, videoDevice: data.videoDevice, streamId, audio, video }
}
