<template>
  <div class="player-box">
    <div class="default" v-show="isLoaded">
      <img src="../images/video-blank@2x.png" alt=""/>
    </div>
    <div :id="videoNode" class="player" :class="{ 'has-barrage': fullFunction }" ref="player"></div>
    <div class="barrage-box">
      <div class="switch" id="switchBtn">
        <input type="checkbox" id="switch-button" value="on" v-model="barrageEnable" @change="barrageChange">
        <label for="switch-button" class="button-label">
          <span class="circle"></span>
          <span class="text on">弹</span>
          <span class="text off">弹</span>
        </label>
      </div>
      <!-- 弹幕设置 -->
      <div class="danmaku-setting">
        <div class="danmaku-setting-wrap" v-show="danmakuSetting">
          <div class="danmuku-setting-item">
            <div class="label">显示区域</div>
            <div class="slider"><el-slider v-model="danmukuSettingPos" :show-tooltip="false" :min="1" :max="4" :step="1" show-stops></el-slider></div>
            <div class="value">{{ danmukuSettingPos === 1 ? '上' : danmukuSettingPos === 2 ? '中' : danmukuSettingPos === 3 ? '下' : '全屏' }}</div>
          </div>
          <div class="danmuku-setting-item">
            <div class="label">不透明度</div>
            <div class="slider"><el-slider v-model="danmukuSettingAlpha" :show-tooltip="false" :min="0" :max="100" :step="25" show-stops></el-slider></div>
            <div class="value">{{danmukuSettingAlpha}}%</div>
          </div>
          <div class="danmuku-setting-item">
            <div class="label">字体大小</div>
            <div class="slider"><el-slider v-model="danmukuSettingSize" :show-tooltip="false" :min="1" :max="3" :step="1" show-stops></el-slider></div>
            <div class="value">{{ danmukuSettingSize === 1 ? '小' : danmukuSettingSize === 2 ? '中' : '大' }}</div>
          </div>
          <div class="danmuku-setting-item">
            <div class="label">弹幕速度</div>
            <div class="slider"><el-slider v-model="danmukuSettingSpeed" :show-tooltip="false" :min="1" :max="3" :step="1" show-stops></el-slider></div>
            <div class="value">{{ danmukuSettingSpeed === 1 ? '慢' : danmukuSettingSpeed === 2 ? '中' : '快' }}</div>
          </div>
        </div>
        <i
          class="el-icon el-icon-set-up danmaku-setting-pointer"
          @click="danmakuSetting = !danmakuSetting"
          :style="{ color: danmakuSetting ? '#1E90FF' : '#999999' }"
          style="font-size: 24px; color: #1E90FF; margin: 0 20px; vertical-align: bottom;"
        ></i>
      </div>
      <!-- 弹幕设置-end -->

      <div class="barrageInput-box">
        <el-color-picker v-model="barrageColor" size="mini" popper-class="color-picker-player-dark" ></el-color-picker>
        <div class="input-box">
          <input placeholder="我想说~" name="barrageText" type="text" v-model="barrageInput" @keyup.enter="sendBarrage1">
          <button class="sendBarrage" @click="sendBarrage1" :style="{ color: barrageInput.length ? '#ffffff' : '#999999' }">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {initPlayer} from '@/utils/sdk'
import {videoAutoPlay, videoAutoPlaySupport} from '@/utils/autoplay'

