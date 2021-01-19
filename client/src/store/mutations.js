import Vue from "vue"
import {safeParse} from '@hapi/bourne'
import {IDENTITY, randomHashColor, userFirstStr, localStoragePrefix} from "@/utils"
import store from '@/store/index'

function setUserMap (state, userId, stat, stat2) {
  const newu = Object.assign({}, state.userMap[userId], stat2, stat, { userId })
  if (!newu.bg) newu.bg = randomHashColor(userId)
  Vue.set(state.userMap, userId, newu)
}

function userListFilter (list, userId) {
  if (!list) return []
  return list.filter(user => user.userId !== userId)
}

function saveInvaRequest (userMap) {
  // 最多保存20个，的话太多没有意义
  const limit = 20
  const list = []
  const now = Date.now()
  for (const [userId, user] of Object.entries(userMap)) {
    if (!userId) continue
    if (!user) continue
    if (!user.invaRequest) continue
    // 超过半小时的申请没有意义，不保存了
    if (now - user.invaRequest > 1000 * 60 * 30) continue
    if (list.length >= limit) break
    list.push(userId)
  }
  if (!list.length) return
  const str = JSON.stringify(list)
  window.sessionStorage.setItem(localStoragePrefix + 'invaRequestList', str)
}

const userOp = {
  // 在线人数
  setImOnlineUserTotal(state, total) {
    state.imOnlineUserTotal = total
  },
  // 设置全体禁言
  setImDisableAll(state, flag) {
    state.imDisableAll = flag
  },
  // 被禁言
  setImDisable(state, flag) {
    state.imDisable = flag
  },

  // 被加入禁言列表
  addImBlackUserSet(state, userId) {
    Vue.set(state.imBlackUserSet, userId, Date.now())
    // 用户被加入禁言
    setUserMap(state, userId, { imDisable: true })
  },
  // 被移除禁言列表
  removeImBlackUserSet(state, userId) {
    state.imBlackUserSet[userId] = 0
    // 用户被移除禁言
    setUserMap(state, userId, { imDisable: false })
  },

  // 用户加入互动房间
  addInvaUser(state, user) {
    state.invaUserList = userListFilter(state.invaUserList, user.userId).concat(user)
    // 用户在互动房间
    setUserMap(state, user.userId, { inInva: true }, user)
  },
  // 用户离开互动房间
  removeInvaUser(state, userId) {
    state.invaUserList = userListFilter(state.invaUserList, userId)
    // 用户不在互动房间
    setUserMap(state, userId, { inInva: false })
  },

  // 添加im用户到列表
  addImUser(state, user) {
    const userId = user.accountId || user.userId || user.third_party_user_id
    const nickName = user.nickName || user.nick_name
    let identity = IDENTITY[user.identity] ? user.identity : undefined
    const $user = {
      userId: userId,
      title: '',
      isImDisable: user.isDisable,
      nickName: nickName,
      identity: identity,
    }
    $user.bg = randomHashColor($user.userId)
    $user.title = userFirstStr($user)
    if (userId === state.user.userId && state.user.identity) identity = state.user.identity

    state.imUserList = userListFilter(state.imUserList, userId).concat($user)
    // 用户在房间
    setUserMap(state, user.userId, { inIm: true }, $user)
  },
  // 移除im用户到列表
  removeImUser(state, userId) {
    state.imUserList = userListFilter(state.imUserList, userId)
    // 用户不在房间
    setUserMap(state, userId, { inIm: false })
  },

  // 被加入互动黑名单列表
  addInvaBlackUserSet(state, user) {
    Vue.set(state.invaBlackUserSet, user.userId, Date.now())
    const nickName = user.nickName || user.username
    if (nickName) user.nickName = nickName
    setUserMap(state, user.userId, user, { invaBlack: true })
  },
  // 被移除互动黑名单列表
  removeInvaBlackUserSet(state, userId) {
    Vue.delete(state.invaBlackUserSet, userId)
    setUserMap(state, userId, { invaBlack: false })
  },

  // 设置申请上麦状态
  setInvaRequestStat(state, { userId, stat, noDot }) {
    // 上次请求时间
    const lastRequest = state.userMap[userId]?.invaRequest
    const invaRequest = stat ? Date.now() : 0
    // 离上次申请小于3秒，不处理
    if (Math.abs(invaRequest - lastRequest) < 3000) return
    setUserMap(state, userId, {invaRequest})
    // 申请列表小红点
    if (!noDot) state.redDotInvaRequest = !!invaRequest
    // 保存上麦申请列表
    saveInvaRequest(state.userMap)
  },

  saveInvaRequest(state) {
    saveInvaRequest(state.userMap)
  },

  // 取消申请列表小红点
  clearRedDotInvaRequest(state) {
    state.redDotInvaRequest = false
  },

  clearImUserList(state) {
    state.imUserList = []
  },
  setImUserList(state, users) {
    for (const user of users) {
      this.commit('addImUser', user)
    }
  },

  // 互动用户列表更新
  setInvUserList(state, users) {
    for (const user of users) {
      const { accountId, userId, streams } = user
      setUserMap(state, accountId, { userId: accountId || userId, streams, inInva: true })
   }
  },
}

