<template>
  <transition name="modal-fade">
    <div v-show="visible">
      <div class="smile-dialog-mask"></div>
      <div class="smile-dialog-warp" @click.self="handleWrapperClick">
        <div class="smile-dialog" ref="dialog" :style="style">
          <div class="smile-dialog-header" v-if="showHeader">
            <slot name="title">
              <span class="smile-dialog-header">{{ title }}</span>
            </slot>
            <i class="iconfont iconicon-guanbi smile-dialog-close" @click="handleClose"></i>
          </div>

          <div class="smile-dialog-body">
            <slot></slot>
          </div>

          <div class="smile-dialog-footer" v-if="showFooter">
            <slot name="footer">
              <Button class="close" @click="handleClose">取消</Button>
              <Button class="sure" type="primary" @click="sure">确定</Button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
<script>
import Button from '../../Button/index'
export default {
  name: 'VhDialog',
  components: { Button },
  props: {
    title: {
      type: String,
      default: '提示',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    showFooter: {
      type: Boolean,
      default: false,
    },
    showClose: {
      type: Boolean,
      default: true,
    },
    width: String,
    closeOnClickModal: {
      type: Boolean,
      default: true,
    },
    beforeClose: Function,

    // modalAppendToBody: {
    //   type: Boolean,
    //   default: true
    // },

    appendToBody: {
      type: Boolean,
      default: false,
    },

    lockScroll: {
      type: Boolean,
      default: true,
    },

    // closeOnPressEscape: {
    //   type: Boolean,
    //   default: true
    // },
    // fullscreen: Boolean,

    // customClass: {
    //   type: String,
    //   default: ''
    // },

    // top: {
    //   type: String,
    //   default: '15vh'
    // },

    // center: {
    //   type: Boolean,
    //   default: false
    // },

    // destroyOnClose: Boolean
  },

  data() {
    return {
      closed: false,
      key: 0,
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.closed = false
        this.$emit('open')
        // this.$el.addEventListener('scroll', this.updatePopper)
        // this.$nextTick(() => {
        //   this.$refs.dialog.scrollTop = 0
        // })
        if (this.appendToBody) {
          document.body.appendChild(this.$el)
        }
      } else {
        // this.$el.removeEventListener('scroll', this.updatePopper)
        if (!this.closed) this.$emit('close')
        // if (this.destroyOnClose) {
        //   this.$nextTick(() => {
        //     this.key++
        //   })
        // }
      }
    },
  },

  computed: {
    style() {
      let style = {}
      style.marginTop = this.top
      if (this.width) {
        style.width = this.width
      }
      return style
    },
  },

  methods: {
    getMigratingConfig() {
      return {
        props: {
          size: 'size is removed.',
        },
      }
    },
    handleWrapperClick() {
      if (!this.closeOnClickModal) return
      this.handleClose()
    },
    handleClose() {
      if (typeof this.beforeClose === 'function') {
        this.beforeClose(this.hide)
      } else {
        this.hide()
      }
    },
    hide(cancel) {
      if (cancel !== false) {
        this.$emit('close')
        this.closed = true
      }
    },
    sure() {
      this.$emit('sure')
    },
    // updatePopper() {
    //   this.broadcast('ElSelectDropdown', 'updatePopper')
    //   this.broadcast('ElDropdownMenu', 'updatePopper')
    // },
    // afterEnter() {
    //   this.$emit('opened')
    // },
    // afterLeave() {
    //   this.$emit('closed')
    // }
  },

  mounted() {
    if (this.visible) {
      this.rendered = true
      // this.open()
      if (this.appendToBody) {
        document.body.appendChild(this.$el)
      }
    }
  },

  destroyed() {
    // if appendToBody is true, remove DOM node after destroy
    if (this.appendToBody && this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el)
    }
  },
}
</script>

<style lang="less" scoped>
.smile-dialog-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
  z-index: 1995;
  opacity: 0.5;
  background: #000;
}
.smile-dialog-warp {
  position: fixed;
  display: flex;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
  z-index: 1996;
  .smile-dialog {
    position: relative;
    margin: auto;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    box-sizing: border-box;
    width: 424px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    .smile-dialog-header {
      position: relative;
      text-align: center;
      font-size: 18px;
      color: #333333;
      padding-top: 32px;
      padding-bottom: 22px;
      padding-left: 16px;
      padding-right: 16px;
      font-weight: bold;
      .smile-dialog-close {
        position: absolute;
        right: 16px;
        color: #666;
        top: 30px;
        font-size: 24px;
        cursor: pointer;
        &:hover {
          color: #1e90ff;
        }
      }
    }
    .smile-dialog-body {
      flex: 1;
      min-height: 30px;
      padding-bottom: 1px;
      // padding: 16px 32px;
      margin-top: 0;
    }
    .smile-dialog-footer {
      padding: 32px;
      text-align: center;
      .close {
        border: 1px solid #666666;
      }
      .sure {
        margin-left: 10px;
      }
    }
  }
}
</style>