export default {
  name: 'VodPlayerItem',
  components: {},
  props: {option: Object, isLive: Boolean, fullFunction: Boolean, sendBarrage: Function},
  data() {
    return {
      $player: null,
      playing: false,
      videoNode: 'player_' + Math.random().toString().slice(2, 6),
      isLoaded: true,
      barrageEnable: true,
      barrageInput: '',
      barrageColor: '#ffffff',
      danmukuSettingPos: 1,
      danmukuSettingAlpha: 100,
      danmukuSettingSize: 1,
      danmukuSettingSpeed: 1,
      danmakuSetting: false,
    }
  },
  created() {
    this.$once('hook:beforeDestroy', () => {
      this.$player && this.$player.destroy()
    })
    this.$on('barrage', (ev) => {
      if (!this.$player) return
      const {content, color} = ev
      if (!content) return
      this.$player.addBarrage(content, {color: color || this.barrageColor}, console.error)
    })
    this.$on('vodTurnTime', (ev) => {
      if (!this.$player) return
      this.$player.setCurrentTime(ev.time)
    })
  },
  mounted() {
    this.initPlayer()
  },
  computed: {},
  beforeDestroy() {
    if (this.$player) {
      this.$player.pause()
      this.$player.destroy()
    }
  },
  watch: {
    option() {
      this.initPlayer()
    },
    fullFunction(value) {
      if (!this.$player) return
      if (value === true) {
        this.enableFullFunction()
      } else {
        this.disableFullFunction()
      }
    },
    barrageColor(value) {
      if (!this.$player) return
      if (!value) return
      this.setBarrageInfo()
    },
    danmukuSettingPos(value) {
      if (!this.$player) return
      this.setBarrageInfo()
    },
    danmukuSettingAlpha(value) {
      this.setBarrageInfo()
    },
    danmukuSettingSize(value) {
      this.setBarrageInfo()
    },
    danmukuSettingSpeed(value) {
      this.setBarrageInfo()
    },
  },
  methods: {
    setBarrageInfo() {
      if (!this.$player) return
      const speed = ({ 1: '20000', 2: '10000', 3: '2000' })[this.danmukuSettingSpeed]
      const fontSize = ({ 1: 18, 2: 28, 3: 38 })[this.danmukuSettingSize]
      const positionRange = ({ 1: [0, 0.25], 2: [0.25, 0.75], 3: [0.75, 1], 4: [0, 1] })[this.danmukuSettingPos]
      const opacity = this.danmukuSettingAlpha
      const option = {
        positionRange: positionRange,
        style: {
          opacity:  opacity,
          fontSize: fontSize,
          speed: speed,
          color: this.barrageColor || '#ffffff',
        }
      }
      this.$player.setBarrageInfo(option)
    },
    toggle() {
      if (!this.$player) return
      if (this.$player.getIsPause()) {
        this.$player.play()
      } else {
        this.$player.pause()
      }
      this.playing = !this.$player.getIsPause()
    },
    setMute(isMute) {
      if (!this.$player) return
      this.$player.setMute(!!isMute, () => null)
    },
    sendBarrage1() {
      let text = this.barrageInput
      this.barrageInput = ''
      text = (text || '').trim()
      if (text.length > 150) {
        if (this.$message) this.$message.info('字符不可超过150个')
        else alert('字符不可超过150个')
        return
      }
      if (!text) return
      this.sendBarrage && this.sendBarrage(text)
    },
    barrageChange() {
      if (this.barrageEnable) {
        this.$player.openBarrage()
      } else {
        this.$player.closeBarrage()
        this.$player.clearBarrage()
      }
    },
    enableFullFunction() {
      this.$player.openBarrage()
      if (this.$refs.player) {
        const rec = this.$refs.player.getClientRects()[0]
        this.$player.setSize({width: rec.width, height: rec.height})
      }
    },
    disableFullFunction() {
      this.$player.closeBarrage()
      this.$player.clearBarrage()
      if (this.$refs.player) {
        const rec = this.$refs.player.getClientRects()[0]
        this.$player.setSize({width: rec.width, height: rec.height})
      }
    },
    async initPlayer() {
      if (this.$player) return
      if (!(this.option && this.option.token)) return
      const {appId, accountId, token, paasLiveId, poster, recordId} = this.option
      const videoNode = this.videoNode
      const autoplay = await videoAutoPlaySupport().catch(() => false)
      const watermarkOption = {}
      const barrageSetting = {
        direction: 'right',
        positionRange: [0, 0.25],
        // position: 0,
        speed: 20000,
        style: {
          fontSize: '18',
          fontFamily: 'Microsoft Yahei',
          color: this.barrageColor,
          border: '#000000',
          borderWidth: 1,
          padding: 0,
          opacity: this.danmukuSettingAlpha,
          backgroundColor: 'none'
        }
      }
      const option = {
        appId, // 应用ID   必填
        accountId, // 第三方用户ID     必填
        token, // access_token  必填
        type: 'vod', // live 直播  vod 点播  必填
        videoNode: videoNode, // 播放器的容器
        autoplay: autoplay, // 是否自动播放，默认为true。
        language: 'zh',
        watermarkOption,
        barrageSetting,
        pursueOption: {
          enable: false
        },
        subtitleOption: {
          enable: false,
          auto: true,
        },
        vodOption: {
          recordId,
          defaultDefinition: 'same',
          useSWF: false
        }
      }

      if (process.env.NODE_ENV !== 'production') console.time('初始化播放器SDK')
      try {
        await this.$nextTick()
        this.$player = await initPlayer(option)
        this.$player.on(window.VhallPlayer.LOADED, () => {
          this.isLoaded = false
        })
        this.$player.on(window.VhallPlayer.ERROR, () => {
          this.isLoaded = true
        })
        if (this.fullFunction) this.enableFullFunction()
        // this.$player.setLoop(true)
      } catch (error) {
        console.log(error)
      }
      if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化播放器SDK')

      if (!autoplay) {
        // 解决刷新后不自动播放的问题
        const wrap = window.document.getElementById(videoNode)
        if (!wrap) return
        const v = wrap.getElementsByTagName('video')[0]
        if (!v) return
        await videoAutoPlay(v, this.local).catch(() => null)
      }
    },
  },
}
</script>

<style lang="less">
.el-color-picker__panel.color-picker-player-dark {
  background-color: black;
  box-shadow: none;
  border: none;
  color: #f7f7f7;
  .el-color-dropdown__btns {
    .el-color-dropdown__value {
      display: none;
    }
    button.el-color-dropdown__link-btn {
      display: none;
    }
    button.is-plain {
      background: none;
      border: none;
      color: #f7f7f7;
    }
  }
}
</style>

