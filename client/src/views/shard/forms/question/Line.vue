<template>
  <div class="q-line"></div>
</template>

<script>

export default {
  props: {
    index: Number,
    value: Object,
  },
  computed: {
  },
  data() {
    return {
      errorTip: ""
    };
  },
  methods: {
    check() {
      if (!this.value.title) {
        this.errorTip = "分割线标题不能为空";
        return;
      } else {
        this.errorTip = "";
        return true;
      }
    }
  }
};
</script>


<style lang="less" scoped>
.q-line {
  width: 100%;
  border-bottom: 1px dashed #1E89E4;
}
</style>
