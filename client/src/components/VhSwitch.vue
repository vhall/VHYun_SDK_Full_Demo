<template>
  <div class="vh_switch" @click="switchValue">
    <div :class="['vh_switch_insert', value ? 'right' : '']"></div>
  </div>
</template>

<script>
export default {
  name: 'VhSwitch',
  data() {
    return {}
  },
  props: {
    value: {
      type: [Boolean, String, Number],
      default: false,
    },
  },
  computed: {},
  watch: {},
  methods: {
    switchValue: function() {
      this.$emit('click')
    },
  },
  mounted() {},
}
</script>

<style lang="less" scoped>
.vh_switch {
  display: inline-block;
  width: 22px;
  height: 10px;
  background: #151515;
  position: relative;
  border-radius: 100px;
  cursor: pointer;
  .input {
    display: none;
  }
  .vh_switch_insert {
    position: absolute;
    left: -1px;
    top: -1px;
    width: 12px;
    height: 12px;
    background: #999999;
    border-radius: 50%;
    transition: all 0.5s ease;
    &.right {
      left: 11px;
      background: #1bc7c4;
    }
  }
}
</style>
