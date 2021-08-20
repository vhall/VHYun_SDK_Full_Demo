<template>
  <div class="home">
    <MainHeader :liveChange="() => null"/>
    <div class="home-content" :class="{ side: hasOp, sm2: $store.state.smChange }">
      <!-- 主内容-->
      <MainContent/>

      <!-- 嘉宾观众申请上麦-->
      <div class="user-action-warp" v-if="!isVod && livein">
        <div class="action-setting" @click="$root.$emit('showSetting')" v-show="$store.getters.hasMeStreamPublish">
          <i class="iconfont iconicon-shezhi"></i>
        </div>
        <div class="action-inav-request">
          <Button round class="live_btn" type="primary" :disabled="disableInvaApply && !$store.state.imOnline" @click="clickInvaApply">
            {{ $store.getters.hasMeStreamPublish ? '下麦' : '申请上麦' }}
          </Button>
        </div>
      </div>

      <!-- 右上播放-->
      <div class="user-header">
        <MainSmallWindow />
      </div>

      <!-- 右下用户列表-->
      <MainUser/>
    </div>
  </div>
</template>

<script>
import {safeParse, VH_TITLE} from '@/utils'
import * as api from '@/common/api'
import {createLocalStream} from '@/utils/stream'
import {initRTC} from '@/utils/sdk'
import Button from '@/components/Button'
import {inavApi, roomApi} from '@/common/api'
import {BUS_CUSTOM_EVENTS, BUS_EVENTS, BUS_LOCAL_EVENTS} from '@/common/contant'
import {
  checkSdkOpt,
  IDENTITY,
  isSecure,
  promisify,
  requestAccessPermissions,
  requestAccessPermissionsAndTip,
  wait
} from '@/utils'
import {Bus} from '@/message/bus'
import VhDialog from '@/components/Modal'
import DeviceDialogCtor from '@/components/Modal/components/device'
import ConfirmDialogCtor from '@/components/Modal/components/confirm'
import {createStore} from '@/store'
import MainHeader from './MainHeader'
import MainUser from './MainUser'
import MainContent from './MainContent'
import {rtcListen} from '../shard/sdk'
import MainSmallWindow from "./MainSmallWindow"