// 流操作，本地设备设置
const streamOp = {
  // 保存选择的本地设备
  setLocalStreamOption(state, option) {
    state.localStreamOption = option
    window.sessionStorage.setItem(localStoragePrefix + 'localStreamOption', JSON.stringify(option))
  },
  //  清除用户选择的设备，下次使用再次弹出选择设备 （比如设备被移除时）
  clearLocalStreamOption(state) {
    state.localStreamOption = null
    window.localStorage.removeItem(localStoragePrefix + 'localStreamOption')
  },

  // 设置本地流（此流会被推送出去，在麦上显示）
  setLocalStream(state, { streamId, audio, video }) {
    if (process.env.NODE_ENV !== 'production') console.info('设置本地流', streamId)
    if (streamId) {
      state.stream.local = { streamId, userId: state.user.userId, audio, video, local: true }
    } else {
      state.stream.local = null
    }
  },
  // 设置本地流（桌面共享）
  setLocalDesktopStream(state, streamId) {
    if (process.env.NODE_ENV !== 'production') console.info('设置本地流', streamId)
    if (streamId) {
      state.stream.desktop = { streamId, userId: state.user.userId, audio: false, video: true, local: true }
    } else {
      state.stream.desktop = null
    }
  },
  // 删除本地流
  delLocalStream(state, streamId) {
    if (process.env.NODE_ENV !== 'production') console.info('删除本地流', streamId)
    if (state.stream.local?.streamId === streamId) {
      state.stream.local = null
    }
    if (state.stream.desktop?.streamId === streamId) {
      state.stream.desktop = null
    }
  },
  // 保存用户选择的设备，方便下次使用（下次选择摄像设备不用再次弹出）

  // 添加远程流 (除非此人是主持人)
  addRemoteStream(state, { streamId, userId, streamType, attributes }) {
    // streamType 流类型 0：纯音频， 1：单视频， 2：音视频， 3：桌面采集
    // 注意：此处进行了简化，您应该自己判断是否真的是主持人推的桌面流
    const stream = { streamId, userId, streamType, attributes }
    const audio = streamType === 0 || streamType === 2
    const video = streamType === 1 || streamType === 2
    stream.audio = audio
    stream.video = video
    stream.local = false
    if (attributes.nickName) stream.nickName = attributes.nickName
    if (attributes.identity) stream.identity = attributes.identity

    // 是主持人
    if (attributes?.identity === IDENTITY.master) {
      state.stream.masterUserId = attributes?.userId
      if (streamType === 3) {
        // 主持人的桌面采集
        state.stream.masterDesktop = stream
        state.side_active = 'desktopShare'
        // this.commit('setSideActive', 'desktopShare')
      } else {
        state.stream.masterLocal = stream
        state.stream.remote = userListFilter(state.stream.remote, userId).concat(stream)
        // 设置用户在麦上了，及音视频状态
        setUserMap(state, userId, { streamId: streamId, audio, video })
      }
    }

    if (streamType === 3) {
      // 其他人的桌面采集
    } else {
      // 一个人只有一路流，所以移除旧的，添加新的。
      state.stream.remote = userListFilter(state.stream.remote, userId).concat(stream)
      // 设置用户在麦上了，及音视频状态
      setUserMap(state, userId, { streamId: streamId, audio, video })
    }
  },
  // 删除远程流
  delRemoteStream(state, { streamId, userId, streamType, attributes }) {
    // 是主持人
    if (attributes.identity === IDENTITY.master) {
      state.stream.masterUserId = attributes?.userId
      if (streamType === 3) {
        // 主持人的桌面采集
        state.stream.masterDesktop = null
        const prev = sessionStorage.getItem('menu_type') || 'board'
        state.side_active = prev
        // this.commit('setSideActive', prev)
      } else {
        state.stream.masterLocal = null
      }
    }

    if (streamType === 3) {
      // 其他人的桌面采集
    } else {
      state.stream.remote = state.stream.remote.filter(i => i.streamId !== streamId)
      // 用户下麦了
      setUserMap(state, userId, { streamId: null })
    }
  },
  // 设置流视频/音频状态
  setRemoteStreamAVStatus(state, { streamId, muteStream, attributes }) {
    let stream = state.stream.remote.filter(i => i.streamId === streamId)[0]
    if (state.stream.local?.streamId === streamId) stream = state.stream.local
    if (state.stream.desktop?.streamId === streamId) stream = state.stream.desktop
    if (state.stream.masterDesktop?.streamId === streamId) stream = state.stream.masterDesktop
    if (state.stream.masterLocal?.streamId === streamId) stream = state.stream.masterLocal
    if (!stream) return
    const userId = stream.userId || stream.accountId
    if (userId) setUserMap(state, userId, { audio: !muteStream.audio, video: !muteStream.video })
    stream.audio = !muteStream.audio
    stream.video = !muteStream.video
  },
  muteStream(state, data) {
    console.log('设置流禁音/禁画面')
  }
}

