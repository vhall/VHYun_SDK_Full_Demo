<template>
  <div class="settings-content">
    <i class="content-back elicon el-icon-close" @click="onClose"/>
    <h2 class="title">设置</h2>
    <div class="device-select-container">
      <div class="local-preview-stream-se-warp">
        <img src="../../../assets/images/2020-12-01_22-14-58.png" alt="" style="visibility: hidden">
        <div v-show="streamId" class="local-preview-stream-se" :id="videoNode" :key="videoNode" ref="se"></div>
      </div>
      <div class="item">
        <label for="device-video">视频设备</label>
        <div class="select">
          <select name="" id="device-video" v-model="videoDeviceId">
            <option v-for="option of deviceData.videoOptions" :key="option.label" :value="option.deviceId">
              {{ option.label }}
            </option>
          </select>
          <svg class="v" viewBox="0 0 1024 1024">
            <path
              d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 0"></path>
          </svg>
        </div>
      </div>
      <div class="item">
        <label for="device-audio">音频设备</label>
        <div class="select">
          <select name="" id="device-audio" v-model="audioDeviceId">
            <option key="" value="" v-if="!deviceData.audioOptions.length">无音频设备</option>
            <option v-for="option of deviceData.audioOptions" :key="option.label" :value="option.deviceId">
              {{ option.label }}
            </option>
          </select>
          <svg class="v" viewBox="0 0 1024 1024">
            <path
              d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 0"></path>
          </svg>
        </div>
      </div>
      <div class="item">
        <label for="device-ratio">分辨率</label>
        <div class="select">
          <select name="" id="device-ratio" v-model="ratio">
            <option key="" value="" v-if="!deviceData.ratios.length">默认</option>
            <option v-for="option of deviceData.ratios" :key="option.label" :value="option">{{ option.width }} X
              {{ option.height }}
            </option>
          </select>
          <svg class="v" viewBox="0 0 1024 1024">
            <path
              d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 0"></path>
          </svg>
        </div>
      </div>
      <div class="footer" v-if="devices.init">
        <button class="cancel" @click="onClose">取消</button>
        <button class="cancel" @click="save">保存</button>
        <button class="success" @click="apply">选择设备</button>
      </div>
    </div>
  </div>
</template>

<script>

import {checkBrowserEnv, promisify} from '@/utils'
import {BUS_LOCAL_EVENTS} from '@/common/contant'

