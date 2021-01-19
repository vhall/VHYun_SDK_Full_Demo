<template>
  <div class="home">
    <MainHeader :liveChange="liveChange" />
    <div class="homeContent">
      <MainSide v-if="hasOp" :onSideChange="onSideChange" />
      <MainContent />
      <MainUser />
    </div>
  </div>
</template>

<script>
import { safeParse } from '@hapi/bourne'
import VhDialog from '@/components/Modal'
import ConfirmDialogCtor from '@/components/Modal/components/confirm'
import DeviceDialogCtor from '@/components/Modal/components/device'
import MainHeader from './MainHeader'
import MainUser from './MainUser'
import MainSide from './MainSide'
import MainContent from './MainContent'
import * as api from '@/common/api'
import { createLocalStream } from '@/utils/stream'
import { initRTC, initChat } from '@/utils/sdk'
import {checkBrowserEnv, checkSdkOpt, cookies, IDENTITY, localStoragePrefix, promisify, wait} from '@/utils'
import { imListenPre, rtcListen, rtcListenPre } from '@/views/Main/sdk'

const noneSdk = () => ({ $chat: null, $doc: null, $rtc: null })

export default {
  name: 'Main',
  components: { MainHeader, MainUser, MainContent, MainSide },
  data: () => ({
    IDENTITY: IDENTITY,
    sdk: noneSdk(),
    deviceSelect: 0,
    deviceSelectMust: false,
    attributes: null,
    restoreLive: false,
    autoPublish: false
  }),
  computed: {
    hasOp: function () {
      return this.$store.state.user.identity === IDENTITY.helper || this.$store.state.user.identity === IDENTITY.master
    },
    isMaster: function () {
      return this.$store.state.user.identity === IDENTITY.master
    },
    isPlayer: function () {
      return this.$store.state.user.identity === IDENTITY.player
    }
  },
  async mounted(){
    const cc = cookies()
    if (window.location.protocol === 'https') {
      if (!(cc && cc.roomId)) {
        // 重定向到登陆
        this.$router.replace('/')
        return
      }
    }
    let roomId = this.$store.state.room.roomId
    // 不是从其他已检查过环境的页面过来的，就检查一次浏览器环境
    if (!roomId) {
      const envCheckResult = checkBrowserEnv()
      if (envCheckResult) return this.$message.error(envCheckResult)
      // 恢复刷新前的房间数据
      await this.$store.dispatch('loadRestoreInvaData', this.$store.state.user.userId)
      await this.$nextTick()
    }
    // 房间基础检查
    const preCheckResult = await this.enterRoomPreCheck()
    if (preCheckResult) return this.$message.error(preCheckResult)
    // 加载保存的选择的本地设备
    await this.$store.dispatch('loadLocalStreamOption')

    roomId = this.$store.state.room.roomId
    if (!roomId) {
      // 重定向到登陆
      this.$router.replace('/')
      return
    }

    // 收到上麦事件，进行上麦操作
    this.$on('invaPublish', this.invaPublish)

    const isMaster = this.$store.state.user.identity === IDENTITY.master
    window.addEventListener('beforeunload', event => {
      // 直播中，弹出提示
      if (this.$store.state.live) {
        if (event) {
          event.preventDefault()
          event.returnValue = '正在直播中，这将会关闭直播'
          return true
        }
      }

      this.$store.dispatch('saveRestoreInvaData')
      return false
    })

    window.addEventListener('unload', event => {
      if (isMaster) api.sendBeaconAnother(roomId)
      this.$store.dispatch('saveRestoreInvaData')
      try {
        this.destroySDK()
      } catch (e) {
        console.error(e)
      }
    })

    if (isMaster && typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(localStoragePrefix)
      const ask = (ev) => {
        if (!ev || ev.data !== 'detect') return
        bc.postMessage({ type: 'ack', live: this.$store.state.live, user: this.$store.state.user, room: this.$store.state.room })
      }
      bc.addEventListener('message', ask)
      this.$once('hook:beforeDestroy', () => bc.close())
    }

    await this.$nextTick()
    // 进入房间
    await this.enterRoomStart(roomId)
  },
  methods: {
    // 房间检查
    async enterRoomPreCheck() {
      // 通过localStorage机制，检查是否打开了其他推流
      // 检测是仅仅是为了更好体验，不是必须
      if (this.$store.state.user.identity === IDENTITY.master) {
        // const check = await roomMasterLiveCheck
        // if (check) return '已在其他页面打开了主播端'
      }
    },
    // 进入互动房间第一步
    async enterRoomStart(roomId) {
      // 有roomId，说明是指定了互动房间
      this.restoreLive = this.isMaster && this.$store.state.room?.isLoad
      this.autoPublish = this.isMaster && this.$store.state.sdkOption?.isPublish
      if (process.env.NODE_ENV !== 'production') console.info('restoreLive: ', this.restoreLive)

      // 再次进入并检查，是否直播中
      if (this.$store.state.room?.isLoad && roomId) {
        try {
          // 请求加入互动数据，并设置房间需要的数据
          await this.$store.dispatch('execEnterRoom', { ...this.$store.state.user, roomId, isLoad: true })
        } catch (e) {
          this.$message.error(e.message || '进入互动房间失败')
        }
        await this.$nextTick()
      }

      // 初始化所有sdk
      const user = this.$store.state.user
      const sdkOption = this.$store.state.sdkOption
      sdkOption.roomId = this.$store.state.room.roomId
      try {
        this.sdk = await this.initSDK(sdkOption, user)
      } catch (e) {
        if (e.message === '已经被踢出无法加入') this.$router.replace('/')
        return
      }

      let streamId
      // 如果是恢复互动，则直接创建本地流，然后推流
      // 桌面共享暂时不处理
      if (this.restoreLive) {
        streamId = await this.invaPublish({ type: 'master', autoPublish: this.autoPublish })
        this.$store.commit('setSDK', this.sdk)
        const cancel = await rtcListen(this.sdk.$rtc, this)
        this.$once('hook:beforeDestroy', cancel)
        await this.$nextTick()
        // await this.$store.dispatch('publish', { type: 'local' })
        return
      }

      // 否则创建本地流，然后推流，不旁路 （嘉宾/助理/观众创建本地流不推流）
      if (this.isMaster) {
        streamId = await this.tryCreateLocalStream(1, true,1)
      }
      this.$store.commit('setSDK', this.sdk)
      await this.$nextTick()

      if (this.sdk.$rtc) {
        const cancel = await rtcListen(this.sdk.$rtc, this)
        this.$once('hook:beforeDestroy', cancel)
      }

      if (streamId) {
        if (process.env.NODE_ENV !== 'production') console.info('start publish stream')
        // await this.$store.dispatch('publish')
      }
    },

    // 开始推流
    async liveChange(on){
      if (process.env.NODE_ENV !== 'production') console.log('liveChange', on)
      // 推流
      if (on) {
        if (this.$store.state.live) return

        // 不存在本地流，则创建
        let streamId = await this.invaPublish( { type: 'master' })
        if (!streamId) {
          if (process.env.NODE_ENV !== 'production') console.log('liveChange: stream fail')
          return
        }
        await this.$nextTick()
        // 开始推流
        const e = await this.$store.dispatch('publish').catch(e => e)
        if (e instanceof Error) return this.$message.error(e.message)
        // 开始旁路直播
        try {
          await this.$store.dispatch('setAnotherPush', true)
        } catch (e) {
          console.error('旁路失败', e)
          this.$message.error('旁路失败')
          return
        }
        this.$root.$emit('startPublish')
      } else {
        if (!this.$store.state.live) return
        // 关闭旁路直播
        try {
          await this.$store.dispatch('setAnotherPush', false)
        } catch (e) {
          console.error('关闭旁路出错', e)
          this.$message.error('关闭旁路出错')
        }
        // 停止推流
        await this.$store.dispatch('unpublish', { type: 'desktop' }).catch(e => e)
        const e = await this.$store.dispatch('unpublish', { type: 'local' }).catch(e => e)
        if (e instanceof Error) return this.$message.error(e.message)
        this.$root.$emit('stopPublish')
      }
    },

    // 初始化房间数据
    async init(sdk){
      if (!this.sdk) this.sdk = sdk
      // 获取互动用户列表
      this.$store.dispatch('getInvUserList')
      // 互动黑名单列表
      this.$store.dispatch('getInvUserBlackList')
      // 加载上麦请求列表
      this.$store.dispatch('loadInvaRequest')
      // 获取聊天用户列表
      this.$store.dispatch('getOnlineImUser')
      // debugger
      this.$store.dispatch('saveRestoreInvaData')
    },

    // 进行上麦操作
    async invaPublish(data) {
      // invite 同意邀请
      // request 上麦请求被同意
      // master 主持人上麦（自动）
      const type = data?.type
      const streamType = data?.streamType ?? 1
      const publishType = data?.publishType ?? streamType === 1 ? 'local' : 'desktop'
      let streamId = this.$store.state.stream?.[publishType]?.streamId
      let rtc

      if (!streamId) {
        // 摄像头流
        streamId = await this.tryCreateLocalStream(streamType, type === 'master', 1)

        // 如果没有初始化过rtc，则初始化 (针对于"观众上麦")
        if (!this.sdk.$rtc) {
          const user = this.$store.state.user
          const sdkOption = this.$store.state.sdkOption
          if (!checkSdkOpt(sdkOption)) {
            this.$message.error('缺少参数，无法初始化sdk')
            return
          }
          try {
            rtc = await this.initRTC(sdkOption, user)
            this.sdk.$rtc = rtc
            this.$store.state.sdk.$rtc = rtc
            await this.$nextTick()
            const cancel = await rtcListen(this.sdk.$rtc, this)
            this.$once('hook:beforeDestroy', cancel)
          } catch (err) {
            this.$message.error(err.message)
            api.roomReport(sdkOption?.roomId, { type: 'sdk', target: 'initRTC', error: err.message })
            return
          }
        }
      }

      if (data.autoPublish && this.$store.state.sdk.$rtc) {
        // 上麦（推流）
        try {
          await this.$store.dispatch('publish', { type:  publishType })
        } catch (e) {
          console.error('上麦（推流）出错', e)
        }
      }
      return streamId
    },

    // 收到上麦邀请（是否同意）
    async invaInviteConfirmation() {
      if (!this.sdk.$rtc) return
      const onClose = async (ok) => {
        if (!this.sdk.$rtc) return
        // 拒绝了
        if (!ok) {
          this.sdk.$rtc.rejectInvite({}, Function.prototype, Function.prototype)
          return
        }
        // 同意了
        await promisify(this.sdk.$rtc, this.sdk.$rtc.consentInvite)({})
        // 触发上麦事件，进行上麦操作
        this.$emit('invaPublish', { type: 'invite', streamType: 1, publishType: 'local', autoPublish: true })
      }
      const opt = { title: '提示', content: '您收到一条上麦邀请，是否确定上麦？', countdown: 30, onClose }
      VhDialog.open(ConfirmDialogCtor, this, opt)
    },

    // 侧栏功能切换
    async onSideChange(prevId, side, cb) {
      const nextId = side.id
      // 非主持人，不可操作，如果是正在共享屏幕的情况下
      if (!this.isMaster) {
        const remote = this.$store.state.stream.masterDesktop?.streamId
        if (remote) return cb()
        return cb(side)
      }
      const remote = this.$store.state.stream.desktop?.streamId
      if (prevId !== nextId && nextId !== 'desktopShare' && prevId !== 'desktopShare') return cb(side)

      // 如果不在共享桌面，且切换目标是共享桌面，询问是否打开共享桌面
      if (!remote && nextId === 'desktopShare') {
        // 桌面共享 (先切过去，再选择和推流)
        cb(side)
        // 开启桌面共享
        const streamId = await this.tryCreateLocalStream(2, false, 1)
        await this.$nextTick()
        try {
          // 推流
          await this.$store.dispatch('publish', {streamId, type: 'desktop'})
        } catch (e) {
          // 共享失败了就删掉这个流
          this.$store.commit('delLocalStream', streamId)
          this.$message.error('共享桌面操作失败')
          if (this.sdk.$rtc) this.sdk.$rtc.destroyStream({ streamId })
        }
        // 设置主屏幕
        await this.$store.dispatch('setPublishMainScreen', { streamId })
        return
      }

      if (!remote) return cb(side)

      // 询问是否关闭桌面共享
      const onClose = async (ok) => {
        // 取消了
        if (!ok) return cb()
        // 确认了，进行关闭桌面共享
        const streamId = this.$store.state.stream.desktop?.streamId
        this.$store.commit('delLocalStream', streamId)
        if (this.sdk.$rtc) this.sdk.$rtc.destroyStream({ streamId })
        cb(side)
      }
      const opt = { title: '提示', content: '是否关闭桌面共享？', onClose }
      VhDialog.open(ConfirmDialogCtor, this, opt)
    },

    // region 创建本地流
    // 尝试创建本地流 1摄像 2桌面共享 (并尝试设备选择)
    async tryCreateLocalStream(type, mustStream, ttl = 0) {
      // 已经弹出了设备选择
      if (this.deviceSelect) return
      let deviceOption
      let streamId
      let attributes = '{}'
      // 桌面共享流 (每次都弹出设备选择)
      if (type === 2) {
        // 桌面共享每次都弹出设备选择
        // const res = await this.deviceSelectDialog({ type: 2, attributes })
        // if (!res) return
        // deviceOption = res[1]
        // 取消了选择
        // if (!deviceOption) return
        const res = await this._createLocalStream({
          video: true,
          audio: false,
          screen: true, //是否获取屏幕共享，选填，默认为false
          speaker: false, // 桌面共享是否分享音频(chrome浏览器弹框左下角显示“分享音频”选框)，选填，默认为true
          showControls:false, // 是否开启视频原生控制条，选填，默认为false
          videoDevice: 'desktopScreen',
        })
        // { streamId, audio, video }
        if (!res?.streamId) {
          if (res?.data?.error?.type === 'access-denied') {
            this.$message('桌面共享已取消')
            return
          }
          console.error('streamId not found', res)
          return
        }
        try {
          this.$store.commit('setLocalDesktopStream', res.streamId)
          return res.streamId
          // <del>已获得选择的设备和参数，尝试创建本地流</del> 已经有了
          // return await this._createLocalStream(deviceOption, attributes)
        } catch (e) {
          this.$message.error(e.message)
          return
        }
      }

      // 摄像流
      // 不存在之前的参数尝试，弹出设备选择
      deviceOption = this.$store.state.localStreamOption
      if (!deviceOption) {
        if (ttl <=0) {
          // 跳过（没有选择设备也应该有的，用的是默认选项）
          return
        }
        // 弹出设备选择，并获得参数
        const attributes = JSON.stringify(this.$store.state.user)
        const res = await this.deviceSelectDialog({ type: 1, attributes, mustStream })
        if (!res) return
        deviceOption = res[1]
        // 取消了选择
        if (!deviceOption) return
        streamId = deviceOption.streamId
        delete deviceOption.streamId
        if (!streamId) {
          console.error('streamId not found', streamId)
          return
        }
      }

      try {
        // 创建本地流
        if (streamId) {
          const res = await promisify(this.sdk.$rtc, this.sdk.$rtc.getStreamMute, true)({ streamId })
          const audio = !res?.audioMuted ?? true
          const video = !res?.videoMuted ?? true
          this.$store.commit('setLocalStream', {streamId, audio, video})
        } else {
          const res = await this._createLocalStream(deviceOption)
          if (!res?.streamId) {
            throw new Error('创建本地流失败：' + (res?.message || ''))
          }
          streamId = res.streamId
          this.$store.commit('setLocalStream', res)
        }
        // 设备有效，保存起来
        this.$store.commit('setLocalStreamOption', deviceOption)
        return streamId
      } catch (e) {
        // 如果ttl等于0，就不重试了
        if (ttl <= 0) {
          this.$message.error(e.message)
          return
        }
        // 获取本地流失败，调用自己重试一次
        await this.$nextTick()
        const streamId = await this.tryCreateLocalStream(type, mustStream, ttl - 1)
        if (!streamId) this.$message.error(e.message)
      }
    },
    // 创建本地流
    async _createLocalStream(option){
      if (!option) option = this.$store.state.localStreamOption || {}
      option.attributes = JSON.stringify(this.$store.state.user)
      const data = await createLocalStream(this.sdk.$rtc, option).catch(e => e)
      if (data instanceof Error) {
        console.info('创建本地流失败: ' + data)
      }
      return data
    },
    // endregion 创建本地流

    // region 弹出设备选择
    // 弹出设备选择
    async deviceSelectDialog(data){
      if (this.deviceSelect) return
      const rtc = this.sdk.$rtc
      if (!rtc) return
      this.deviceSelect = data?.type || 1
      const attributes = data.attributes ? typeof data.attributes === 'string' ? data.attributes : JSON.stringify(data.attributes) : undefined

      return new Promise((resolve, reject) => {
        const onSelect = (ok, settings) => {
          this.deviceSelect = 0
          dia.hide()
          resolve([ok, settings])
        }
        const opt = {attributes, selectType: this.deviceSelect, rtc, onSelect, mustStream: data.mustStream}
        const dia = VhDialog.open(DeviceDialogCtor, this, opt)
        this.$once('hook:beforeDestroy', () => dia.hide())
      })
    },
    // endregion

    // region SDK初始化/销毁
    // 初始化所有sdk
    async initSDK(sdkOption, user){
      const sdk = { $rtc: null, $chat: null, $doc: null, $player:null }

      if (!checkSdkOpt(sdkOption)) {
        throw new Error('缺少参数，无法初始化sdk')
      }

      try {
        sdk.$chat = await this.initChat(sdkOption, user)
      } catch (err) {
        this.$message.error(err.message || '初始化sdk出错')
        api.roomReport(sdkOption?.roomId, { type: 'sdk', target: 'initChat', error: err.message })
        throw err
      }
      // 纯观众（不初始化互动sdk）
      if (!this.isPlayer) {
        try {
          sdk.$rtc = await this.initRTC(sdkOption, user)
        } catch (err) {
          this.$message.error(err.message || '初始化sdk出错')
          api.roomReport(sdkOption?.roomId, { type: 'sdk', target: 'initRTC', error: err.message })
          throw err
        }
      }
      return sdk
    },
    // 初始化聊天SDK
    async initChat(sdkOption, user){
      if (process.env.NODE_ENV !== 'production') console.time('初始化聊天SDK')
      const context = { nick_name: user.nickName, avatar: user.avatar, identity: user.identity }
      const option = {
        appId: sdkOption.appId,
        accountId: sdkOption.accountId,
        token: sdkOption.token,
        channelId: sdkOption.paasImId,
        context: JSON.stringify(context),
        hide: false
      }
      const { chat, disable_all, disable } = await initChat(option)
      if (disable_all) this.$store.commit('setImDisableAll', true)
      if (disable) this.$store.commit('setImDisable', true)
      const cancel = imListenPre(chat, this)
      this.$on('hook:beforeDestroy', () => cancel())
      this.$root.$emit('startInitDoc')
      if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化聊天SDK')
      return chat
    },
    // 初始化互动SDK
    async initRTC(sdkOption, user){
      if (process.env.NODE_ENV !== 'production') console.time('初始化互动SDK')
      const role =
        user.identity === IDENTITY.master || user.identity === IDENTITY.helper
          ? window.VhallRTC.MASTER
          : window.VhallRTC.GUEST
      const attributes = JSON.stringify({ nickName: user.nickName, avatar: user.avatar, identity: user.identity })
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
      const { rtc, currentStreams } = await initRTC(option)
      this.currentStreams = currentStreams || []

      // 记录正在推送的流，方便稍后订阅
      for (const stream of currentStreams) {
        const { accountId, streamId, streamType } = stream
        const attributes = safeParse(stream.attributes)
        this.$store.commit('addRemoteStream', { streamId, userId: accountId, streamType, attributes })
      }

      // 监听事件 （用户上线/下线，添加/移除流，黑名单事件，提前监听避免错过事件）
      const cancel = await rtcListenPre(rtc, this)
      this.$on('hook:beforeDestroy', () => cancel())

      if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化互动SDK')
      return rtc
    },
    // 销毁sdk
    destroySDK(){
      const { $rtc, $doc, $chat } = this.$store.state.sdk
      const stream = this.$store.state.stream
      // 清空sdk
      this.$store.commit('setSDK', noneSdk())
      this.sdk = noneSdk()
      if ($rtc) {
        try {
          if (stream.local) $rtc.destroyStream({ streamId: stream.local.streamId }, Function.prototype, Function.prototype)
          if (stream.desktop) $rtc.destroyStream({ streamId: stream.desktop.streamId }, Function.prototype, Function.prototype)
        } catch (e) {
          console.error(e)
        }
        try {
          $rtc.destroyInstance({})
        } catch (e) {
          console.error(e)
        }
      }
      if ($doc) {
        try {
          $doc.destroy()
        } catch (e) {
          console.error(e)
        }
      }
      if ($chat) {
        try {
          const msg = $chat.msg
          $chat.destroy()
          // TODO chat 2.1.4 修复此问题
          if (msg && msg.app.msg) {
            msg.disconnect()
            msg.app.msg = null
            msg.app.channlIdMap = {}
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    // endregion SDK
  },
  beforeDestroy(){
    try {
      this.destroySDK()
      this.$store.commit('resetRoomData')
    } catch (e) {
      console.error(e)
    }
  },
  watch: {
    '$store.state.sdk': function (sdk){
      if (!sdk?.$chat) return
      this.init(sdk)
    }
  }
}
</script>

<style lang="less" scoped>
.home {
  display: flex;
  height: 100%;
  flex-direction: column;
  // max-height: 100vh;
  justify-content: space-between;
  // overflow: hidden;
  .homeContent {
    min-height: 0;
    flex-grow: 1;
    display: flex;
  }

  .MainContent {
    min-height: 0;
    flex: 1;
    background: #fff;
    color: #000;
  }
}
</style>
