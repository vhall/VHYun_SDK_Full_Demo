import { IDENTITY_NAME, localStoragePrefix, promisify, VH_TITLE, wait } from '@/utils'
import { safeParse } from '@/utils'
import * as api from '@/common/api'
import { inavApi, roomApi } from '@/common/api'

const inavData2 = {
  // 获取/刷新聊天在线用户人数
  async getOnlineImUserNumber(context) {
    const roomId = context.getters.roomId
    if (!roomId) return
    const total = await api.inavApi.onlineCount(roomId)
    context.commit('setImOnlineUserTotal', total)
    if (total <= 400 && total !== context.state.imUserList.length) {
      context.dispatch('getOnlineImList')
    }
  },
  // 加载保存的申请列表
  async getInvaRequestList(context) {
    const rs = await inavApi.inavList()
    if (!Array.isArray(rs.data)) return
    for (const item of rs.data) {
      if (item.type !== 1) continue
      context.commit('setInvaRequestStat', { userId: item.accountId, stat: 1, noDot: true })
    }
  },
  // 获取聊天在线用户信息
  async getOnlineImList(context) {
    const users = []
    const rs0 = await inavApi.onlineList()
    for (const item of rs0.data) {
      users.push(item)
    }
    context.commit('setImUserList', users)
  },
  async getKickList(context) {
    const rs = await api.inavApi.kickList()
    if (!Array.isArray(rs.data)) return
    context.commit('remakeInvaBlackUserSet', rs.data)
  },
  async getInavList(context) {
    const rs = await api.inavApi.inavList()
    if (!Array.isArray(rs.data)) return
    context.commit('remakeInvaRequestUserSet', rs.data)
  },

  // 加载保存的选择的本地设备
  async loadLocalStreamOption(context) {
    const opt = safeParse(window.sessionStorage.getItem(localStoragePrefix + 'localStreamOption1'))
    if (opt) context.commit('setLocalStreamOption', opt)
  },
}

