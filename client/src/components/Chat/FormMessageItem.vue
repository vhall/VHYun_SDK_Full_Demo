<template>
  <div class="message-item-info" :data-msgid="msg.msgId" :data-userid="msg.sourceId" :data-identity="user.identity">
    <div class="form-tips">
      主持人发布了表单，<a @click="gotoAnswer($event)" class="form-answer">点击填写</a>
    </div>
  </div>
</template>

<script>

export default {
  name: 'FormMessageItem',
  data() {
    return {}
  },
  props: {
    msg: Object,
    user: Object,
  },
  computed: {},
  watch: {},
  methods: {
    gotoAnswer(e) {
      this.$emit('action', 'answer', this.msg.data)
      return false
    }
  },
  mounted() {},
}
</script>

<style lang="less" scoped>
.message-item-info {
  display: flex;
  align-items: flex-start;
  margin-top: 16px;
  .form-tips {
    font-size: 12px;
    text-align: center;
    width: 100%;
    color: #ddd;
    .form-answer {
      cursor: pointer;
      display: inline-block;
      color: #1E89E4;
    }
  }
}
</style>