let first = true
export default {
  name: 'MainSettingsSC',
  components: {},
  data: () => ({
    devices: {
      audioInputDevices: [],
      audioOutputDevices: [],
      videoInputDevices: [],
      videoOutputDevices: [],
      init: false,
    },
    deviceData: {
      videoOptions: [],
      audioOptions: [],
      ratios: [],
    },
    previewDefaultImg: true,
    constraintsMap: new Map(),
    envFail: checkBrowserEnv(),
    videoNode: 'local_preview_stream_se' + Math.random().toString().slice(2, 6),
    defaultOption: null,
    streamId: null,
    videoDeviceId: null,
    audioDeviceId: null,
    ratio: null,
    profile: null,
    previewLock: false,
    videoOptions: {},
  }),
  async mounted() {
    if (this.envFail) return this.$message.error(this.envFail)
    // 获取设备（会弹出提示让用户选择）
    try {
      await this.getDevices().then(() => this.changePreview())
    } catch (e) {
      return this.$message.error('无法获取设备')
    }
    this.listen()
  },
  computed: {
    rtc() {
      return this.$store.getters.rtc
    },
    settings() {
      return this.$store.state.localStreamOption
    },
    localStreamId() {
      return this.$store.state.stream.local?.streamId
    }
  },
  methods: {
    // 检测设备更改
    listen() {
      const self = this
      if (!(navigator && navigator.mediaDevices)) return
      function change () {
        self.getDevices().then(() => self && self.changePreview())
      }
      navigator.mediaDevices.addEventListener('devicechange', change)
      this.$on('hooks:beforeDestroy', () => navigator.mediaDevices.removeEventListener('devicechange', change))
    },
    onClose() {
      this.$emit('close')
    },
    save() {
      const settings = {
        audio: true,
        video: true,
        audioDevice: this.audioDeviceId,
        videoDevice: this.videoDeviceId,
      }
      if (this.profile) settings.profile = this.profile
      this.$store.commit('setLocalStreamOption', Object.assign({}, this.settings, settings))
      this.onClose()
    },
    apply() {
      this.save()
      const option = Object.assign({}, this.$store.state.localStreamOption)
      this.$root.$emit(BUS_LOCAL_EVENTS.SETTINGS_CHANGE, option)
    },
    switchCurrentSelect() {
      if (this.settings) {
        this.videoDeviceId = this.settings.videoDevice
        this.audioDeviceId = this.settings.audioDevice
        this.profile = this.settings.profile
        if (this.profile) {
          const obj = this.constraintsMap.get(this.videoDeviceId)
          const t = obj && obj.constraints.filter(i => i.label === this.profile)[0]
          if (t && t[0]) this.ratio = t[0].ratio
        }
      }

      if (!this.videoDeviceId) this.videoDeviceId = this.deviceData.videoOptions[0]?.deviceId
      if (!this.audioDeviceId) this.audioDeviceId = this.deviceData.audioOptions[0]?.deviceId
    },
    // 媒体设备处理
    async getDevices() {
      const VhallRTC = window.VhallRTC
      const getDevices = () => new Promise((resolve, reject) => VhallRTC.getDevices({}, resolve, reject))
      const getVideoConstraints = opt => new Promise((resolve, reject) => VhallRTC.getVideoConstraints(opt, resolve, reject))

      let devices
      try {
        const pro = getDevices()
        const res = await Promise.race([pro, new Promise(resolve => setTimeout(resolve, 500))])
        if (res) {
          devices = res
        } else {
          this.$message.info('请允许网页使用您的摄像头和麦克风')
          devices = await pro
        }
      } catch (e) {
        this.$message.info('请允许网页使用您的摄像头和麦克风')
      }

      let audioOptions = [...devices.audioInputDevices] // , ...devices.audioOutputDevices]
      let videoOptions = [...devices.videoInputDevices]

      // 不要桌面共享
      videoOptions = videoOptions.filter(i => i.deviceId !== 'desktopScreen')

      for (const device of videoOptions) {
        const constraints = await getVideoConstraints({deviceId: device.deviceId})
        let c1 = []
        let c2 = []
        // 如果可选的分辨率太多，这里过滤掉一些
        if (constraints.length > 6) c1 = constraints.filter(i => i.label[i.label.length -1] === 'M')
        if (c1.length <= 2) c1 = constraints
        if (constraints.length > 6) c2 = c1.filter(i => typeof i.ratio === 'number' ?  i.ratio > 1.5 : i.ratio === '16:9')
        if (c2.length <= 2) c2 = c1
        this.constraintsMap.set(device.deviceId, {
          name: device.label,
          constraints: c2,
        })
      }

      this.devices = devices
      this.devices.init = true
      this.deviceData.audioOptions = audioOptions
      this.deviceData.videoOptions = videoOptions

      this.switchCurrentSelect()
    },
    // 预览
    async changePreview() {
      const VhallRTC = window.VhallRTC
      const streamId = this.streamId
      if (!this.$refs.se) return
      if (this.previewLock) return
      this.previewLock = true

      if (streamId) {
        await this.stopPreview(streamId, true)
        this.streamId = null
      }

      // 获取不到设备分辨率的处理
      const isNullConstraint = !this.constraintsMap.get(this.video?.deviceId)?.length
      const videoNode = this.videoNode
      try {
        const profile = this.ratio?.label || VhallRTC.VIDEO_PROFILE_480P_0
        const opt = {
          // videoQuality,
          attributes: "",
          videoNode,
          showControls: false, // 是否开启视频原生控制条，选填，默认为false
          audioDevice: this.audioDeviceId,
          videoDevice: this.videoDeviceId,
          profile: isNullConstraint ? undefined : profile,
          mute: { audio: true, video: false },
        }
        // 注意streamId不能被使用
        const {streamId} = await promisify(VhallRTC, VhallRTC.startPreview)(opt)
        this.streamId = streamId
      } catch (e) {
        if (e?.data?.error?.type === 'access-denied') return this.$message.error('请允许网页使用您的摄像头和麦克风')
        this.$message.error(e.message)
      }
      this.previewLock = false
    },
    // 停止预览
    async stopPreview() {
      const VhallRTC = window.VhallRTC
      const streamId = this.streamId
      if (!streamId) return
      this.streamId = null
      const opt = {streamId}
      await promisify(VhallRTC, VhallRTC.stopPreview)(opt).catch(() => null)
    }
  },
  watch: {
    videoDeviceId(deviceId) {
      const obj = this.constraintsMap.get(deviceId)
      if (obj?.constraints) {
        this.deviceData.ratios = obj.constraints
        this.ratio = obj.constraints[0] || ''
      } else {
        this.deviceData.ratios = []
        this.ratio = ''
      }
      const self = this
      setTimeout(() => self && self.changePreview('video'), 500)
    },
    audio() {
      const self = this
      setTimeout(() => self && self.changePreview('audio'), 500)
    },
    ratio() {
      const self = this
      setTimeout(() => self && self.changePreview('ratio'), 500)
    },
  }
}
</script>

