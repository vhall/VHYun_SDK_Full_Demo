<template>
  <button
    class="vh-button"
    @click="handleClick"
    :autofocus="autofocus"
    :type="nativeType"
    :disabled="disabled"
    :class="[
      type ? 'vh-button-' + type : '',
      {
        'is-round': round,
        'is-disabled': disabled
      }
    ]"
  >
    <i class="el-icon-loading" v-if="loading"></i>
    <i :class="icon" v-if="icon && !loading"></i>
    <span v-if="$slots.default"><slot></slot></span>
  </button>
</template>
<script>
export default {
  name: 'VhBtton',

  props: {
    type: {
      type: String,
      default: 'default'
    },
    icon: {
      type: String,
      default: ''
    },
    nativeType: {
      type: String,
      default: 'button'
    },
    loading: Boolean,
    disabled: Boolean,
    plain: Boolean,
    autofocus: Boolean,
    round: Boolean,
    circle: Boolean
  },

  computed: {},

  methods: {
    handleClick(evt) {
      this.$emit('click', evt)
    }
  }
}
</script>

<style lang="less">
.vh-button {
  display: inline-block;
  height: 32px;
  line-height: 32px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #666;
  -webkit-appearance: none;
  text-align: center;
  box-sizing: border-box;
  outline: none;
  margin: 0;
  transition: 0.1s;
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  padding: 0px 20px;
  font-size: 14px;
  border-radius: 4px;
  &.vh-button-info {
    color: #aaa;
    background: #222;
    border-color: #222;
    // &:hover {
    //   background: #1f1f1f;
    //   border-color: #1f1f1f;
    // }
  }
  &.vh-button-primary {
    background: #1e90ff;
    color: #fff;
    border-color: #1e90ff;
    &:hover {
      background: #47a9ff;
      border-color: #47a9ff;
    }
    &:focus {
      background: #0f6dd9;
      border-color: #0f6dd9;
    }
  }
  &.is-round {
    border-radius: 20px;
  }
  &.is-disabled {
    background: #e2e2e2;
    color: #fff;
  }
}
</style>
