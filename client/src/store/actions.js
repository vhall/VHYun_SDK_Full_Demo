import { checkSdkOpt, IDENTITY, IDENTITY_NAME, localStoragePrefix, promisify, VH_TITLE } from '@/utils'
import { safeParse } from '@hapi/bourne'
import * as api from '@/common/api'
import { getStreamInfo } from '@/utils/sdk'

export const actions = {
  // 加载保存的选择的本地设备
  async loadLocalStreamOption(context) {
    const opt = safeParse(window.sessionStorage.getItem(localStoragePrefix + 'localStreamOption'))
    if (opt) context.commit('setLocalStreamOption', opt)
  },
  // 加载保存的申请列表
  async loadInvaRequest(context) {
    const list = safeParse(window.sessionStorage.getItem(localStoragePrefix + 'invaRequestList'))
    if (!Array.isArray(list)) return
    for (const userId of list) {
      context.commit('setInvaRequestStat', { userId, stat: 1, noDot: true })
    }
  },
  // 删除保存的申请列表
  async cleanInvaRequest(context) {
    window.sessionStorage.removeItem(localStoragePrefix + 'invaRequestList')
  },
  // 删除刷新前的数据
  async cleanRestoreInvaData(context, uuid) {
    const key = localStoragePrefix + 'restoreInvaData'
    window.sessionStorage.removeItem(key)
  },
  // 恢复刷新前的数据
  async loadRestoreInvaData(context, uuid) {
    const key = localStoragePrefix + 'restoreInvaData'
    const d = safeParse(window.sessionStorage.getItem(key))
    if (!d?.user?.userId) return
    if (!d?.user?.identity) return
    // if (!checkSdkOpt(d.sdkOption)) return
    if ((Date.now() - d.saveTime || 0) > 1000 * 30) return
    d.room.isLoad = true
    // 恢复
    // context.state.sdkOption = d.sdkOption
    context.state.user = d.user
    context.state.room = d.room
    const identity = context.state.user.identity
    window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-${VH_TITLE}`
  },
  // 保存刷新前的数据，方便重新载入
  async saveRestoreInvaData(context, uuid) {
    const key = localStoragePrefix + 'restoreInvaData'
    const data = {
      saveTime: Date.now(),
      liveStartAt: context.state.liveStartAt,
      room: context.state.room,
      user: context.state.user,
      // sdkOption: context.state.sdkOption
    }
    data.room.isPublish = context.state.live
    if (!data?.room?.roomId) return
    if (!data?.user?.userId) return
    if (!data?.user?.identity) return
    // if (!checkSdkOpt(data.sdkOption)) return
    window.sessionStorage.setItem(key, JSON.stringify(data))
  },
  // 进入互动房间（获取token等数据）
  async execEnterRoom(context, { roomId, username, nickName, identity, isLoad }) {
    username = username ?? nickName
    const data = await api.roomEnter(roomId, username, identity)
    const userId = data.user.userId || ''
    const $identity = data.user.identity || identity || IDENTITY.player
    const $roomId = '' + (data.room.id || '')
    const $data = {
      sdkOption: {
        accountId: userId,
        appId: data.room.appId || '',
        token: data.user.token || '',
        paasLiveId: data.room.paasLiveId || '',
        paasInavId: data.room.paasInavId || '',
        paasImId: data.room.paasImId || '',
        identity: $identity,
        isVod: data.room.isVod || false,
        liveStartAt: data.room.liveStartAt || 0
      },
      room: {
        title: data.room.title || '',
        roomId: $roomId,
        isVod: data.room.isVod || false,
        liveStartAt: data.room.liveStartAt || 0,
        isLoad: isLoad
      },
      user: {
        userId: userId,
        identity: $identity,
        avatar: data.user.avatar || '',
        nickName: data.user.username || ''
      },
    }

    if (!(checkSdkOpt($data.sdkOption))) {
      throw new Error('服务器数据错误')
    }
    window.document.title = `${$data.user.nickName}-${IDENTITY_NAME[identity]}-${VH_TITLE}`

    context.commit('setRoomEnterData', $data)
  },
  // 获取互动房间在线用户列表
  async getInvUserList(context) {
    const rtc = context.state.sdk.$rtc
    if (!rtc) return console.info('getInvUserList: rtc instance not found')
    const { remote: { users } } = await rtc.getRoomInfo()
    context.commit('setInvUserList', users)
    // TODO 从服务上获取nickName
  },
  // 获取互动房间黑名单用户列表
  async getInvUserBlackList(context) {
    const roomId = context.state.room?.roomId
    if (!roomId) return
    const { data } = await api.roomKickUserList(roomId)
    for (const user of data) {
      context.commit('addInvaBlackUserSet', user)
    }
  },
  // 获取聊天在线用户信息
  async getOnlineImUser(context) {
    const roomId = context.state.room?.roomId
    if (!roomId) return
    let page = 1
    const { data, count } = await api.roomOnlineUser(roomId, page, 240)
    context.commit('setImOnlineUserTotal', count)
    if (data.length) {
      context.commit('clearImUserList', data)
      context.commit('setImUserList', data)
    }
  },
  // 获取聊天在线用户人数
  async getOnlineImUserNumber(context) {
    const chat = context.state.sdk.$chat
    if (!chat) return console.warn('getOnlineImUserNumber: chat instance not found')
    const param = {
      currPage: 1, //当前页
      pageSize: 1 // 每页大小
    }
    const { total } = await new Promise((resolve, reject) => chat.getOnlineInfo(param, resolve, reject))
    context.commit('setImOnlineUserTotal', total)
    if (total <= 400 && total !== context.state.imUserList.length) {
      context.dispatch('getOnlineImUser')
    }
  },
  // 设置旁路
  async setAnotherPush (context, open) {
    const now = Date.now()
    const roomId = context.state.room.roomId
    // 桌面共享优先为最大屏占比
    if (open) {
      // 在直播中
      if (context.state.live) return
      const maxScreenStream = context.state.stream.desktop?.streamId || context.state.stream.local?.streamId
      if (!maxScreenStream) {
        // debugger
      }
      // 开始旁路直播
      await api.roomAnother(roomId, true, maxScreenStream, now)
      const identity = context.state.user.identity
      window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-直播中-${VH_TITLE}`
      context.commit('setStartLiveStat', { time: now })
    } else {
      if (!context.state.live) return
      // 停止旁路直播
      await api.roomAnother(roomId, false)
      // await context.dispatch('setAnotherPush', false)
      const identity = context.state.user.identity
      window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-${VH_TITLE}`
      context.commit('setStopLiveStat')
    }
  },
  // 开始推流
  async publish (context, data) {
    const type = data?.type ?? 'local'
    let streamId = context.state.stream?.[type]?.streamId
    if (!streamId) return

    const stream = getStreamInfo(context.state.sdk.$rtc, streamId)
    if (stream?.status !== 1) {

      // 开始推流
      if (!context.state.stream[type].publishing) {
        context.state.stream[type].publishing = true
        try {
          await context.state.sdk.$rtc.publish({ streamId })
        } catch (e) {
          context.state.stream[type].publishing = false
          console.error('开始推流失败', e)
          throw e
        }
      }

      const stream = getStreamInfo(context.state.sdk.$rtc, streamId)
      if (stream?.status !== 1) {
        context.state.stream[type].publishing = false
        throw new Error('推流失败')
      }
    } else {
      context.state.stream[type].publishing = true
    }

    const identity = context.state.user.identity
    window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-${VH_TITLE}`
    return true
  },
  // 停止推流
  async unpublish (context, data) {
    const type = data?.type ?? 'local'
    if (!context.state.sdk.$rtc) return console.warn('unpublish: rtc instance not found')
    let streamId = context.state.stream?.[type]?.streamId
    if (!streamId) return
    context.commit('delLocalStream', streamId)
    // 停止推流 (会销毁本地流)
    try {
      await context.state.sdk.$rtc.unpublish({ streamId }).catch(e => e)
    } catch (e) {
      console.error('停止推流失败', e)
    }
    /** 直播流状态上报 */
    // context.commit('clearRoomData')
    return true
  },
  // 更新混流主要屏幕
  async setPublishMainScreen (context, { streamId }) {
    if (!context.state.sdk.$rtc) return console.warn('setPublishScreen: rtc instance not found')
    if (!streamId) return
    // const layout = window.VhallRTC.CANVAS_LAYOUT_PATTERN_FLOAT_6_5D
    const mainScreenStreamId = streamId
    await promisify(context.state.sdk.$rtc, context.state.sdk.$rtc.setBroadCastScreen)({ mainScreenStreamId })
  },
  async checkLocalStream (context, opt) {
    opt = opt || {}
    if (!context.state.sdk.$rtc) return console.warn('checkLocalStream: rtc instance not found')
    // 关闭直播
    if (opt.endLive) {
      const streamId = context.state.stream?.local?.streamId
      if (context.state.live && streamId && streamId === opt.streamId) {
        context.dispatch('setAnotherPush', false)
        context.dispatch('unpublish', { type: 'local' })
        context.dispatch('unpublish', { type: 'desktop' })
      }
    } else {
      // 检查
      const local = context.state.stream?.local
      const desktop = context.state.stream?.desktop
      const streamL = local?.streamId ? getStreamInfo(local.streamId) : null
      const streamD = desktop?.streamId ? getStreamInfo(desktop.streamId) : null

      if (local && streamL) {
        // 尝试重新推流
        if (local.publishing && streamL.status !== 1) {
          context.dispatch('publish', { type: 'local' })
        }
      }
      if (desktop && streamD) {
        // 尝试重新推流
        if (local.publishing && streamL.status !== 1) {
          context.dispatch('publish', { type: 'desktop' })
        }
      }
      //
    }
  }
}