const room = {
  // 设置旁路
  async setAnotherPush (context, open) {
    const now = Date.now()
    const roomId = context.state.room.roomId
    // 桌面共享优先为最大屏占比
    if (open) {
      const rtc = context.getters.rtc
      const maxScreenStream = context.state.stream.desktop?.streamId || context.state.stream.local?.streamId
      const type = context.state.stream.desktop?.streamId ? 'desktop' : 'local'
      // 判断推流状态
      const s = rtc.getLocalStreams()[maxScreenStream]
      if (s && !s.isPublished) await context.dispatch('publish', { type })
      // 在直播中
      // if (context.getters.livein) return

      const layout = type === 'desktop' ? 'CANVAS_LAYOUT_PATTERN_GRID_1' : null
      // 开始旁路直播
      await api.roomApi.another(roomId, true, maxScreenStream, now, layout)
      if (context.getters.livein) return
      const identity = context.state.user.identity
      window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-直播中-${VH_TITLE}`
      context.commit('setStartLiveStat', { time: now })
    } else {
      if (!context.getters.livein) return
      // 停止旁路直播
      await api.roomApi.another(roomId, false)
      // await context.dispatch('setAnotherPush', false)
      const identity = context.state.user.identity
      window.document.title = `${context.state.user.nickName}-${IDENTITY_NAME[identity]}-${VH_TITLE}`
      context.commit('setStopLiveStat')
    }
  },
  // 切换推流
  async switchVideoDevice(context, data) {
    if (!context.getters.rtc) return console.warn('switchDevice: rtc instance not found')
    const rtc = context.getters.rtc
    rtc.switchDevice({ streamId: data.streamId, type: 'video', deviceId: data.deviceId })
  },
  async switchAudioDevice(context, data) {
    if (!context.getters.rtc) return console.warn('switchDevice: rtc instance not found')
    const rtc = context.getters.rtc
    rtc.switchDevice({ streamId: data.streamId, type: 'audio', deviceId: data.deviceId })
  },
  // 开始推流
  async publish (context, data) {
    const type = data?.type ?? 'local'
    let streamId = context.state.stream?.[type]?.streamId
    if (!streamId) return
    const rtc = context.getters.rtc

    // 判断推流状态
    const stream = rtc.getLocalStreams()[streamId]
    if (!stream?.isPublished) {
      // 开始推流
      if (!context.state.stream[type].publishing) {
        context.state.stream[type].publishing = true
        try {
          await rtc.publish({ streamId })
        } catch (e) {
          context.state.stream[type].publishing = false
          roomApi.report(context.getters.roomId, e)
          console.error('开始推流失败', e)
          throw e
        }
      }

      // 再次判断推流状态
      await wait(300)
      const stream = rtc.getLocalStreams()[streamId]
      if (!stream?.isPublished) {
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
    if (!context.getters.rtc) return console.warn('unpublish: rtc instance not found')
    let streamId = data.streamId || context.state.stream?.[type]?.streamId
    if (!streamId) return
    context.commit('delLocalStream', streamId)
    // 停止推流 (会销毁本地流)
    try {
      await context.getters.rtc.unpublish({ streamId }).catch(e => e)
    } catch (e) {
      console.error('停止推流失败', e)
    }
    /** 直播流状态上报 */
    // context.commit('clearRoomData')
    return true
  },
  // 更新混流主要屏幕
  async setPublishMainScreen (context, { streamId }) {
    if (!context.getters.rtc) return console.warn('setPublishScreen: rtc instance not found')
    if (!streamId) return
    const mainScreenStreamId = streamId
    await promisify(context.getters.rtc, context.getters.rtc.setBroadCastScreen)({ mainScreenStreamId })
  },
  // 设置混流布局
  async setBroadCastLayout (context, { layout }) {
    if (!context.getters.rtc) return console.warn('setPublishScreen: rtc instance not found')
    if (!layout && layout !== 0) layout = window.VhallRTC.CANVAS_LAYOUT_PATTERN_FLOAT_6_5D
    // const layout = window.VhallRTC.CANVAS_LAYOUT_PATTERN_GRID_1
    // const layout = window.VhallRTC.CANVAS_LAYOUT_PATTERN_FLOAT_6_5D
    await promisify(context.getters.rtc, context.getters.rtc.setBroadCastLayout)({ layout })
  },
  async checkLocalStream (context, opt) {
    opt = opt || {}
    const livein = context.getters.livein
    // if (!livein) return
    const rtc = context.getters.rtc
    if (!rtc) throw new Error('not rtc')

    // 检查
    const local = context.state.stream?.local
    const desktop = context.state.stream?.desktop
    const streamL = local?.streamId ? rtc.getLocalStreams()[local.streamId] : null
    const streamD = desktop?.streamId ? rtc.getLocalStreams()[desktop.streamId] : null

    // 推流中的流断开
    if (opt.streamId && opt.streamId === (local && local.streamId)) {
      await context.dispatch('setAnotherPush', false)
      return
    }

    // 桌面共享
    if (desktop) {
      if (!streamD) {
        context.commit('delLocalStream', desktop.streamId)
      }
      else {
        // 尝试重推
        await context.dispatch('publish', { type: 'desktop' })
      }
    }

    // 摄像头
    if (local) {
      if (!streamL) {
        console.error('本地流不存在了')
        return
      }
      else {
        // 尝试重新推流
        await context.dispatch('publish', { type: 'local' })
      }

      if (local.publishing && streamL.status !== 1) {
        await context.dispatch('publish', { type: 'local' })
      }
    }

    if (!local && !desktop) {
      console.log('直播已断开')
    }

    // TODO 检查旁路是否断开
  },
  // 下麦自己（非主播）
  async unpublishSelf(context, data) {
    const rtc = context.getters.rtc || (data && data.rtc)
    if (!rtc) return
    // 删除本地流
    await rtc.unpublish({ streamId: context.stream?.local?.streamId }).catch(() => null)
    context.commit('setLocalStream', {})
    // 通知后端即将下麦
    context.dispatch('inavDownCall', {})
    rtc.destroyInstance().catch(() => null)
  },
  // 关闭麦克风
  async closeMic(context) {
    const rtc = context.getters.rtc
    const local = context.state.stream.local
    if (!local) return
    await promisify(rtc, rtc.muteAudio)({streamId: local.streamId, isMute: true})
    context.commit('setRemoteStreamAVStatus', {
      streamId: local.streamId,
      muteStream: {audio: true, video: !local.video}
    })
  },
  // 关闭摄像头
  async closeCamera(context) {
    const rtc = context.getters.rtc
    const local = context.state.stream.local
    if (!local) return
    await promisify(rtc, rtc.muteVideo)({streamId: local.streamId, isMute: true})
    context.commit('setRemoteStreamAVStatus', {
      streamId: local.streamId,
      muteStream: {audio: !local.video, video: true}
    })
  },
  // 打开麦克风
  async openMic(context) {
    const rtc = context.getters.rtc
    const local = context.state.stream.local
    if (!local) return
    await promisify(rtc, rtc.muteAudio)({streamId: local.streamId, isMute: false})
    context.commit('setRemoteStreamAVStatus', {
      streamId: local.streamId,
      muteStream: {audio: false, video: !local.video}
    })
  },
  // 打开摄像头
  async openCamera(context) {
    const rtc = context.getters.rtc
    const local = context.state.stream.local
    if (!local) return
    await promisify(rtc, rtc.muteVideo)({streamId: local.streamId, isMute: false})
    context.commit('setRemoteStreamAVStatus', {
      streamId: local.streamId,
      muteStream: {audio: !local.video, video: false}
    })
  },
}

const inav = {
  // 发送表单至聊天频道
  async sendForm(context, data) {
    if (!data) return
    const chat = context.getters.chat
    // if (chat.emitCustomChat) await chat.emitCustomChat({ type: BUS_CUSTOM_EVENTS.SEND_FORM, ...data })
    // else await new Promise((r, j) => chat.emit({ data: JSON.stringify(data), context: context.getters.getUser }, r, j))
  },
  // 文本聊天发送
  async emitTextChat(context, data /* string */) {
    const chat = context.getters.chat
    if (!data) return
    if (chat.emitTextChat) await chat.emitTextChat(data)
    else await new Promise((r, j) => chat.emitChat({ data, context: context.getters.getUser }, r, j))
  },
  // 禁言频道
  async switchAllMute(context, mute) {
    const chat = context.getters.chat
    if (chat.setChannelMute) await chat.setChannelMute({ mute: !!mute })
    else chat.setDisable({ type: mute ? 'disable_all' : 'permit_all', targetId: '' })
  },
  // (取消)禁言用户
  async setUserMute(context, { accounts, mute }) {
    const chat = context.getters.chat
    if (chat.setUserMute) await chat.setUserMute({ list: accounts, mute })
    else chat.setDisable({ type: mute ? 'disable' : 'permit', targetId: accounts[0] })
  },
  // (取消)踢出用户
  async setUserKick(context, { userId, kick }) {
    if (kick) await inavApi.kick(userId)
    else await inavApi.unkick(userId)
  },
  // 发送申请上麦
  async inavRequest(context) {
    await inavApi.request()
  },
  // 申请上麦确认(同意/拒绝)
  async inavRequestCallback(context, { userId, status }) {
    if (status === 1) await inavApi.requestCallbackAgree(userId)
    else await inavApi.requestCallbackReject(userId)
  },
  // 邀请上麦
  async inavInviter(context, { userId }) {
    if (!context.state.userMap[userId]) return
    await inavApi.inviter(userId)
    context.commit('setInavInviterStat', { userId })
  },
  // 邀请上麦确认(同意/拒绝)
  async inavInviterCallback(context, { status }) {
    if (status === 1) await inavApi.inviterCallbackAgree(status)
    else await inavApi.inviterCallbackReject(status)
  },
  // 下麦
  async inavDown(context, { userId }) {
    await inavApi.down(userId)
  },
  // 下麦所有人
  async downInavAll(context) {
    await inavApi.down('')
  },
  // 静音所有人
  async muteInavAll(context, { mute }) {
    await inavApi.handleDevice('', 'mic', mute)
  },
  // 关闭/开启用户设备（麦克风，摄像头）
  async inavCtrDevice(context, { device, userId, close, open }) {
    await inavApi.handleDevice(userId, device, close)
  },
  // 下麦通知后端
  async inavDownCall(context) {
    await inavApi.inavDownCall()
  },
  // 禁言
  async mute(context, { accountId }) {
    await inavApi.mute(accountId)
  },
  async unmute(context, { accountId }) {
    await inavApi.unmute(accountId)
  },
  async muteAll(context) {
    await inavApi.mute()
  },
  async unmuteAll(context) {
    await inavApi.unmute()
  },
}

export const actions = {
  ...room,
  ...inav,
  ...inavData2,
}
