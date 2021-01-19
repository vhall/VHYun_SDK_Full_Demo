<template>
  <div class="device-select-container">
    <div class="smile-dialog-header">
      <span class="smile-dialog-header">{{ titleShow }}</span>
      <i class="iconfont iconicon-guanbi smile-dialog-close" @click="_handlerDevice(false)" v-show="!mustStream"></i>
    </div>

    <div class="localPreviewStreamSeWarp">
      <img src="./images/2020-12-01_22-14-58.png" alt="" style="visibility: hidden">
      <div v-show="streamId" class="localPreviewStreamSe" :id="videoNode" :key="videoNode"></div>
    </div>
    <div class="item" v-show="selectType === 1">
      <label for="device-video">视频设备</label>
      <div class="select">
        <select name="" id="device-video" v-model="videoDeviceId">
          <option v-for="option of deviceData.videoOptions" :key="option.label" :value="option.deviceId">{{ option.label }}</option>
        </select>
        <svg class="v" viewBox="0 0 1024 1024"><path d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 "></path></svg>
      </div>
    </div>
    <div class="item" v-show="selectType === 1">
      <label for="device-audio">音频设备</label>
      <div class="select">
        <select name="" id="device-audio" v-model="audioDeviceId">
          <option v-for="option of deviceData.audioOptions" :key="option.label" :value="option.deviceId">{{ option.label }}</option>
        </select>
        <svg class="v" viewBox="0 0 1024 1024"><path d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 "></path></svg>
      </div>
    </div>
    <div class="item" v-show="selectType === 1">
      <label for="device-ratio">分辨率</label>
      <div class="select">
        <select name="" id="device-ratio" v-model="ratio">
          <option v-for="option of deviceData.ratios" :key="option.label" :value="option">{{ option.width }} X {{ option.height }}</option>
        </select>
        <svg class="v" viewBox="0 0 1024 1024"><path d="M769.578667 541.482667a25.6 25.6 0 0 1-3.072 36.096l-199.253334 168.021333a68.266667 68.266667 0 0 1-89.685333-1.450667l-185.429333-167.125333a25.6 25.6 0 0 1 34.261333-38.016l185.429333 167.082667a17.066667 17.066667 0 0 0 22.442667 0.384l199.253333-168.021334a25.6 25.6 0 0 1 36.053334 3.029334z m0-213.333334a25.6 25.6 0 0 1-3.072 "></path></svg>
      </div>
    </div>
    <div class="footer">
      <button class="cancel" @click="_handlerDevice(false)" v-show="selectType === 1 && !mustStream">取消</button>
      <button class="success" @click="_handlerDevice(true)" v-show="selectType === 1">确定</button>

      <button class="cancel" @click="requestDesktopScreenPreview(0)" v-show="selectType === 2">选择设备</button>
      <button class="success" @click="_handlerDevice(true)" v-show="selectType === 2 && streamId">确定</button>
      <button class="cancel" @click="_handlerDevice(false)" v-show="selectType === 2 && !streamId">取消</button>
    </div>
  </div>
</template>

<script>
import {checkBrowserEnv, promisify, wait} from "@/utils"

