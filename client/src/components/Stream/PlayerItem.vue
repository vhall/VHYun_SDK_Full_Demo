<template>
  <div class="player-box">
    <div class="default" v-show="isLoaded">
      <img src="../images/video-blank@2x.png" alt=""/>
    </div>
    <div :id="videoNode" class="player" ref="player"></div>
  </div>
</template>

<script>
import {initPlayer} from '@/utils/sdk'
import {videoAutoPlay, videoAutoPlaySupport} from '@/utils/autoplay'

export default {
  name: 'PlayerItem',
  components: {},
  props: {option: Object, isLive: Boolean},
  data() {
    return {
      $player: null,
      playing: false,
      videoNode: 'player_' + Math.random().toString().slice(2, 6),
      isLoaded: true,
    }
  },
  created() {
    this.$once('hook:beforeDestroy', () => {
      // dirty clean
      const el = document.createElement('div')
      el.id = this.videoNode
      el.style.width = '0'
      el.style.height = '0'
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 3000)
      if (!this.$player) return
      this.$player.pause()
      this.$player.destroy()
      if (this.$player.vhallplayer && this.$player.vhallplayer.player) {
        this.$player.vhallplayer.player.video = el
      }
    })
  },
  mounted() {
    this.initPlayer()
  },
  computed: {},
  watch: {
    option() {
      this.initPlayer()
    },
    isLive(val) {
      if (val) {
        if (this.$player) this.$player.play()
      } else {
        this.$player.pause()
      }
    }
  },
  methods: {
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
      this.$player.setMute(!!isMute , () => null)
    },
    async initPlayer() {
      if (this.$player) return
      if (!(this.option && this.option.token)) return
      const {appId, accountId, token, isVod, paasLiveId, recordId} = this.option
      const videoNode = this.videoNode
      const autoplay = await videoAutoPlaySupport().catch(() => false)
      const option = {
        appId, // 应用ID   必填
        accountId, // 第三方用户ID     必填
        token, // access_token  必填
        type: isVod ? 'vod' : 'live', // live 直播  vod 点播  必填
        videoNode: videoNode, // 播放器的容器
        autoplay: autoplay, // 是否自动播放，默认为true。
        liveOption: {
          type: 'auto', // 直播播放类型   auto | hls | flv
          roomId: paasLiveId, // 直播房间ID  必填
        },
        vodOption: {
          recordId,
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

<style lang="less" scoped>
.player-box {
  position: relative;
  height: 100%;

  .player {
    height: 100%;
    background-color: black;
    z-index: 100;
  }

  .player /deep/ .vhallPlayer-container {
    .vhallPlayer-controller-box {
      padding: 0 20px;
      height: 26px;
    }
    .v-c-left > span {
      width: 10px;
      height: 12px;
    }
    .v-c-left {
      .vhallPlayer-playBtn {
        display: none;
      }
      .vhallPlayer-playBtn.pause {
        width: 10px;
        height: 12px;
        pointer-events: none;
      }
    }
    .v-c-right {
      //> div {
      //  display: none;
      //}
      .vhallPlayer-definition-component {
        margin-right: 12px;
        display: block;
        .vhallPlayer-definitionBtn {
          font-size: 12px;
          line-height: 16px;
          width: 50px;
          height: 18px;
        }
      }
      .vhallPlayer-volume-component {
        margin-right: 20px;
        display: block;
        .vhallPlayer-volume-btn {
          width: 14px;
          height: 16px;
        }
        .vhallPlayer-verticalSlider-popup {
          padding-bottom: 10px;
          width: 20px;
          .vhallPlayer-verticalSlider-box {
            width: 20px;
          }
        }
      }
      .vhallPlayer-fullScreen-btn {
        display: block;
        width: 14px;
        height: 14px;
      }
    }
  }

  .default {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: 99;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 70px;
      height: 70px;
    }
  }
}
</style>
