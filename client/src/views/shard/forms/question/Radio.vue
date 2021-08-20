<template>
  <div class="q-radio" :class="{ 'preview-pc': !value.edit }">
    <div class="q-title">
      <!-- <div class="title-wrap"> -->
      <div
        v-if="!value.edit"
        class="preview"
        :class="{ must: !value.edit && value.required }"
      >
        {{ value.title }}
      </div>
      <img v-if="!value.edit && value.imgUrl" :src="value.imgUrl" alt/>
      <!-- </div> -->
      <c-edit
        v-show="value.edit"
        v-model="value.title"
        :canUpload="true"
        @upload="titleUpload"
        @uploadFail="titleUploadFail"
        :maxLength="50"
        :imgUrl="value.imgUrl"
      ></c-edit>
    </div>
    <div class="error" v-if="errorTip">{{ errorTip }}</div>
    <div class="items">
      <div class="item" v-for="(item, idx) in value.items" :key="idx">
        <el-radio
          v-if="value.edit"
          class="edit"
          v-model="val"
          :label="item.key"
          @change="change(idx)"
        >{{ item.value }}
        </el-radio>
        <c-edit
          v-if="value.edit"
          :idx="idx"
          v-model="item.value"
          :canUpload="true"
          :canDel="canDel"
          @upload="answerUpload"
          @uploadFail="answerUploadFail"
          @del="delItem(idx)"
          :maxLength="50"
          :imgUrl="item.imgUrl"
          :disabled="!!item.disabled"
        ></c-edit>
        <el-radio
          v-if="!value.edit"
          v-model="val"
          :label="item.key"
          @change="changeReplys(item.key)"
        >
          {{ item.value }}
          <img
            class="img"
            v-if="!value.edit && item.imgUrl"
            :src="item.imgUrl"
            alt
          />
          <input class="inputValue" v-model="item.custom_val" placeholder="请输入自定义内容"
                 v-if="!value.edit && item.custom_opt==1"/>
        </el-radio>
      </div>
      <div v-if="value.edit" v-show="this.value" class="add-items" @click="addItems(false)">
        <i class="elicon el-icon-plus"></i>
        添加选项
      </div>
      <div v-if="value.edit && customQues" class="add-items" @click="addItems(true)">
        <i class="elicon el-icon-plus"></i>
        添加自定义选项
      </div>
    </div>
  </div>
</template>

<script>
import CEdit from '../c-edit.vue'

export default {
  props: {
    index: Number,
    value: Object,
  },
  computed: {
    customQues() {
      return this.value.items.every(item => item.custom_opt === 2)
    }
  },
  components: {
    CEdit,
  },
  data() {
    return {
      val: '',
      errorTip: '',
      canDel: true,
      keyArr: 'ABCDEFGHIJKLMNOPQRST'.split(''),
    }
  },
  created() {
    if (this.value.edit && this.value.correctIndex !== -1) {
      this.val = this.value.items[this.value.correctIndex].key
    } else {
      this.val = this.value.replys[0]
    }
  },
  methods: {
    addItems(isOther = false) {
      const len = this.value.items.length
      if (this.value.max && this.value.max <= len) {
        return this.$message && this.$message.error('选项不可超过' + this.value.max + '个')
      }
      const obj = {
        value: isOther ? `自定义` : `选项`,
        key: this.keyArr[this.value.items.length],
        imgSrc: '',
        custom_opt: isOther ? 1 : 2,
        disabled: false,
      }
      this.value.items.push(obj)
      this.value.custom_ques = isOther ? 1 : 2
      this.$emit('change', this.value)
    },
    change(idx) {
      this.value.correctIndex = idx
      this.$emit('change', this.value)
    },
    changeReplys(reply) {
      this.value.replys = reply
      this.$emit('change', this.value)
    },
    delItem(selectIndex) {
      if (selectIndex === this.value.correctIndex) {
        this.val = ''
        // 当删除的是正确打枊时，清空corrextIndex
        this.value.correctIndex = -1
      }
      this.value.items.splice(selectIndex, 1)
      // 删除选项后更改删除选项后所有的key及value值，防止再生成的value值和上次选项值一样
      this.value.items.forEach((el, index) => {
        el.key = this.keyArr[index]
      })
      let temp = 2
      for (const iterator of this.value.items) {
        if (Number(iterator.custom_opt) === 1) {
          temp = 1
          break
        }
      }
      this.value.custom_ques = temp

      // mutations.delRaidoItems(idx, this.index, () => {
      //   this.val = ''
      // })
      this.$emit('change', this.value)
    },
    titleUpload(data) {
      this.value.imgUrl = data
      this.$emit('change', this.value)
    },
    titleUploadFail(msg) {
      this.errorTip = '标题' + msg
    },
    answerUpload(src, idx) {
      this.errorTip = ''
      this.$forceUpdate()
      this.value.items[idx].imgUrl = src
      this.$emit('change', this.value)
    },
    answerUploadFail(msg, index) {
      this.errorTip = `选项${index + 1}${msg}`
    },
    check() {
      if (
        this.value.required &&
        !this.value.edit &&
        !this.value.replys.length
      ) {
        this.errorTip = '该题必填'
        return false
      } else {
        this.errorTip = ''
        return true
      }
    },
  },
  watch: {
    'value.items.length'(val) {
      this.canDel = val === 1 ? false : true
    },
    'value.correctIndex'(val) {
      if (val !== -1) {
        this.val = this.value.items[val].key
      }
    },
  },
}
</script>

