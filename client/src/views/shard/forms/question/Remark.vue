<template>
  <div class="q-remark" :class="{'preview-pc': !value.edit}">
    <c-edit
      v-if="value.edit"
      v-model="value.title"
      :canUpload="true"
      @upload="upload"
      :imgUrl="value.imgUrl"
      @uploadFail="uploadFail"
    ></c-edit>
    <div v-if="!value.edit">{{ value.title }}</div>
    <img v-if="!value.edit&&value.imgUrl" :src="value.imgUrl" alt/>
    <div class="error" v-if="errorTip">{{ errorTip }}</div>
  </div>
</template>

<script>
import CEdit from '../c-edit.vue'

export default {
  components: {
    CEdit
  },
  props: {
    index: Number,
    value: Object,
  },
  data() {
    return {
      errorTip: ''
    }
  },
  computed: {
  },
  methods: {
    check() {
      // 上传图片失败问题
      if (!this.value.title) {
        this.errorTip = '备注标题不能为空'
        return
      } else {
        this.errorTip = ''
        return true
      }
    },
    upload(src) {
      this.errorTip = ''
      this.value.imgUrl = src
      this.$emit('change', this.value)
    },
    uploadFail(msg) {
      this.errorTip = msg
    }
  }
}
</script>

<style lang="less" scoped>
.q-remark {
  width: 100%;
  text-align: left;
  font-size: 16px;
  line-height: 22px;

  .error {
    margin-top: 10px;
    font-size: 12px;
    color: red;
    text-align: left;
    line-height: 20px;
  }

  &.preview-pc {
    img {
      margin-top: 10px;
      width: 100%;
      max-width: 100%;
    }

    @media screen and(max-width: 768px) {
      img {
        max-width: 100%;
      }
    }
  }
}
</style>
