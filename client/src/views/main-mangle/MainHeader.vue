<template>
  <div class="main-header">
    <div class="left-box">
      <div class="xinhao-box">
        <span v-for="i in signalBox" :key="i" :class="{ down: i > signal }"></span>
      </div>
      <span class="room-title" :title="roomId">{{ title || '' }}</span>
      <div class="room-type">{{ isVod ? '回放' : livein ? '直播中' : '直播' }}</div>
    </div>
    <div class="right-box" v-if="!isVod">
      <div v-show="live" class="time">
        <span class="time-icon-box"><span class="time-content"></span></span>
        <span>{{ liveTime }}</span>
      </div>
      <Button round class="live-btn" type="primary" @click="_liveChange" v-if="hasLiveRole">
        {{ live ? (changing ? '正在结束' : '结束推流') : (changing ? '正在开始' : '开始推流') }}
      </Button>
      <Button round type="info" @click="_liveGoto" v-if="hasOp">去观看</Button>
      <div style="display: none">设置</div>
    </div>
  </div>
</template>

<script>
import Button from '@/components/Button'
import * as querystring from 'querystring'
import {IDENTITY, secToTimeString} from '@/utils'

export default {
  name: 'MainHeader',
  components: {Button},
  props: {
    liveChange: Function,
  },
  data: function () {
    return {
      signalBox: [1, 2, 3, 4],
      tick: false,
      packetLoss: 4,
    }
  },
  mounted() {
    this.startTick()
  },
  methods: {
    startTick () {
      const tickId = setInterval(() => {
        this.tick = !this.tick
      }, 300)
      // 取消滴答函数
      this.$once('hook:beforeDestroy', () => clearInterval(tickId))
    },
    _liveChange() {
      const live = this.live
      if (this.changing) return
      if (this.liveChange) this.liveChange(!live)
    },
    _liveGoto() {
      if (!this.roomId) return
      const qs = querystring.stringify({type: 2, roomId: this.roomId})
      const url = window.location.protocol + '//' + window.location.host + '/?' + qs
      window.open(url)
    }
  },
  watch: {},
  computed: {
    changing() {
      return this.$store.state.liveChanging
    },
    isVod() {
      return this.$store.state.room && this.$store.state.room.isVod
    },
    rtc() {
      return this.$store.getters.rtc
    },
    roomId() {
      return this.$store.getters.roomId
    },
    title() {
      return this.$store.state.room.title
    },
    livein() {
      return this.$store.getters.livein
    },
    signal() {
      // 不在直播
      if (!this.live) return 4
      // 不在推流
      if (!this.$store.getters.hasMeStreamPublish) return 4
      let signal = 4
      return signal
    },
    live() {
      return this.$store.getters.livein
    },
    liveTime() {
      if (this.tick) Function.prototype()
      if (!this.live) return ''
      const time = Date.now() - this.$store.state.liveStartAt
      const str = secToTimeString(time)
      return str
    },
    hasLiveRole() {
      return this.$store.getters.isMaster
    },
    hasOp() {
      return this.$store.getters.hasOp
    },
  },
}
</script>

<style lang="less" scoped>
.main-header {
  height: 56px;
  //background: #111;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  //padding-left: 24px;
  //padding-right: 24px;
}

.main-header .left-box {
  color: #999;
  display: flex;
  align-items: center;

  .xinhao-box {
    width: 20px;
    display: flex;
    display: none;
    align-items: flex-end;

    > span.down {
      background-color: gray;
    }

    > span {
      background: #1ad5ce;
      width: 2px;
      margin-right: 2px;

      &:nth-child(1) {
        height: 4px;
      }

      &:nth-child(2) {
        height: 7px;
      }

      &:nth-child(3) {
        height: 9px;
      }

      &:nth-child(4) {
        height: 12px;
      }
    }
  }

  .room-title {
    font-size: 22px;
    line-height: 18px;
    margin-left: 5px;
    font-weight: 400;
    min-width: 30px;
    color: black;
  }

  .room-type {
    border: 1px #02A7F0 solid;
    padding: 2px 8px;
    margin-left: 10px;
    color: #00b1ff;
  }
}

.main-header .right-box {
  display: flex;
  align-items: center;

  .time {
    font-size: 14px;
    color: #000;
    margin-right: 16px;
    display: flex;
    align-items: center;

    .time-icon-box {
      height: 14px;
      width: 14px;
      background: rgba(30, 144, 255, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;

      .time-content {
        height: 6px;
        width: 6px;
        border-radius: 50%;
        background: #1e90ff;
      }
    }
  }

  .live-btn {
    margin-right: 16px;
  }
}
</style>