<style lang="less" scoped>

.q-radio {
  text-align: left;

  .el-radio {
    line-height: 38px;
    font-size: 16px;
    margin-right: 0px;
  }

  .item {
    display: flex;
    align-items: flex-start;
    margin-top: 10px;
    line-height: 34px;
  }

  .edit {
    margin-right: 10px;

    /deep/ .el-radio__label {
      display: none !important;
    }
  }

  .add-items {
    display: flex;
    align-items: center;
    margin-top: 10px;
    font-size: 14px;
    cursor: pointer;

    i {
      margin-right: 10px;
    }

    &:hover {
      //color: $hover-color;
    }
  }

  .error {
    margin: 5px 0 10px;
    color: red;
    font-size: 14px;
  }

  &.preview-pc {
    .q-title {
      margin-bottom: 18px;

      .preview {
        height: 22px;
        line-height: 22px;
        text-align: left;
        font-size: 16px;

        &.must {
          &::after {
            content: "*";
            color: red;
          }
        }
      }
    }

    img {
      margin-top: 10px;
      max-width: 500px;
    }

    .item {
      margin: 0 0 20px;

      &:last-child {
        margin-bottom: 0px;
      }

      .el-radio {
        line-height: 20px;

        .img {
          display: block;
          margin-left: 34px;
        }

        /deep/ .el-radio__label {
          padding-left: 20px;
        }
      }
    }

    @media screen and (max-width: 768px) {
      .q-title {
        margin: 0 0 15px 15px;
      }

      img {
        max-width: 100%;
        margin-left: -15px;
      }

      .item {
        /deep/ .el-radio {
          width: 100%;
          padding: 0 10px;
          line-height: 38px;
          border: 1px solid #ccc;
          border-radius: 2px;

          .img {
            max-width: 100%;
            margin: 0px 0 10px;
            margin-left: 0;
            border-radius: 0;
          }

          &.is-checked {
            background: #eaf6ff;
            border-color: #1e89e4;
            color: #1e89e4;
          }

          /deep/ .el-radio__label {
            font-size: 15px;
            padding-left: 10px;
          }
        }
      }
    }
  }
}

.inputValue {
  -webkit-appearance: none;
  background-color: #FFF;
  background-image: none;
  border-radius: 4px;
  border: 1px solid #DCDFE6;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  color: #606266;
  display: inline-block;
  font-size: inherit;
  height: 40px;
  line-height: 40px;
  outline: 0;
  padding: 0 15px;
  -webkit-transition: border-color .2s cubic-bezier(.645, .045, .355, 1);
  transition: border-color .2s cubic-bezier(.645, .045, .355, 1);
  width: 100%;

  &:hover {
    border-color: #C0C4CC;
  }
}

@media screen and (max-width: 500px) {
  .inputValue {
    border: none;
    width: 50%;;
  }
}
</style>
