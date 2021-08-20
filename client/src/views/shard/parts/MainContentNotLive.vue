<template>
  <div class="main-content-not-live">
    <div class="share">
      <div class="text">
        {{ text }}
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'MainContentNotLive',
  components: {},
  data: () => ({}),
  methods: {},
  computed: {
    text() {
      const status = this.$store.getters.liveStatus
      if (status === 4) return '直播已结束'
      if (status === 3) return '直播进行中'
      if (status === 2) return '直播准备中'
      if (status === 1) return '直播未开始'
      return '直播未开始'
    }
  }
}
</script>

<style lang="less" scoped>
.main-content-not-live {
  display: flex;
  flex: 1;
  background-color: black;
  width: 100%;
  height: 100%;

  .share {
    margin: auto;
    height: 48px;
    color: #666666;
    font-size: 36px;
    text-align: center;
  }
}
</style>
