<template>
  <transition name="message-fade" @after-leave="handleAfterLeave">
    <div v-if="visible" :class="wrapClasses" :style="positionStyle">
      <img class="message-img" :src="typeImg" />
      <span class="message-text">{{ message }}</span>
    </div>
  </transition>
</template>

<script>
const prefixCls = 'message'
export default {
  name: 'message',
  data() {
    return {
      visible: false,
      type: 'info',
      message: '',
      duration: 3000,
      verticalOffset: 20,
      onClose: null,
      closed: false
    }
  },
  computed: {
    wrapClasses() {
      return [`${prefixCls}`, `${prefixCls}-${this.type}`]
    },
    positionStyle() {
      return {
        top: `${this.verticalOffset}px`
      }
    },
    typeImg() {
      return require(`./images/message_${this.type}.png`)
    }
  },
  watch: {
    closed(newVal) {
      if (newVal) {
        this.visible = false
      }
    }
  },
  methods: {
    handleAfterLeave() {
      this.$destroy(true)
      this.$el.parentNode.removeChild(this.$el)
    },
    startTimer() {
      if (this.duration > 0) {
        this.timer = setTimeout(() => {
          if (!this.closed) {
            this.close()
          }
        }, this.duration)
      }
    },
    close() {
      this.closed = true
      if (typeof this.onClose === 'function') {
        this.onClose(this)
      }
    }
  },
  mounted() {
    this.startTimer() // 挂载的时候就开始计时，3000ms后消失
  }
}
</script>

<style scoped>
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}
.message-fade-enter, .message-fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  transform: translateY(-20px);
  opacity: 0;
}
.message {
  position: fixed;
  top: 15px;
  left: 50%;
  min-width: 320px;
  transform: translateX(-50%);
  height: 36px;
  border-radius: 4px;
  padding: 0px 16px;
  color: #333;
  font-size: 14px;
  line-height: 36px;
  z-index: 2020;
}
.message-close {
  position: absolute;
  top: 25%;
  right: 10px;
  color: rgba(153, 152, 152, 0.774);
  cursor: pointer;
  font-size: 17px;
}
.message-close:hover {
  color: #0c0c0c;
}
.message-img {
  display: inline-block;
  border-radius: 50%;
  width: 16px;
  margin-right: 6px;
  margin-top: 10px;
  font-size: 0;
}
.message-success {
  background: #dcffefd3;
  color: rgb(48, 194, 104);
}
.message-info {
  background: #e8f3ff;
}
.message-warning {
  color: #ecae51;
  background: #ffdec9;
}
.message-error {
  background: #ffe2e2;
  color: rgb(255, 108, 108);
}
.message-text {
  word-break: keep-all;
}
</style>