export default {
  name: 'Main',
  components: {MainHeader, MainUser, MainContent, MainSmallWindow, Button},
  props: ['viewData', 'store'],
  data: () => ({
    IDENTITY: IDENTITY,
    rtc: null,
    deviceSelect: 0,
    deviceSelectMust: false,
    attributes: null,
    restoreLive: false,
    autoPublish: false,
    disableInvaApply: false,
  }),
  computed: {
    hasOp: function () {
      return this.$store.getters.hasOp
    },
    isMaster: function () {
      return this.$store.getters.isMaster
    },
    chat: function () {
      return this.$store.getters.chat
    },
    livein() {
      return this.$store.getters.livein
    },
    isVod() {
      return this.$store.getters.isVod
    }
  },
  beforeCreate() {
    this.$store = createStore()
    this.$bus = new Bus()
    this.$once('hook:beforeDestroy', () => this.$bus.destroy())
    this.$bus.vm = this
    this.$bus.store = this.$store
    if (process.env.NODE_ENV !== 'production') {
      window.store = this.$store
      window.vm = this
    }
  },
  async mounted() {
    let roomId, identity, viewData, isVod
    identity = this.$store.state.user.identity
    roomId = this.$route.params.roomId
    viewData = this.viewData // $route.matched[0].props['viewData']
    isVod = viewData.room.isVod
    // 直播进行中
    this.restoreLive = viewData.room.status === 3 // && pageIsReload()
    await this.$store.commit('setRoomEnterData', viewData)
    inavApi.roomId = roomId
    if (isVod) document.title = viewData.room.title + ' - ' + VH_TITLE
    await this.setupBusOption()
    await this.addExitListener()
    await this.addInavListener()
    try {
      await this.$bus.init()
    } catch (e) {
      if (!isVod) return this.$message.error('消息sdk初始化失败')
    }

    await this.$nextTick()
    // 进入房间
    await this.enterRoomStart(roomId)
  },
  methods: {
    // 退出事件
    async addExitListener() {
      if (this.isVod) return
      if (!this.isMaster) return
      const roomId = this.$store.getters.roomId
      window.addEventListener('beforeunload', event => {
        if (!this.$store.getters.livein) return
        // 直播中，弹出提示
        event.preventDefault()
        event.returnValue = '正在直播中，这将会关闭直播'
        return false
      })
      window.addEventListener('unload', event => {
        if (!this.$store.getters.livein) return
        api.roomApi.unload(roomId)
        this.destroySDK()
      })
    },
    async requestRtcAccess() {
      await requestAccessPermissionsAndTip(() => {
        this.$message.error('请点击左上角允许网页获取摄像头及麦克风')
      }, () => {
        // 未能获取到设备（被拒绝）
        this.$message.error('请点设置允许网页获取摄像头，并刷新网页，否则无法正常使用')
      })
    },
    async setupBusOption() {
      const user = this.$store.getters.getUser
      const sdk = this.$store.getters.getSdkOption
      const context = {nick_name: user.nickName, avatar: user.avatar, identity: user.identity}
      const option = {
        appId: sdk.appId,
        accountId: sdk.accountId,
        token: sdk.token,
        channelId: sdk.paasImId,
        identity: sdk.identity,
        context: context,
        hide: false
      }
      this.$bus.setOption(option)
    },
    // 事件监听（上下麦、表单填写等）
    async addInavListener() {
      const self = this
      const bus = this.$bus

      function onBus(event, fn) {
        const $fn = fn.bind(self)
        bus.on(event, $fn)
        self.$once('hook:beforeDestroy', () => bus.off(event, $fn))
      }

      // 收到上麦事件，进行上麦操作（观众）
      this.$root.$on(BUS_LOCAL_EVENTS.INVA_PUBLISH_OP, this.invaPublishAction.bind(this))
      // 房间异常断开
      this.$root.$on('EVENT_ROOM_EXCDISCONNECTED', this.onExcdisconnected.bind(this))

      // 设置的设备更改
      this.$root.$on(BUS_LOCAL_EVENTS.SETTINGS_CHANGE, () => {
        // 没有流
        if (!this.$store.getters.hasMeStreamPublish) return
        this.changeDevice()
      })

      // 初始化
      onBus(BUS_LOCAL_EVENTS.CHAT_INIT, function () {
        this.$store.state.chat = this.$bus.chat
      })

      // 聊天
      onBus(BUS_EVENTS.CHAT, function (chat) {
        this.$root.$emit(BUS_LOCAL_EVENTS.INVA_CHAT, chat)
      })
      !this.isVod && onBus(BUS_CUSTOM_EVENTS.LIVE_START, async function () {
        await this.$nextTick()
        await wait(100)
        this.$root.$emit('startInitDoc')
      })
      !this.isVod && onBus(BUS_CUSTOM_EVENTS.LIVE_START_ANOTHER, async function () {
        if (this.$store.getters.livein) {
          console.log('直播继续推流')
        }
        else this.$message('直播已开始')
      })
      !this.isVod && onBus(BUS_CUSTOM_EVENTS.LIVE_STOP, function () {
        this.$store.state.liveStatus = 4
        if (!this.$store.getters.livein) return
        this.$message('直播已结束')
      })
      !this.isVod && onBus(BUS_CUSTOM_EVENTS.LIVE_STOP_ANOTHER, function () {
        this.$store.state.liveStatus = 4
        if (!this.$store.getters.livein) return
        this.$message('直播已结束')
      })

      // 观众/嘉宾
      if (!this.isVod) {
        // 被下麦
        onBus(BUS_CUSTOM_EVENTS.DOWN, this.invaUnPublishAction)
        onBus(BUS_CUSTOM_EVENTS.DOWN_ALL, this.invaUnPublishAction)
        // 被同意上麦
        onBus(BUS_CUSTOM_EVENTS.REQUEST_CALLBACK_AGREE, async function (ev) {
          self.$root.$emit(BUS_LOCAL_EVENTS.INVA_PUBLISH_OP, { })
        })
        onBus(BUS_CUSTOM_EVENTS.KICK, async function (ev) {
          this.$message.warning('您已被踢出')
          // 等待提示显示出来一会
          await wait(500)
          const roomId = self.$store.getters.roomId
          // 跳转到进入直播间
          await this.$router.replace({name: 'home', query: {type: 2, roomId: roomId || ''}})
        })
        // 收到上麦邀请（是否同意）
        onBus(BUS_CUSTOM_EVENTS.INVITER, this.invaInviterQuest)
        onBus(BUS_CUSTOM_EVENTS.SEND_FORM, function (ev) {
          this.$message('主持人发布了新的问卷')
        })
        !this.isVod && onBus(BUS_CUSTOM_EVENTS.LIVE_STOP, function () {
          this.$store.dispatch('unpublishSelf')
        })
      }
    },
    // 进入互动房间第一步
    async enterRoomStart(roomId) {
      const self = this
      // 如果是恢复互动，询问是否继续推流
      if (!this.isVod && this.restoreLive && this.isMaster) {
        const onClose = async (ok) => {
          if (!ok) {
            roomApi.another(roomId, false).catch(() => null)
            await wait(50)
            return self.$router.push({ name: 'home' })
          }
          this.$root.$emit('startInitDoc')
          await self.invaPublishMaster()
        }
        const opt = {title: '继续直播', closeText: '结束直播', confirmText: '继续直播', content: '直播尚未结束，是否继续直播？', onClose}
        VhDialog.open(ConfirmDialogCtor, this, opt)
        return
      }
      await wait(50)
      // 否则创建本地流，然后推流，不旁路
      if (!this.isVod && this.isMaster) {
        const rs = await this.tryCreateLocalStream(true)
        if (rs) this.$store.commit('setLocalStream', {streamId: rs.streamId, audio: rs.audio, video: rs.video})
      }

      this.$root.$emit('startInitDoc')
    },

    // 房间异常断开
    async onExcdisconnected() {
      if (!this.livein) return
      if (!this.hasOp) return
      if (this.reInitRtcing) return
      this.reInitRtcing = true
      try {
        await this.$store.dispatch('checkLocalStream')
        this.reInitRtcing = false
        // return
      } catch (e) {
        console.error('onExcdisconnected', e)
      }

      console.warn('房间异常断开，重新初始化互动sdk')
      const old = this.$store.state.rtc
      if (old) {
        this.$store.state.rtc = null
        this.rtc = null
        old.destroyInstance().catch(() => null)
      }

      // 重新初始化
      const option = this.$store.getters.getSdkOption
      try {
        this.$store.state.rtc = await this.tryInitAndSetRtc(option)
      } catch (e) {
        this.reInitRtcing = false
        roomApi.report(this.$store.getters.roomId, e)
        return this.$message.error('互动房间重连失败')
      }
      this.reInitRtcing = false
      this.$message.info('互动房间重连成功')

      // 上麦
      const streamId = this.$store.state.stream.local?.streamId
      // 桌面共享，开了共享，但是没有推 #26989
      const desktopId = this.$store.state.stream?.desktop?.streamId

      if (streamId) this.$store.commit('setLocalStream', {})
      if (desktopId) this.$store.commit('setLocalDesktopStream', {})
      if (this.isMaster) await this.invaPublishMaster()
      // 因为桌面共享需要选择，所以不恢复桌面共享
      // if (desktopId) this.openDesktopShare({to: 'desktopShare', from: ''})
    },

    // 初始化房间数据
    async init(sdk) {
    },

    // 观众/嘉宾进行上麦操作
    async invaPublishAction(data) {
      // invite 同意邀请
      // request 上麦请求被同意
      const user = Object.assign({}, this.$store.getters.getUser)
      const sdkOption = Object.assign({}, this.$store.getters.getSdkOption)
      const roomId = sdkOption?.roomId
      let streamId
      let rtc = this.rtc

      if (!isSecure()) return this.$message.error('无法响应上麦，请使用https访问')

      try {
        await requestAccessPermissions()
      } catch (e) {
        this.$message.error('请同意访问摄像头和麦克风，否则无法上麦')
        return
      }

      // 如果没有初始化过rtc，则初始化
      if (!rtc) {
        try {
          if (!checkSdkOpt(sdkOption)) return this.$message.error('缺少参数，无法初始化sdk')
          rtc = await this.tryInitAndSetRtc(sdkOption, user)
          const cancel = await rtcListen(rtc, this)
          this.$once('hook:beforeDestroy', cancel)
          await wait(50)
        } catch (err) {
          const t = '互动工具初始化错误: ' +  err.message
          this.$message.error(t)
          roomApi.report(roomId, err)
          this.rtc = null
          this.$store.state.rtc = null
          this.$store.state.stream.local = null
          if (rtc) return rtc.destroyInstance()
        }
      }

      // 强制关闭小窗模式
      // this.$store.state.smChange = false

      // 摄像头流
      if (!streamId) {
        try {
          const rs = await this.tryCreateLocalStream(false)
          if (rs) streamId = rs.streamId
          if (rs) this.$store.commit('setLocalStream', {streamId: rs.streamId, audio: rs.audio, video: rs.video})
        } catch (err) {
          const t = '摄像头捕获出错: ' +  err.message
          this.$message.error(t)
          roomApi.report(roomId, `<invaPublish> ${t}`)
          this.rtc = null
          this.$store.state.rtc = null
          this.$store.state.stream.local = null
          rtc.destroyInstance()
        }
      }

      // 设置rtc实例
      this.rtc = rtc
      this.$store.state.rtc = rtc
      await this.$nextTick()

      // 上麦（推流）
      try {
        await this.$store.dispatch('publish', {type: 'local'})
      } catch (err) {
        const t = '上麦出错: ' +  err.message
        this.$message.error(t)
        roomApi.report(roomId, err)
        this.rtc = null
        this.$store.state.rtc = null
        this.$store.state.stream.local = null
        rtc.destroyInstance()
      }
    },
    // 观众/嘉宾进行下麦操作
    async invaUnPublishAction() {
      const rtc = this.rtc
      await this.$store.dispatch('unpublishSelf', { rtc }).catch(() => null)
      // 销毁
      this.rtc = null
      this.$store.state.rtc = null
    },
    // 被邀请上麦
    async invaInviterQuest(ev) {
      const self = this
      const token = ev && (ev.token || ev.data.token)
      // 正在麦上
      if (this.$store.getters.hasMeStreamPublish) return
      const onClose = async (ok) => {
        // 拒绝了
        if (!ok) return self.$store.dispatch('inavInviterCallback', { status: 2 })
        // 同意了
        await self.$store.dispatch('inavInviterCallback', { status: 1 })
        // 触发上麦事件，进行上麦操作
        const params = {type: 'invite', streamType: 1, publishType: 'local', autoPublish: true, token}
        self.$root.$emit(BUS_LOCAL_EVENTS.INVA_PUBLISH_OP, params)
      }
      const opt = {title: '提示', content: '您收到一条上麦邀请，是否确定上麦？', countdown: 15, onClose}
      VhDialog.open(ConfirmDialogCtor, this, opt)
    },

    // 设备切换
    async changeDevice() {
      const originStream = this.$store.state.stream.local
      let streamId
      try {
        const rs = await this.tryCreateLocalStream(false)
        if (!rs) return this.$message.error('设备切换失败')
        streamId = rs.streamId
        this.$store.commit('setLocalStream', {streamId: rs.streamId, audio: rs.audio, video: rs.video})
        if (originStream) {
          // 切换摄像头
          await this.$store.dispatch('switchVideoDevice', { streamId, deviceId: rs.videoDevice })
          // 切换音频设备
          await this.$store.dispatch('switchAudioDevice', { streamId, deviceId: rs.audioDevice })
          // 删除旧的流
          this.$store.dispatch('unpublish', { streamId: originStream.streamId })
          // 已经切换就不用重推
          // return
        }
      } catch (e) {
        // 还原之前的流
        if (originStream) this.$store.commit('setLocalStream', {streamId: originStream.streamId, audio: originStream.audio, video: originStream.video})
        return this.$message.error('切换设备出错')
      }

      try {
        await this.$store.dispatch('publish', {type: 'local'})
      } catch (err) {
        const t = 'publish出错: ' +  err.message
        roomApi.report(this.$store.getters.roomId, err)
        return this.$message.error(t)
      }

      // 推流中
      if (this.livein) {
        // 更新混流布局
        if (!(this.livein && !this.$store.state.stream.desktop)) return
        await this.$store.dispatch('setBroadCastLayout', { }).catch(e => null)
        this.$store.dispatch('setPublishMainScreen', { stream: this.$store.state.stream.local.streamId })
      }
    },

    // 申请上麦/下麦
    async clickInvaApply() {
      const hasMeStreamPublish = this.$store.getters.hasMeStreamPublish
      // 下麦
      if (hasMeStreamPublish) {
        this.$bus.emit(BUS_CUSTOM_EVENTS.DOWN, {})
      }
      // 申请上麦
      else {
        if (!isSecure()) return this.$message.error('无法使用互动工具，请使用https访问')
        if (navigator.userAgent.indexOf('Firefox/') > 0) {
          return this.$message.error('互动工具暂不支持火狐')
        }
        this.disableInvaApply = true
        try {
          await this.$store.dispatch('inavRequest', { })
          this.$message.info('已申请上麦')
        } catch (e) {
          this.$message.error('申请上麦失败')
          this.disableInvaApply = false
        }
        // 等几秒才能再次点击
        await wait(1000 * 6)
        this.disableInvaApply = false
      }
    },

    // region 创建本地流
    // 尝试创建本地流 1摄像 2桌面共享 (并尝试设备选择)
    async tryCreateDesktopStream(mustStream) {
      // 已经弹出了设备选择
      if (this.deviceSelect) return
      let streamId
      const option = {
        video: true,
        audio: false,
        screen: true, //是否获取屏幕共享，选填，默认为false
        speaker: false, // 桌面共享是否分享音频(chrome浏览器弹框左下角显示“分享音频”选框)，选填，默认为true
        showControls: false, // 是否开启视频原生控制条，选填，默认为false
        videoDevice: 'desktopScreen',
      }
      const rtc = await this.tryInitAndSetRtc()

      // 桌面共享流 (每次都弹出设备选择)
      try {
        const rs = await this._createLocalStream(rtc, option, mustStream)
        streamId = rs && rs.streamId
      } catch (e) {
        this.$message(e.message)
        return
      }

      this.$store.commit('setLocalDesktopStream', streamId)
      return streamId
    },
    // 创建摄像头本地流
    async tryCreateLocalStream(mustStream) {
      // 已经弹出了设备选择
      if (this.deviceSelect) return
      const deviceOption = this.$store.state.localStreamOption
      const rtc = await this.tryInitAndSetRtc()

      try {
        const rs = await this._createLocalStream(rtc, deviceOption, mustStream)
        return rs
      } catch (e) {
        this.$message.error(e.message)
      }
    },
    // 创建本地流
    async _createLocalStream(rtc, deviceOption, mustStream) {
      const attributes = JSON.stringify(this.$store.getters.getUser)
      rtc = rtc || this.rtc
      let option = deviceOption ? Object.assign(deviceOption) : null
      let videoDevice
      let audioDevice
      let streamId
      let audio
      let video

      // 选择设备
      if (!option) {
        // 跳过（没有选择设备也应该有的，用的是默认选项）
        // 弹出设备选择，并获得参数
        const rs = await this.deviceSelectDialog(rtc, {type: 1, attributes, mustStream})
        option = rs && rs[1]
        // 取消了选择
        if (!option) return
        streamId = option.streamId
        delete option.streamId

        // 保存设置
        this.$store.commit('setLocalStreamOption', option)

        if (streamId) {
          const rs = await promisify(rtc, rtc.getStreamMute, true)({streamId})
          audio = !rs?.audioMuted ?? true
          video = !rs?.videoMuted ?? true
        }

        return {videoDevice, audioDevice, streamId, audio, video}
      }

      // 创建本地流
      option = Object.assign({}, {attributes}, option)
      const data = await createLocalStream(rtc, option)

      return data // { streamId, audio, video }
    },
    // 弹出设备选择
    async deviceSelectDialog(rtc, data) {
      if (this.deviceSelect) return
      if (!rtc) return
      this.deviceSelect = data?.type || 1
      const attributes = data.attributes ? typeof data.attributes === 'string' ? data.attributes : JSON.stringify(data.attributes) : undefined

      return new Promise((resolve, reject) => {
        const onSelect = (ok, settings) => {
          this.deviceSelect = 0
          dia.hide()
          resolve([ok, settings])
        }
        const opt = {attributes, rtc, onSelect, mustStream: data.mustStream}
        const dia = VhDialog.open(DeviceDialogCtor, this, opt)
        this.$once('hook:beforeDestroy', () => dia.hide())
      })
    },
    // endregion 创建本地流

    // region SDK初始化/销毁
    async tryInitAndSetRtc(sdkOption, user) {
      if (this.rtcInitLock) await this.rtcInitLock
      let resolve = function () {}
      this.rtcInitLock = new Promise(r => resolve = r)
      // if (this.$store.state.rtc) {
      //   this.rtc = null
      //   this.$store.state.rtc.destroyInstance({})
      //   this.$store.state.rtc = null
      // }

      try {
        if (!this.rtc) this.rtc = await this.initRTC(sdkOption, user)
      } catch (e) {
        this.rtcInitLock = null
        throw e
      }
      resolve()
      return this.rtc
    },
    // 初始化互动SDK
    async initRTC($sdkOption, $user) {
      // 注： VhallRTC.ROLE_AUDIENCE只能观看，无法上麦
      const role = window.VhallRTC.ROLE_HOST
      const sdkOption = $sdkOption || this.$store.getters.getSdkOption
      const attributes = JSON.stringify($user || this.$store.getters.getUser)
      const option = {
        role: role,
        appId: sdkOption.appId,
        inavId: sdkOption.paasInavId,
        roomId: sdkOption.paasLiveId,
        channelId: sdkOption.paasImId,
        accountId: sdkOption.accountId,
        token: sdkOption.token,
        attributes: attributes,
        hide: false
      }
      if (process.env.NODE_ENV !== 'production') console.time('初始化互动SDK')
      const {rtc, currentStreams} = await initRTC(option)
      if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化互动SDK')
      this.currentStreams = currentStreams || []

      // 记录正在推送的流，方便稍后订阅
      for (const stream of currentStreams) {
        const {accountId, streamId, streamType} = stream
        const attributes = safeParse(stream.attributes)
        this.$store.commit('addRemoteStream', {streamId, userId: accountId, streamType, attributes})
      }

      // 监听事件 （用户上线/下线，添加/移除流，黑名单事件，提前监听避免错过事件）
      await rtcListen(rtc, this)
      this.$on('hook:beforeDestroy', () => this.destroyRTC())
      return rtc
    },
    // 销毁互动SDK
    async destroyRTC() {
      const $rtc = this.$store.getters.rtc
      const stream = this.$store.state.stream
      if ($rtc) {
        try {
          if (stream.local) $rtc.destroyStream({streamId: stream.local.streamId}, Function.prototype, Function.prototype)
          if (stream.desktop) $rtc.destroyStream({streamId: stream.desktop.streamId}, Function.prototype, Function.prototype)
        } catch (e) {
          console.error(e)
        }
        try {
          $rtc.destroyInstance({})
        } catch (e) {
          console.error(e)
        }
        this.sdk = null
        this.$store.state.rtc = null
      }
    },
    // 销毁sdk
    destroySDK() {
      this.destroyRTC()
      const bus = this.$bus
      bus.destroy()
      if (typeof VhallMsg !== 'undefined' && VhallMsg.OLD_BASE && VhallMsg.OLD_BASE.channlIdMap) {
        VhallMsg.OLD_BASE.channlIdMap = {}
      }
    }
    // endregion SDK
  },
  beforeDestroy() {
    inavApi.roomId = null
    try {
      this.destroySDK()
      this.$store.commit('resetRoomData')
    } catch (e) {
      console.error(e)
    }
    if (this.rtc) {
      this.rtc.destroyInstance()
      this.rtc = null
      this.$store.state.rtc = null
    }
  },
  watch: {
    chat: function (chat) {
      if (!chat) return
      if (this.$store.state.room.isVod) return
      this.init()
    },
  }
}
</script>