export default {
  name: "Device",
  props: ['handlerDevice', 'rtc', 'title', 'selectType', 'attributes', 'mustStream'],
  components: { },
  data: () => ({
    devices: {
      audioInputDevices: [],
      audioOutputDevices: [],
      videoInputDevices: [],
      videoOutputDevices: [],
    },
    deviceData: {
      videoOptions: [],
      audioOptions: [],
      ratios: [],
    },
    previewDefaultImg: true,
    constraintsMap: new Map(),
    envFail: checkBrowserEnv(),
    videoNode: 'localPreviewStreamSe' + Math.random().toString().slice(2, 4),
    defaultOption: null,
    streamId: null,
    videoDeviceId: null,
    audioDeviceId: null,
    ratio: null,
    profile: null,
    previewLock: false,
  }),
  async mounted() {
    if (this.envFail) return
    if (!this.selectType) return
    // 屏幕共享不需要自动预览
    if (this.selectType !== 1) return
    // 获取设备（会弹出提示让用户选择）
    await this.getDevices().then(() => this.changePreview())
  },
  methods: {
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

      if (this.selectType === 1) videoOptions = videoOptions.filter(i => i.deviceId !== 'desktopScreen')
      // if (this.selectType === 2) videoOptions = videoOptions.filter(i => i.deviceId === 'desktopScreen')

      // 获取设备分辨率列表 (桌面共享没有可选分辨率)
      for (const device of videoOptions) {
        let constraints = await getVideoConstraints({deviceId: device.deviceId})
        // 可选的分辨率太多，这里过滤掉一些
        if (constraints.length > 2) constraints = constraints.filter(i => i.label[i.label.length -1] === 'M')
        if (constraints.length > 2) constraints = constraints.filter(i => i.ratio > 1.5)
        this.constraintsMap.set(device.deviceId, {
          name: device.label,
          constraints,
        })
      }

      this.devices = devices
      this.deviceData.audioOptions = audioOptions
      this.deviceData.videoOptions = videoOptions

      this.videoDeviceId = this.deviceData.videoOptions[0]?.deviceId
      this.audioDeviceId = this.deviceData.audioOptions[0]?.deviceId
    },
    // 点击ok
    async _handlerDevice(ok) {
      const streamId = this.streamId
      if (this.selectType === 2) {
        if (!ok) {
          this.stopPreview(streamId, true)
        } else {
          this.stopPreview(streamId)
        }
        if (!this.handlerDevice) return
        return this.handlerDevice(ok, ok ? { streamId } : null)
      }

      const option = {
        video: true,
        audio: true,
        videoDevice: this.video?.deviceId,
        audioDevice: this.audio?.deviceId,
        profile: this.ratio?.label,
        streamId: streamId
      }
      if (!this.handlerDevice) return
      this.handlerDevice(ok, ok ? option : this.defaultOption)
    },
    // 预览
    async changePreview () {
      const streamId = this.streamId
      const profile = this.ratio?.label || window.VhallRTC.VIDEO_PROFILE_480P_0
      if (this.previewLock) return
      this.previewLock = true

      if (streamId) {
        await this.stopPreview(streamId, true)
        this.streamId = null
      }

      if (!this.rtc) return

      // 获取不到设备分辨率的处理
      const isNullConstraint = !this.constraintsMap.get(this.video?.deviceId)?.length
      const videoNode = this.videoNode
      try {
        const opt = {
          profile: isNullConstraint ? undefined : profile,
          attributes: this.attributes,
          audioDevice: this.audio?.deviceId,
          videoDevice: this.video?.deviceId,
          speaker: false, // 桌面共享是否分享音频(chrome浏览器弹框左下角显示“分享音频”选框)，选填，默认为true
          showControls:false, // 是否开启视频原生控制条，选填，默认为false
          videoNode: videoNode,
        }
        const { streamId, code, message } = await promisify(this.rtc, this.rtc.createStream)(opt)
        if (code) throw new Error(message)
        this.streamId = streamId
        window.streamId = streamId
      } catch (e) {
        if (e?.data?.error?.type === 'access-denied') return this.$message.error('请允许网页使用您的摄像头和麦克风')
        this.$message.error(e.message)
      }
      this.previewLock = false
    },
    //  请求预览屏幕
    async requestDesktopScreenPreview() {
      if (!this.rtc) return
      const streamId = this.streamId
      if (this.previewLock) return
      this.previewLock = true

      if (streamId) {
        await this.stopPreview(streamId, true)
        this.streamId = null
      }

      const videoNode = this.videoNode
      try {
        const opt = {
          screen: true, //是否获取屏幕共享，选填，默认为false
          speaker: false, // 桌面共享是否分享音频(chrome浏览器弹框左下角显示“分享音频”选框)，选填，默认为true
          showControls:false, // 是否开启视频原生控制条，选填，默认为false
          attributes: this.attributes,
          videoDevice: 'desktopScreen',
          videoNode
        }
        const {streamId} = await promisify(this.rtc, this.rtc.createStream)(opt)
        this.streamId = streamId
        window.streamId = streamId
      } catch (e) {
        if (e?.data?.error?.type === 'access-denied') return this.$message.error('请选择共享的屏幕')
        this.$message.error(e.message)
      }
      this.previewLock = false
    },
    // 停止预览
    async stopPreview($streamId, destroy) {
      const streamId = $streamId || this.streamId
      const selectType = this.selectType
      const rtc = this.rtc
      this.streamId = null
      if (selectType === 1) {
        if (rtc) {
          if (destroy) {
            // 销毁流
            rtc.stopStream({ streamId })
            rtc.destroyStream({ streamId })
          } else {
            rtc.stopStream({ streamId })
          }
        }
      }
      if (selectType === 2) {
        if (rtc) {
          if (destroy) {
            // 销毁流
            rtc.stopStream({ streamId })
            rtc.destroyStream({ streamId })
          } else {
            rtc.stopStream({ streamId })
          }
        }
      }
    }
  },
  computed: {
    titleShow: function () {
      return this.title || this.selectType === 1 ? '本地设备' : '屏幕共享'
    },
    video: function () {
      if (!this.videoDeviceId) return null
      return this.deviceData.videoOptions.find(item => item.deviceId === this.videoDeviceId)
    },
    audio: function () {
      if (!this.audioDeviceId) return null
      return this.deviceData.audioOptions.find(item => item.deviceId === this.audioDeviceId)
    }
  },
  watch: {
    'audio': function () {
      if (this.selectType === 1) this.changePreview('audio')
    },
    'video': function () {
      const deviceId = this.video?.deviceId
      const obj = this.constraintsMap.get(deviceId)
      if (obj?.constraints) {
        this.deviceData.ratios = obj.constraints
        this.ratio = obj.constraints[0]
      } else {
        this.deviceData.ratios = []
      }

      if (this.selectType === 1) this.changePreview('video')
    },
    'ratio': function () {
      if (this.selectType === 1) this.changePreview('ratio')
    },
    streamId (curr, prev) {
      // this.changePreview()
    }
  },
  destroyed() {
    this.stopPreview()
  }
}
</script>

<style scoped>
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
  height: 531px;
  margin: auto;
}
.device-select-container h1.title {
  color: #333333;
  font-size: 18px;
  text-align: center;
  margin-top: 31px;
  margin-bottom: 24px;
}
.device-select-container .localPreviewStreamSeWarp {
  height: 203px;
  border-radius: 8px;
  margin-bottom: 16px;
  position: relative;
}
.localPreviewStreamSeWarp .localPreviewStreamSe {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  position: absolute;
  top: 0;
}
.localPreviewStreamSeWarp .localPreviewStreamSe >>> .licode_player {
  background-color: transparent !important;
}
.localPreviewStreamSeWarp .localPreviewStreamSe >>> .licode_player video {
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
  justify-content: center;
}
.device-select-container .footer button {
  width: 80px;
  height: 36px;
  margin-right: 10px;
  border-radius: 4px;
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
</style>
