<template>
  <VhDialog
    :appendToBody="true"
    :showFooter="false"
    :showHeader="true"
    :title="title"
    :closeOnClickModal="closeOnClickModal"
    :visible="visible"
    :beforeClose="beforeClose"
  >
    <div class="content">
      <span>{{ content }}</span>
    </div>
    <div class="footer">
      <button class="cancel" @click="close(0)">取消</button>
      <button class="success" @click="close(1)">确定{{ countdown && leftSecStr ? `(${leftSecStr})` : '' }} </button>
    </div>
  </VhDialog>
</template>

<script>
import VhDialog from '../../src/component'
export default {
  name: 'ConfirmDialog',
  props: ['title', 'content', 'onClose', 'closeOnClickModal', 'countdown'],
  components: { VhDialog },
  data: () => ({
    closeAt: 0,
    tick: true,
    visible: true
  }),
  mounted(){
    if (this.countdown) {
      this.closeAt = Date.now() + this.countdown * 1000
      const t = setInterval(() => this.tick = !this.tick, 250)
      this.$once('hook:beforeDestroy', () => clearInterval(t))
      this.$once('close', () => clearInterval(t))
    }
  },
  methods: {
    hide() {
      this.visible = false
    },
    beforeClose(hide) {
      hide()
      this.close(0)
    },
    close(ok) {
      this.$emit('close')
      if (this.onClose) this.onClose(ok)
    }
  },
  computed: {
    left: function () {
      return (this.closeAt - Date.now() + this.tick)
    },
    leftSecStr: function () {
      const sec = this.left / 1000
      if (sec < 0) {
        return ''
      }
      return Math.trunc(sec) + 's'
    }
  },
  watch: {
    left: function (val, prev) {
      if (val >= 0) return
      if (this.visible) {
        this.hide()
        this.close(0)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.content {
  margin-top: 8px;
  font-size: 14px;
  width: 100%;
  text-align: center;
  color: black;
}
.footer {
  margin-top: 40px;
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}
.footer button {
  width: 80px;
  height: 32px;
  border-radius: 4px;
  font-size: 14px;
  letter-spacing: 0;
  margin: 0 12px;
}
.footer button.cancel {
  background-color: transparent;
  color: #666666;
  border: 1px solid #999999;
}
.footer button.success {
  background: #1E90FF;
  color: #FFFFFF;
  border: none;
}
</style>