<style lang="less" scoped>
.player-box {
  position: relative;
  height: 100%;

  .player {
    height: 100%;
    background-color: black;
    z-index: 100;
  }

  /deep/ .vhallPlayer-container {
    display: block !important;
  }

  .player:not(.has-barrage) + .barrage-box {
    display: none;
  }

  .player:not(.has-barrage) /deep/ .vhallPlayer-container {
    //visibility: visible;
    //opacity: 1;
    .vhallPlayer-controller-box {
      padding: 0 10px;
      height: 30px;
    }
    .v-c-right > div {
      display: none;
    }
    .v-c-right {
      .vhallPlayer-volume-component {
        display: block;
      }
      .vhallPlayer-fullScreen-btn {
        display: block;
      }
    }
  }

  .has-barrage /deep/ .vhallPlayer-container {
    .vhallPlayer-controller-box {
      padding: 0 20px;
      height: 50px;
    }
    .v-c-right > div {
      display: none;
    }
    .v-c-right {
      .vhallPlayer-volume-component {
        display: block;
      }
      .vhallPlayer-fullScreen-btn {
        display: block;
      }
      .vhallPlayer-definition-component {
        display: block;
      }
      .vhallPlayer-config-component {
        display: block;
      }
      .vhallPlayer-speed-component {
        display: block;
      }
    }
  }

  .player.has-barrage {
    height: calc(100% - 50px);
    background-color: black;
  }

  .default {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;

    img {
      width: 70px;
      height: 70px;
    }
  }

  .danmaku-setting-pointer {
    cursor: pointer;
  }

  .danmaku-setting-wrap {
    width: 300px;
    height: 176px;
    position: absolute;
    bottom: 50px;
    background-color: rgba(0,0,0,0.6);
    z-index: 100;
    left: 10px;
    border-radius: 4px;
    padding: 0 16px;
    .danmuku-setting-item {
      display: flex;
      line-height: 38px;
      .label {
        width: 56px;
      }
      .value {
        width: 50px;
      }
      .slider {
        width: 160px;
        padding: 0 16px;
      }
    }
  }

  // 弹幕输入
  .barrage-box {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 30px;
    background: #010001;
    height: 50px;

  }

  .barrage-box .barrageInput-box {
    width: 90%;
    /deep/ .el-color-picker {
      position: absolute;
      z-index: 10;
      margin-top: 2px;
      margin-left: 10px;

      .el-color-picker__trigger:before {
        font-family: element-icons!important;
        content: "\e78c";
        font-size: 20px;
        color: #1E90FF;
      }
      .el-color-picker__color {
        display: none;
      }
      .el-icon-arrow-down {
        display: none;
      }
      .el-color-picker__trigger {
        width: unset;
        height: unset;
        border: none;
        box-shadow: none;
      }
    }
  }

  .barrage-box .barrageInput-box i {
    font-size: 18px;
    color: #fff;
    position: absolute;
    z-index: 10;
    margin-top: 8px;
    margin-left: 10px;
  }

  .barrage-box .barrageInput-box .input-box {
    background: #181818;
    border-radius: 18px;
    height: 36px;
    padding-left: 40px;
    padding-right: 90px;
    position: relative;
  }

  .barrage-box .barrageInput-box .input-box input {
    background: transparent;
    border: 0;
    outline: none;
    height: 36px;
    line-height: 36px;
    color: #ffffff;
    width: 100%;
  }

  .barrage-box .barrageInput-box button.sendBarrage {
    width: 86px;
    height: 36px;
    background: rgba(51, 51, 51, 1);
    border-radius: 18px;
    border: 0;
    cursor: pointer;
    color: #ffffff;
    position: absolute;
    right: 0;
    top: 0;
    outline: none;
  }

  .barrage-box .barrageInput-box button.sendBarrage:hover {
    color: #1e90ff;
  }

  .switch #switch-button {
    display: none;
  }

  .switch .button-label {
    position: relative;
    display: inline-block;
    width: 50px;
    border-radius: 30px;
    overflow: hidden;
    height: 22px;
    background: #444444;
    cursor: pointer;
  }

  .switch .circle {
    position: absolute;
    top: 0;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #fff;
  }

  .switch .button-label .text {
    line-height: 22px;
    font-size: 14px;
    -webkit-user-select: none;
    user-select: none;
  }

  .switch .on {
    color: #fff;
    display: none;
    text-indent: 10px;
  }

  .switch .off {
    color: #fff;
    display: inline-block;
    text-indent: 25px;
  }

  .switch .button-label .circle {
    left: 0;
    transition: all 0.1s;
  }

  /*
  以下是checked被选中后，紧跟checked标签后面label的样式。
  例如：div+p 选择所有紧接着<div>元素之后的<p>元素
  */

  .switch #switch-button:checked + label.button-label .circle {
    left: 30px;
  }

  .switch #switch-button:checked + label.button-label .on {
    display: inline-block;
  }

  .switch #switch-button:checked + label.button-label .off {
    display: none;
  }

  .switch #switch-button:checked + label.button-label {
    background-color: #007AFF;
  }

}
</style>
