import Vue from "vue"
import { IDENTITY, randomHashColor, userFirstStr, localStoragePrefix, IDENTITY_NAME, IDENTITY_COLORS } from '@/utils'
import { BUS_CUSTOM_EVENTS } from '@/common/contant'
const MAX_MESSAGE_STORE = 2000

function setUserMap (state, userId, stat, stat2) {
  const newu = Object.assign({}, state.userMap[userId], stat2, stat, { userId })
  if (!newu.bg) newu.bg = randomHashColor(userId)
  Vue.set(state.userMap, userId, newu)
}

function userListFilter (list, userId) {
  if (!list) return []
  return list.filter(user => user.userId !== userId)
}

function createUserObj(accountId) {
  return {
    userId: accountId,
    accountId: accountId,
    avatar: '',
    nickName: '',
    invaRequest: 0,
    invaInviter: 0,
    inIm: false,
    imDisable: false,
    invaBlack: false,
    streamId: '',
    identity: IDENTITY.player,
    get avatarBackgroundColor() {
      return randomHashColor(this.accountId)
    },
    get avatarBackgroundImage() {
      return this.avatar ? `url(${this.avatar})` : ''
    },
    get identityName() {
      return IDENTITY_NAME[this.identity] || IDENTITY_NAME[IDENTITY.player];
    },
    get identityColors() {
      return IDENTITY_COLORS[this.identity] || IDENTITY_COLORS[IDENTITY.player];
    },
    get nickNameTitle() {
      return (this.nickName || this.accountId || '').slice(0, 1).toUpperCase()
    },
  }
}