<style lang="less">
.home {
  display: flex;
  flex-direction: column;
  // max-height: 100vh;
  justify-content: space-between;
  // overflow: hidden;
  height: 800px;
  width: 1280px;
  margin: auto;

  .user-action-warp {
    //width: 100%;
    background-color: #0F0F0F;
    height: 56px;
    position: relative;
    display: flex;
    .action-setting {
      width: 32px;
      height: 32px;
      position: absolute;
      left: 10px;
      margin: 12px;
      background-color: #363636;
      border-radius: 100%;
      display: flex;
      color: #aaaaaa;
      cursor: pointer;
      i {
        margin: auto;
      }
    }
    .action-inav-request {
      margin: auto;
    }
    .action-inav-request /deep/ button[disable] {
      pointer-events: none;
      background: #3f79b1;
      border-color: #000;
      color: #b3b3b3;
      cursor: not-allowed;
    }
  }
}

.home-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  flex: none;
  height: 100%;
  //min-height: 800px;
  flex-grow: 1;
  overflow: hidden;
  flex-basis: 0;
  flex-wrap: wrap;

  // 侧边栏
  .main-side {
    min-height: 700px;
    height: 100%;
    flex-grow: 1;
    overflow: hidden;
    flex-shrink: 0;
    order: 0;
  }

  // 用户列表
  .main-user {
    order: 9;
    flex-grow: 1;
    z-index: 0;
    height: 500px;
  }

  // 主内容
  .main-content {
    min-height: 680px;
    width: 980px;
  }

  .user-action-warp {
  }

  // 右上
  .user-header {
    width: 300px;
    flex-grow: 0;
    flex-shrink: 0;
  }
}