export const mutations = {
  ...userOp,
  ...streamOp,
  // 设置进入房间需要的数据
  setRoomEnterData(state, data) {
    if (!data) return
    state.sdkOption = data.sdkOption
    state.user = data.user
    state.room = data.room
    if (data.room.liveStartAt > 0) {
      state.liveStartAt = data.room.liveStartAt
      state.live = true
    } else {
      state.liveStartAt = data.room.liveStartAt ?? 0
    }
  },
  // 清理进入房间需要的数据
  clearRoomData(state) {
    state.sdkOption = {}
    state.user = {}
    state.room = {}
    state.live = false
    state.liveStartAt = 0
  },
  // 设置sdk
  setSDK(state, sdk) {
    state.sdk = sdk
  },
  // 设置开始直播状态
  setStartLiveStat(state, { time }) {
    state.liveStartAt = time || Date.now()
    state.live = true
  },
  // 设置停止直播状态
  setStopLiveStat(state) {
    state.liveStartAt = -1
    state.live = false
  },
  setSideActive(state, active) {
    state.side_active = active
    if (active !== 'desktopShare') {
      sessionStorage.setItem('menu_type', active)
    }
  },
  resetRoomData(state){
    state.stream = {
      masterUserId: null,
      local: null,
      desktop: null,
      masterLocal: null,
      masterDesktop: null,
      remote: []
    }
    state.room = {
      title: '',
      roomId: '',
      isVod: false,
      liveStartAt: 0
    }
    state.sdk = {
      $rtc: null,
      $chat: null,
      $doc: null,
      $player:null
    }
    state.live = false
    state.liveStartAt = 0
    state.userMap = {}
    state.userList = []
    state.invaBlackUserSet = {}
    state.invaUserList = []
    state.imBlackUserSet = {}
    state.imUserList = []
    state.imOnlineUserTotal = 0
    state.imDisableAll = false
    state.imDisable = false
    state.redDotInvaRequest = false
    state.side_active = 'board'
  }
}
