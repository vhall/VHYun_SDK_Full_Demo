<template>
  <div class="q-page">
    <span v-if="value.edit" class="l-num">页码：{{value.pageId + 1}}/{{totalPage}}</span>
    <div v-if="value.edit" class="options" @mouseenter="mouseenter" @mouseleave="mouseleave">
      <i class="elicon el-icon-more"></i>
      <div class="option-select" v-if="isShowOption">
        <div class="item" @click="del">删除页</div>
      </div>
    </div>
    <div class="btn" v-if="!value.edit">
      <el-button v-if="firstPage" type="primary" @click="getPrev">上一页</el-button>
      <el-button v-if="finalPage" type="primary" @click="getNext">下一页</el-button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    index: Number,
    value: Object,
    totalPage: {
      type: [Number, String],
      default: 1
    },
    finalPage: {
      type: Boolean,
      default: false
    },
    firstPage: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isShowOption: false,
      errorTip: ""
    };
  },
  computed: {
  },
  created() {},
  methods: {
    mouseenter() {
      this.isShowOption = true;
    },
    mouseleave() {
      this.isShowOption = false;
    },
    del() {
      this.$emit("delPage", this.value.pageId);
      this.isShowOption = false;
    },
    getPrev() {
      this.$emit("getPrev");
    },
    getNext() {
      this.$emit("getNext");
    },
    check() {
      if (!this.value.title) {
        this.errorTip = "标题不能为空";
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
.q-page {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  line-height: 22px;
  font-size: 14px;
  // border: 1px solid black;
  color: #555;

  i {
    font-size: 20px;
    cursor: pointer;

    &:hover {
      //color: $hover-color;
    }
  }

  .options {
    position: relative;
  }

  .option-select {
    position: absolute;
    width: 102px;
    right: 0;
    z-index: 999;
    line-height: 36px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;

    .item:hover {
      //background: $light-color;
      color: #1E89E4;
    }
  }
  .btn {
    width: 100%;
    display: flex;
  }
  /deep/ .el-button {
    width: 140px;
    background: #1e89e4;
    border-radius: 100px;
    font-weight: 400;
  }

  @media screen and (max-width: 768px) {
    /deep/ .el-button {
      width: 160px;
      border-radius: 4px;
      font-weight: 400;
    }
  }
}
</style>
