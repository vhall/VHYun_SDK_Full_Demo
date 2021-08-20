<template>
  <div class="q-checkbox" :class="{'preview-pc' :!value.edit}">
    <div class="q-title">
      <div
        class="preview"
        v-if="!value.edit"
        :class="{'must': !value.edit&&value.required}"
      >{{ value.title }}
      </div>
      <img v-if="!value.edit&&value.imgUrl" :src="value.imgUrl" alt/>
      <c-edit
        v-if="value.edit"
        v-model="value.title"
        :canUpload="true"
        :maxLength="50"
        @upload="titleUpload"
        :imgUrl="value.imgUrl"
        @uploadFail="titleUploadFail"
      ></c-edit>
    </div>
    <div class="errorTip" v-if="errorTip">{{ errorTip }}</div>
    <div class="items" v-if="value.edit">
      <el-checkbox-group v-model="correctIndexs">
        <div class="item" v-for="(item, idx) in value.items || []" :key="item.key + (item.id || '')">
          <el-checkbox class="edit" :label="idx" @change="change(idx)"/>
          <c-edit
            v-model="item.value"
            :idx="idx"
            :canUpload="true"
            :canDel="canDel"
            @del="delItem(idx)"
            :maxLength="50"
            @upload="answerUpload"
            :imgUrl="item.imgUrl"
            @uploadFail="answerUploadFail"
            :disabled="!!item.disabled"
          ></c-edit>
        </div>
      </el-checkbox-group>
      <div class="add-items" v-if="value.edit" @click="addItems(false)">
        <i class="elicon el-icon-plus"></i>
        添加选项
      </div>
      <br>
      <div v-if="value.edit && customQues" class="add-items" @click="addItems(true)">
        <i class="elicon el-icon-plus"></i>
        添加自定义选项
      </div>
    </div>
    <div class="items previewItem" v-if="!value.edit">
      <el-checkbox-group class="item" v-model="correctIndexs">
        <el-checkbox
          class="preview-checkbox"
          v-for="(item) in value.items"
          :key="item.key + (item.id || '')"
          :label="item.key"
          @change="changeReply(item.key)"
        >
          {{ item.value }}
          <img class="img" v-if="item.imgUrl" :src="item.imgUrl"/>
          <input class="inputValue" v-model="item.custom_val" placeholder="请输入自定义内容"
                 v-if="!value.edit && item.custom_opt==1"/>
        </el-checkbox>
      </el-checkbox-group>
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
      return this.value.items.every(item => Number(item.custom_opt) === 2)
    }
  },
  components: {
    CEdit
  },
  data() {
    return {
      correctIndexs: [],
      canDel: true,
      errorTip: '',
      keyArr: 'ABCDEFGHIJKLMNOPQRST'.split(''),
    }
  },
  created() {
    if (this.value.edit && this.value.correctIndex !== -1) {
      this.correctIndexs = this.value.correctIndex
    } else if (!this.value.edit && this.value.replys.length) {
      this.correctIndexs = this.value.replys
    }
  },
  methods: {
    addItems(isOther = false) {
      const len = this.value.items.length
      if (this.value.max && this.value.max <= len) {
        return this.$message && this.$message.error('选项不可超过' + this.value.max + '个')
      }
      // console.log(len)
      let obj = {
        value: isOther ? '自定义' : `选项${len + 1}`,
        key: this.keyArr[len],
        imgSrc: '',
        custom_opt: isOther ? 1 : 2,
        disabled: false
      }
      this.value.items.push(obj)
      this.value.custom_ques = isOther ? 1 : 2
      this.$emit('change', this.value)
    },
    change(idx) {
      this.value.correctIndex = this.correctIndexs
      this.$emit('change', this.value)
    },
    changeReply() {
      this.value.replys = [...this.correctIndexs]
      this.$emit('change', this.value)
    },
    delItem(idx) {
      this.value.items.splice(idx, 1)
      let temp = 2
      for (const iterator of this.value.items) {
        if (Number(iterator.custom_opt) === 1) {
          temp = 1
          break
        }
      }
      // 删除选项后更改删除选项后所有的key及value值，防止再生成的value值和上次选项值一样
      this.value.items.forEach((el, index) => {
        el.key = this.keyArr[index]
      })

      this.value.custom_ques = temp
      this.$emit('change', this.value)
    },
    check() {
      if (
        !this.value.edit &&
        this.value.required &&
        !this.value.replys.length
      ) {
        this.errorTip = '请选择选项'
        return
      } else {
        this.errorTip = ''
        return true
      }
    },
    titleUpload(src) {
      this.value.imgUrl = src
      this.$emit('change', this.value)
    },
    titleUploadFail(msg) {
      this.errorTip = '标题' + msg
    },
    answerUpload(src, idx) {
      this.value.items[idx].imgUrl = src
      this.$emit('change', this.value)
      this.errorTip = ''
      this.$forceUpdate()
    },
    answerUploadFail(msg, index) {
      this.errorTip = `选项${index + 1}${msg}`
    }
  },
  watch: {
    'value.items.length'(val) {
      this.canDel = Number(val) === 1 ? false : true
    }
  }
}
</script>

<style lang="less" scoped>

.q-checkbox {
  text-align: left;

  .el-radio {
    height: 38px;
    line-height: 38px;
    font-size: 16px;
    margin-right: 0px;
  }

  .item {
    display: flex;
    align-items: flex-start;
    margin-top: 10px;
    // line-height: 38px;

    /deep/ .el-checkbox-group {
      width: 100%;
      height: 38px;
      line-height: 34px;
      display: flex;
    }

    .edit {
      line-height: 38px;
    }
  }

  /deep/ .el-checkbox__label {
    font-size: 16px;
    padding-left: 20px;
  }

  .edit {
    margin-right: 10px;

    /deep/ .el-checkbox__label {
      display: none;
    }
  }

  .add-items {
    display: inline-flex;
    // line-height: 20px;
    align-items: center;
    margin-top: 10px;
    font-size: 14px;
    cursor: pointer;

    i {
      margin-right: 10px;
    }

  }

  .errorTip {
    font-size: 14px;
    color: #ff3939;
  }

  &.preview-pc {
    .q-title {
      margin-bottom: 18px;
      line-height: 22px;
      text-align: left;
      font-size: 16px;

      .must::after {
        content: "*";
        color: red;
      }

      img {
        margin-top: 10px;
      }
    }

    img {
      max-width: 500px;
    }

    .items {
      &.previewItem {
        .item {
          line-height: 20px;
          display: block;
        }

        /deep/ .el-checkbox {
          margin-top: 20px;
          line-height: 20px;
          display: block;

          /deep/ .el-checkbox__label {
            line-height: 20px;
          }
        }

        .img {
          display: block;
          margin-top: 10px;
        }
      }
    }

    @media screen and (max-width: 768px) {
      .q-title {
        margin: 0 0 15px 15px;
      }

      .items {
        font-size: 15px;

        &.previewItem {
          .item {
            line-height: 38px;
          }

          /deep/ .el-checkbox {
            width: 100%;
            padding-left: 10px;
            line-height: 38px;
            border: 1px solid #ccc;
            border-radius: 2px;
            box-sizing: border-box;

            .img {
              margin: 0 0 10px -24px;
              max-width: 100%;
            }

            &.is-checked {
              border-color: #1e89e4;
              background: #eaf6ff;
              color: #1e89e4;
            }

            /deep/ .el-checkbox__label {
              padding-left: 10px;
              line-height: 38px;
              font-size: 15px;
            }
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
</style>
