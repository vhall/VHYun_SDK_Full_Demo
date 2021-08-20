<template>
  <div class="home">
    <center><h1 style=" color: black; font-weight: 600; font-size: 1.6em; margin-top: 20px;">H5不支持发起直播</h1></center>
  </div>
</template>

<script>

export default {
  name: 'Main',
  components: {},
  props: ['viewData', 'store'],
  data: () => ({
  }),
  computed: {
  },
  beforeCreate() {
  },
  async mounted() {
  },
  methods: {
  },
  beforeDestroy() {
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