<style lang="less" scoped>
.settings-content {
  min-width: 460px;
  //min-height: 400px;
  //max-height: 90%;
  //width: fit-content;
  //height: fit-content;
  position: relative;
  background-color: #fdfdfd;
  border-radius: 3px;

  .content-back {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  h2.title {
    padding: 10px 0;
    font-size: 22px;
    text-align: center;
  }

  .smile-dialog-header {
    text-align: center;
    font-size: 18px;
    color: #333333;
    padding: 30px 32px 24px;
  }

  .smile-dialog-close {
    position: absolute;
    right: 32px;
    color: #666;
    top: 30px;
    font-size: 18px;
    cursor: pointer;

    &:hover {
      color: #1e90ff;
    }
  }

  .device-select-container {
    width: 360px;
    padding-bottom: 1px;
    height: 440px;
    margin: auto;
  }

  .device-select-container h1.title {
    color: #333333;
    font-size: 18px;
    text-align: center;
    margin-top: 31px;
    margin-bottom: 24px;
  }

  .local-preview-stream-se-warp {
    height: 203px;
    border-radius: 8px;
    margin-bottom: 16px;
    position: relative;
    background-color: #edf7ff;
  }

  .local-preview-stream-se-warp .local-preview-stream-se {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    position: absolute;
    top: 0;
  }

  .local-preview-stream-se-warp .local-preview-stream-se /deep/ .licode_player {
    background-color: transparent !important;
  }

  .local-preview-stream-se-warp .local-preview-stream-se /deep/ .licode_player video {
    object-fit: cover;
  }

  .device-select-container img {
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }

  .device-select-container .item {
    font-size: 14px;
    width: 100%;
    height: 36px;
    margin-bottom: 16px;
  }

  .device-select-container .item .select .v {
    width: 16px;
    height: 16px;
    position: absolute;
    top: 9px;
    right: 8px;
  }

  .device-select-container .item .select {
    appearance: none;
    width: 288px;
    height: 36px;
    float: right;
    right: 0;
    border: 1px solid #E2E2E2;
    border-radius: 4px;
    position: relative;
  }

  .device-select-container .item select {
    appearance: none;
    width: 100%;
    height: 100%;
    color: #333333;
    border: none !important;
    padding: 0 8px;
  }

  .device-select-container .item label {
    line-height: 36px;
    color: #666;
  }

  .device-select-container .item select:root {
    color: red;
  }

  .device-select-container .item select:focus {
    border: 1px solid #E2E2E2;
    outline: none;
  }

  .device-select-container .footer {
    width: 100%;
    height: 36px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    padding-left: 70px;
  }

  .device-select-container .footer button {
    width: 80px;
    height: 36px;
    //margin-right: 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .device-select-container .footer button.cancel {
    border: 1px solid #666666;
    background-color: transparent;
    outline: none;
    color: #666;
  }

  .device-select-container .footer button.success {
    border: none;
    background-color: #1E90FF;
    color: #FFFFFF;
    outline: none;
  }
}
</style>