function createOrGetUser(state, accountId) {
  if (!accountId) return createUserObj(accountId)
  if (!state.userMap[accountId]) Vue.set(state.userMap, accountId, createUserObj(accountId))
  return state.userMap[accountId]
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
  addImBlackUserSet(state, accountId) {
    Vue.set(state.imBlackUserSet, accountId, Date.now())
    // 用户被加入禁言
    const user = createOrGetUser(state, accountId)
    user.imDisable = true
  },
  // 被移除禁言列表
  removeImBlackUserSet(state, accountId) {
    state.imBlackUserSet[accountId] = 0
    // 用户被移除禁言
    const user = createOrGetUser(state, accountId)
    user.imDisable = false
  },

  // 添加im用户到列表
  addImUser(state, user) {
    const accountId = user.accountId || user.userId || user.user_id || user.third_party_user_id
    const nickName = user.nickName || user.nick_name
    if (!accountId) console.error('[addImUser] accountId is null', user)
    const identity = IDENTITY[user.identity] ? user.identity : IDENTITY.player
    const newUser = createOrGetUser(state, accountId)
    newUser.isDisable = user.isDisable
    newUser.inIm = true
    if (nickName) newUser.nickName = nickName
    if (identity) newUser.identity = identity
    if (accountId === state.user.userId && state.user.identity) newUser.identity = state.user.identity

    // 用户加入到列表
    state.imUserList = userListFilter(state.imUserList, accountId).concat(newUser)
  },
  // 移除im用户到列表
  removeImUser(state, accountId) {
    // 用户不在房间
    state.imUserList = userListFilter(state.imUserList, accountId)
    const user = createOrGetUser(state, accountId)
    user.inIm = false
  },

  // 被加入互动黑名单列表
  addInvaBlackUserSet(state, user) {
    Vue.set(state.invaBlackUserSet, user.userId, Date.now())
    const u = createOrGetUser(state, user.accountId || user.userId)
    u.invaBlack = true
    const nickName = user.nickName || user.username || user.nick_name
    if (nickName) u.nickName = nickName
  },
  // 被移除黑名单列表
  removeInvaBlackUserSet(state, accountId) {
    Vue.delete(state.invaBlackUserSet, userId)
    const u = createOrGetUser(state, accountId)
    u.invaBlack = false
  },
  // 刷新黑名单列表
  remakeInvaBlackUserSet(state, accounts) {
    const set = accounts.reduce((set, a) => { set[typeof a === 'string' ? a : a.accountId] = 1; return set }, {})
    state.invaBlackUserSet = {}
    for (const user of Object.values(state.userMap)) {
      user.invaBlack = set[user.accountId] ? 1 : 0
    }
    for (const account of accounts) {
      const u = createOrGetUser(state, account.accountId)
      Vue.set(state.invaBlackUserSet, account.accountId, Date.now())
      u.invaBlack = true
      if (account.nickName) u.nickName = account.nickName
      if (account.identity) u.identity = account.identity
      if (account.avatar) u.avatar = account.avatar
    }
  },
  // 刷新黑名单列表
  remakeInvaRequestUserSet(state, accounts) {
    const set = accounts.reduce((set, a) => { set[typeof a === 'string' ? a : a.accountId] = a.type; return set }, {})
    for (const user of Object.values(state.userMap)) {
      user.invaRequest = 0 // set[user.accountId] ? 1 : 0
      user.invaInviter = 0 // set[user.accountId] ? 1 : 0
    }
    for (const user of accounts) {
      const u = createOrGetUser(state, user.accountId)
      if (user.type === 1) u.invaRequest = user.date || Date.now()
      if (user.type === 2) u.invaInviter = user.date || Date.now()
    }
    let count = 0
    for (const user of state.imUserList) {
      if (set[user.accountId] && set[user.accountId].type === 1) {
        if (set[user.accountId]) count += 1
      }
    }
    // 申请列表小红点
    state.redDotInvaRequest = !!count
  },

  // 设置申请上麦状态
  setInvaRequestStat(state, { userId, stat, noDot }) {
    // 上次请求时间
    const u = createOrGetUser(state, userId)
    const lastRequest = u.invaRequest
    const invaRequest = stat ? Date.now() : 0

    if (state.userMap[userId]) {
      state.userMap[userId].invaInviter = 0
    }

    // 离上次申请小于3秒，不处理
    if (Math.abs(invaRequest - lastRequest) < 3000) return
    u.invaRequest = invaRequest
    // 申请列表小红点
    if (!noDot) state.redDotInvaRequest = !!invaRequest
    // 保存上麦申请列表
    saveInvaRequest(state.userMap)
  },

  setInavInviterStat(state, { userId }) {
    if (!state.userMap[userId]) return
    state.userMap[userId].invaInviter = Date.now()

    setTimeout(function () {
      if (!state.userMap[userId]) return
      state.userMap[userId].invaInviter = 0
    }, 20 * 1000)
  },

  saveInvaRequest(state) {
    saveInvaRequest(state.userMap)
  },

  // 取消申请列表小红点
  clearRedDotInvaRequest(state) {
    state.redDotInvaRequest = false
    window.sessionStorage.removeItem(localStoragePrefix + 'invaRequestList')
  },

  clearImUserList(state) {
    state.imUserList = []
  },
  setImUserList(state, users) {
    for (const user of users) {
      this.commit('addImUser', user)
    }
    state.imOnlineUserTotal = users.length
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
    window.sessionStorage.setItem(localStoragePrefix + 'localStreamOption1', JSON.stringify(option))
  },

  // 设置本地流（此流会被推送出去，在麦上显示）
  setLocalStream(state, { streamId, audio, video }) {
    if (process.env.NODE_ENV !== 'production') console.info('设置本地流', streamId)
    const origin = state.stream.local
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
    const user = createOrGetUser(state, userId)
    const audio = streamType === 0 || streamType === 2
    const video = streamType === 1 || streamType === 2
    stream.audio = audio
    stream.video = video
    stream.local = false

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
        user.audio = audio
        user.video = video
        user.streamId = streamId
        if (attributes.nickName && !user.nickName) user.nickName = attributes.nickName
        if (attributes.identity && !user.identity) user.identity = attributes.identity
      }
    }

    if (streamType === 3) {
      // 其他人的桌面采集
    } else {
      // 一个人只有一路流，所以移除旧的，添加新的。
      state.stream.remote = userListFilter(state.stream.remote, userId).concat(stream)
      // 设置用户在麦上了，及音视频状态
      user.audio = audio
      user.video = video
      user.streamId = streamId
      // 清理上麦请求
      user.invaRequest = 0
    }
  },
  // 删除远程流
  delRemoteStream(state, { streamId, userId, streamType, attributes }) {
    const user = createOrGetUser(state, userId)
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
      user.audio = false
      user.video = false
      user.streamId = null
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

const invaOp = {

}

export const mutations = {
  ...userOp,
  ...streamOp,
  ...invaOp,
  // 添加消息到列表
  appendChatToList(state, msg) {
    if (!msg) return
    const context = msg.context || {}
    const accountId = (context.accountId || context.userId || context.user_id || msg.sourceId || '')
    const user = createOrGetUser(state, accountId)
    user.nickName = (context.nickName || context.nick_name || user.nickName || '')
    user.identity = IDENTITY[context.identity] || user.identity || IDENTITY.player
    user.avatar = (context.avatar || user.identity || '')

    const chatComponentTypes = {
      text: 'TextMessageItem',
      [BUS_CUSTOM_EVENTS.SEND_FORM]: 'FormMessageItem',
      other: '',
    }
    const messageData = {
      user,
      showType: chatComponentTypes[msg.data.type] || chatComponentTypes.other,
      msgId: msg.msgId || msg.msg_id || '',
      data: msg.data,
      sourceId: msg.sourceId,
      targetId: msg.targetId,
    }

    if (state.imMessageList.find(i => i.msgId === messageData.msgId)) return
    state.imMessageList.push(messageData)
    if (state.imMessageList.length > MAX_MESSAGE_STORE) state.imMessageList.shift()
  },
  // 设置进入房间需要的数据
  setRoomEnterData(state, data) {
    if (!data) return
    state.sdkOption = data.sdk
    state.user = data.user
    state.room = data.room
    const status = data.room.status
    const liveStartAt = data.room.liveStartAt

    state.liveStartAt = liveStartAt
    state.live = status === 3
    state.liveStatus = status
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
    state.liveStatus = 3
  },
  // 设置停止直播状态
  setStopLiveStat(state) {
    state.liveStatus = 4
    // state.liveStartAt = -1
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
