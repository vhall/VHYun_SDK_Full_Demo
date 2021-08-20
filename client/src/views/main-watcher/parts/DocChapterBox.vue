<template>
  <div class="chapters-box" ref="chapters">
    <div class="chapter" v-for="(item, $index) in chapters" :data-index="$index" :key="$index">
      <div class="chapter-box" @click="turnTime(item)">
        <span class="xuhao">{{ item.slideIndex }}</span>
        <span class="title" :title="item.title">{{ item.title }}</span>
        <span class="time">{{ calculagraph(item.createTime) }}</span>
      </div>
      <div class="chapter-box" v-for="citem in item.sub" :key="citem.stepIndex" @click="turnTime(citem)">
        <span class="xuhao">{{ item.slideIndex }}-{{ citem.stepIndex }}</span>
        <i class="iconfont iconicon-jinyan"></i>
        <span class="title" :title="item.title">{{ citem.title }}</span>
        <span class="time">{{ calculagraph(item.createTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import {BUS_LOCAL_EVENTS} from '@/common/contant'
import {wait} from '@/utils'

// const list = [
//   {
//     cid: 'cossj-kksksksk',
//     docId: 'sskkjkljlkjklj',
//     slideIndex: 1,
//     stepIndex: 0,
//     title: '第一章',
//     sub: [
//       {
//         slideIndex: 1,
//         stepIndex: 1,
//         title: '第一章第一子章节'
//       }
//     ]
//   },
//   {
//     cid: 'cossj-sas;lkl;k;lk;lk',
//     docId: 'sskkjkljlkjklj',
//     slideIndex: 2,
//     stepIndex: 1,
//     title: '第二章',
//     sub: [
//       {
//         slideIndex: 1,
//         stepIndex: 1,
//         title: '第二章第一子章节'
//       }
//     ]
//   }
// ]

function calculagraph(timing) {
  const t = Number(timing)
  if (t <= 1) return '00:00:00'
  if (Number.isNaN(t)) return '00:00:00'
  let hour = Math.trunc(t / 3600)
  let minute = Math.trunc((t % 3600) / 60)
  let second = Math.trunc((t % 300) % 60)
  hour = hour >= 10 ? hour : '0' + hour
  minute = minute >= 10 ? minute : '0' + minute
  second = second >= 10 ? second : '0' + second
  return hour + ':' + minute + ':' + second
}

export default {
  name: 'DocChapterBox',
  components: {},
  data: function () {
    return {
      indexOf: -1,
      calculagraph: calculagraph,
      list: [],
    }
  },
  methods: {
    turnTime(item) {
      this.$root.$emit(BUS_LOCAL_EVENTS.VOD_TURN_TIME, item)
    },
    timeUpdate(time) {
      if (!(Array.isArray(this.chapters) && this.chapters.length)) return
      let idx = -1

      for (const [$index, chapter] of this.chapters.entries()) {
        const ct = chapter.createTime || 0
        if (ct === 0 && time !== 0) break
        if (ct > time + 1) break
        if (Math.abs(ct - time) > 1) continue
        idx = $index
      }
      if (idx >= 0 && this.indexOf !== idx) {
        this.indexOf = idx
      }
    }
  },
  mounted() {
    if (typeof VhallMsg === 'undefined' || !document.body.scrollIntoView) return
    const cancel = VhallMsg.onBroadcast((e) => {
      if (e.type !== 'time_update') return
      const time = e.data?.target?.currentTime
      if (typeof time !== 'number') return
      this.timeUpdate(time)
    })
    this.$once('hook:beforeDestroy', cancel)
  },
  computed: {
    chapters() {
      return this.$store.state.docChapters
    }
  },
  watch: {
    async indexOf(value) {
      const el = this.$refs.chapters.querySelector(`[data-index="${value}"]`)
      if (!el) return
      // debugger
      el.scrollIntoView({behavior: 'smooth'})
      el.classList.add('hi')
      await wait(100)
      el.classList.remove('hi')
    }
  }
}
</script>

<style lang="less" scoped>
.chapters-box {
  display: flex;
  flex-direction: column;
  //height: calc(~'100vh - 265px');
  height: 100%;
  min-height: 400px;
  overflow: auto;
  position: relative;

  .chapter-box {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0px 16px;
    font-size: 14px;
    color: #f7f7f7;

    .xuhao {
      margin-right: 16px;
    }

    > i {
      margin-right: 8px;
    }

    &:hover {
      background: #252525;
    }

    span.title {
      width: 170px;
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: keep-all;
      white-space: nowrap;
    }

    span.time {
      position: absolute;
      right: 20px;
    }
  }
}
</style>