// 小窗模式
.home-content.sm2 {
  // 隐藏非主要功能
  .main-content {
    flex-grow: 0;

    .brush-box {
      display: none !important;
    }

    .fileList {
      display: none !important;
    }

    .fileMenuBox {
      display: none !important;
    }

    .preview-mark {
      display: none !important;
    }

    .doc-box {
      pointer-events: none;
    }

    .docFileView {
      border: none;
    }

  }

  // 右上移动到内容区时隐藏功能
  .user-header {
    flex-grow: 1;
    .licode_player {
      video {
        object-fit: contain;
      }
    }
    .moreInfo {
      display: none;
    }
  }

  .remote-stream-list {
    height: 30px;
    width: 100%;
    position: absolute;
    z-index: 9;
    bottom: 0;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 30%);
    justify-content: flex-start;
    pointer-events: none;

    .StreamItem {
      width: 48px !important;
      .moreInfo {
        display: none;
      }
      .more-info {
        display: none;
      }
      .debug {
        display: none;
      }
    }
  }
}


/* 页面转换 */
.home-content {
  .main-content {
    order: 4;
    width: 980px;
  }
  .user-action-warp {
    order: 5;
  }
  .user-header {
    order: 6;
    width: 300px;
  }
}
.home-content.sm2 {
  .main-content {
    order: 6;
    width: 300px;
    height: 170px;
    flex-grow: 0;
    min-height: 170px;
    overflow: hidden;
  }
  .user-action-warp {
    order: 5;
  }
  .user-header {
    order: 4;
    width: 980px;
    min-height: 600px;
    flex-basis: 600px;
    //height: 100%;
  }
}

.home-content.side {
  .main-content {
    order: 4;
    width: 900px;
  }
  .user-action-warp {
    order: 5;
  }
  .user-header {
    order: 6;
    width: 300px;
  }
}
.home-content.side.sm2 {
  .main-content {
    order: 6;
    width: 300px;
    height: 170px;
    flex-grow: 0;
    min-height: 170px;
  }
  .user-action-warp {
    order: 5;
  }
  .user-header {
    order: 4;
    width: 900px;
    //height: 100%;
    min-height: 600px;
  }
}

</style>
