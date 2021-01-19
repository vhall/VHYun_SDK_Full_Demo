<template>
  <div class="mainHeader">
    <div class="leftBox">
      <div class="xinhaoBox">
        <span v-for="i in signalBox" :key="i" :class="{ down: i > signal }"></span>
      </div>
      <span :title="roomId">TITLE: {{ title || '' }}</span>
    </div>
    <div class="rightBox">
      <div v-show="live" class="time">
        <span class="timeiconBox"><span class="timecontent"></span></span>
        <span>{{ liveTime }}</span>
      </div>
      <Button round class="live_btn" type="primary" @click="_liveChange" v-if="hasLiveRole">{{ live ? '结束推流' : '开始推流' }}</Button>
      <Button round type="info" @click="_liveGoto"  v-if="hasLiveRole">去观看</Button>
      <div style="display: none" v-if="hasOp">设置</div>
    </div>
  </div>
</template>

<script>
import Button from '@/components/Button'
import {IDENTITY} from "@/utils";
export default {
  name: 'MainHeader',
  components: { Button },
  props: {
    liveChange: Function,
  },
  data: function() {
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
    _liveChange () {
      const live = this.live
      if (this.liveChange) this.liveChange(!live)
    },
    _liveGoto() {
      if (!this.roomId) return
      const url = window.location.protocol + '//' + window.location.host + '/?' + 'roomId=' + this.roomId
      window.open(url)
    }
  },
  watch: {
    tick: async function () {
      if (!this.rtc) return
      const lossFn = () => new Promise((resolve, reject) => this.rtc.getPacketLossRate({ }, resolve, reject)).catch(e => e)
      const loss = await lossFn()
      if (loss instanceof Error) {
        this.packetLoss = 0
        return
      }
      const { upLossRate, downLossRate } = loss
      this.packetLoss = ((upLossRate || 0) + (downLossRate || 0)) / 2
    },
  },
  computed: {
    rtc() {
      return this.$store.state.sdk.$rtc
    },
    roomId () {
      return this.$store.state.room.roomId
    },
    title () {
      return this.$store.state.room.title
    },
    signal () {
      if (!this.$store.state.live) return 4
      if (this.$store.state.liveStartAt <= 0) return 4
      let signal = 4
      if (this.packetLoss > 70) signal = 0
      else if (this.packetLoss > 45) signal = 1
      else if (this.packetLoss > 30) signal = 2
      else if (this.packetLoss > 20) signal = 3
      else signal = 4
      return signal
    },
    live () {
      return this.$store.state.live
    },
    liveTime () {
      if (this.tick) Function.prototype()
      if (this.$store.state.liveStartAt <= 0) return ''
      const arr = []
      let time = Date.now() - this.$store.state.liveStartAt
      time = Math.trunc(time / 1000)
      const h = Math.trunc(time / 3600)
      arr.push(h.toString().padStart(2, '0'))
      time -= h * 3600
      const m = Math.trunc(time / 60)
      arr.push(m.toString().padStart(2, '0'))
      time -= m * 60
      arr.push(time.toString().padStart(2, '0'))
      return arr.join(':')
    },
    hasLiveRole (){
      return this.$store.state.user?.identity === IDENTITY.master
    },
    hasOp () {
      return this.$store.state.user.identity === IDENTITY.helper || this.$store.state.user.identity === IDENTITY.master
    },
  },
}
</script>

<style lang="less" scoped>
.mainHeader {
  height: 56px;
  background: #111;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24px;
  padding-right: 24px;
}
.mainHeader .leftBox {
  color: #999;
  display: flex;
  align-items: center;
  .xinhaoBox {
    width: 20px;
    display: flex;
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
  > span {
    font-size: 14px;
    line-height: 18px;
    margin-left: 5px;
  }
}
.mainHeader .rightBox {
  display: flex;
  align-items: center;
  .time {
    font-size: 14px;
    color: #f7f7f7;
    margin-right: 16px;
    display: flex;
    align-items: center;
    .timeiconBox {
      height: 14px;
      width: 14px;
      background: rgba(30, 144, 255, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      .timecontent {
        height: 6px;
        width: 6px;
        border-radius: 50%;
        background: #1e90ff;
      }
    }
  }
  .live_btn {
    margin-right: 16px;
  }
}
</style>
