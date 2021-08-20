<template>
  <div class="home">
    <center><h1 style=" color: black; font-weight: 600; font-size: 1.6em; margin-top: 20px;">功能尚未实现，请移步pc进行观看</h1></center>
  </div>
</template>

<script>
import {IDENTITY} from '@/utils'
import {inavApi} from '@/common/api'
import {Bus} from '@/message/bus'
import {createStore} from '@/store'

export default {
  name: 'Main',
  components: {},
  props: ['viewData', 'store'],
  data: () => ({
    IDENTITY: IDENTITY,
    rtc: null,
    deviceSelect: 0,
    deviceSelectMust: false,
    attributes: null,
    restoreLive: false,
    autoPublish: false,
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
    this.$bus.vm = this
    this.$bus.store = this.$store
    if (process.env.NODE_ENV !== 'production') {
      window.store = this.$store
      window.vm = this
    }
  },
  async mounted() {
  },
  methods: {
  },
  beforeDestroy() {
    inavApi.roomId = null
  },
  watch: {
  }
}
</script>

<style lang="less">
.home {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 800px;
  width: 1280px;
  margin: auto;
}
</style>
