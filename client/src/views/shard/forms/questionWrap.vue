<template>
  <div
    class="question-wrap"
    :class="{
      click: isShowOperate,
      'preview-pc': !value.edit,
      page: !value.edit && value.type === 'page'
    }"
  >
    <div
      class="question-content"
      @click="questionClick"
      v-clickoutside="handleClose"
      :class="{ noIndex: QTypes.LINE || QTypes.PANINATION }"
    >
      <div
        class="index"
        :class="[
          { isLine: value.type === QTypes.LINE },
          { isRemark: value.type === QTypes.REMARK },
          { isPagination: value.type === QTypes.PAGE }
        ]"
      >
        {{ value.idx || getIndex }}
      </div>
      <div
        class="q-edit display"
        :class="{
          noIndex:
            value.type === QTypes.LINE ||
            value.type === QTypes.REMARK ||
            value.type === QTypes.PAGE
        }"
      >
        <q-page
          v-if="value.type === QTypes.PAGE"
          ref="content"
          v-model="value"
          @delPage="delPage"
          :totalPage="totalPage"
          @getNext="getNext"
          @getPrev="getPrev"
          :finalPage="finalPage"
          :firstPage="firstPage"
          :index="index"
        />
        <div class="name" v-if="value.type !== QTypes.PAGE">
          <component
            ref="content"
            :is="QComs[value.type]"
            v-model="value"
            :index="index"
            :isShowOperate="isShowOperate"
          ></component>

          <div class="q-analysis" v-if="value.edit || value.analysis">
            <el-input
              v-if="!(value.type === QTypes.LINE)"
              type="textarea"
              autosize
              :disabled="!value.edit"
              placeholder="题目解析"
              resize="none"
              v-model="value.analysis"
            />
          </div>

          <div class="q-extension" v-if="value.edit && isShowOperate">
            <el-input
              v-if="!(value.type === QTypes.LINE)"
              type="textarea"
              autosize
              placeholder="扩展字段检索"
              resize="none"
              v-model="value.extension"
            />
          </div>
        </div>
      </div>
      <div class="q-operate" v-if="isShowOperate && value.edit">
        <div class="left">
          <div
            class="q-score"
            v-if="!(value.type === QTypes.LINE || value.type === QTypes.PAGE)"
          >
            分数：
            <el-input-number
              size="mini"
              v-model="value.score"
              :min="0"
              :max="Number.MAX_SAFE_INTEGER"
              :precision="0"
              :step="1"
            />
          </div>
        </div>
        <div class="right">
          <el-checkbox
            v-if="
              value.type !== 'line' &&
                value.type !== 'page' &&
                value.type !== 'remark'
            "
            v-model="value.required"
            label="是否必填"
          ></el-checkbox>
          <i
            v-if="value.type !== 'line' && value.type !== 'pagination'"
            class="elicon el-icon-document-copy"
            @click="copy"
            title="复制题"
          ></i>
          <i class="elicon el-icon-delete" @click.stop="remove" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import {types as QTypes, coms as QComs} from './contant'
import qText from './question/Text.vue'
import qDate from './question/Date.vue'
import qArea from './question/Area.vue'
import qRadio from './question/Radio.vue'
import qCheckbox from './question/CheckBox.vue'
import qMatrix from './question/Matrix.vue'
import qLine from './question/Line.vue'
import qRemark from './question/Remark.vue'
import qPage from './question/Page.vue'

export default {
  name: 'wrap',
  components: {
    qText,
    qDate,
    qArea,
    qRadio,
    qCheckbox,
    qMatrix,
    qLine,
    qRemark,
    qPage
  },
  data() {
    return {
      QComs: QComs,
      QTypes: QTypes,
      isShowOperate: false,
      isUpdate: false,
    }
  },
  watch: {
    'value': {
      deep: true,
      handler: function (newV, oldV) {
        // console.error(newV);
        this.value.isQuote = true
        // console.error(this.value)
        // sessionStorage.setItem("detail", JSON.stringify(newV));
      },
    },
  },
  props: {
    value: {
      type: Object,
      default() {
        return {}
      }
    },
    isPreview: Boolean,
    index: Number,
    detail: {
      type: Array,
      default: () => []
    },
    finalPage: {
      type: Boolean,
      default: false
    },
    firstPage: {
      type: Boolean,
      default: false
    },
    totalPage: [Number, String]
  },
  computed: {
    getIndex() {
      let i = 0
      for (let j = 0, len = this.detail.length; j < len; j++) {
        if (
          this.detail[j].type === this.QTypes.LINE ||
          this.detail[j].type === this.QTypes.REMARK ||
          this.detail[j].type === this.QTypes.PAGE
        ) {
          continue
        }
        if (this.detail[j] === this.value) {
          break
        }
        i++
      }
      return i + 1
    }
  },
  methods: {
    check() {
      return this.$refs.content.check()
    },
    questionClick() {
      this.isShowOperate = true
      this.$emit('click', this)
    },
    handleClose() {
      this.isShowOperate = false
    },
    copy() {
      this.$emit('copy', this.index)
    },
    sort() {
      this.$emit('sort')
    },
    remove() {
      this.$emit('remove', this.index)
    },
    delPage(pageId) {
      this.$emit('delPage', pageId)
    },
    getNext() {
      this.$emit('getNext', this.index)
    },
    getPrev() {
      this.$emit('getPrev', this.index)
    }
  },
  directives: {
    // // 点击元素外面时隐藏
    clickoutside: {
      bind: (el, binding, vnode) => {
        function documentHandler(e) {
          if (el.contains(e.target)) {
            return false
          }
          if (binding.expression) {
            binding.value(e)
          }
        }

        el._vueClickOutside_ = documentHandler
        document.addEventListener('click', documentHandler)
      },
      unbind: (el, binding) => {
        document.removeEventListener('click', el._vueClickOutside_)
        delete el._vueClickOutside_
      }
    }
  },
  mounted() {
    // console.log(this.value)
  }
}
</script>

<style lang="less" scoped>
.question-wrap {
  width: 100%;
  font-size: 12px;
  margin-top: 20px;
  position: relative;
  border-radius: 4px;
  box-shadow: 0px 0px 12px 0px rgba(213,197,231,0.5);

  &.click {
    border-color: #1E89E4;
  }

  .index {
    position: absolute;
    left: 15px;
    top: 40px;
    font-size: 16px;
    color: #666;

    &.isLine {
      display: none;
    }

    &.isPagination {
      display: none;
    }

    &.isRemark {
      display: none;
    }
  }

  .question-content {
    // width: calc(100% - 60px);
    width: 100%;
    position: relative;
    padding: 30px 40px;
    background-color: #fff;
    box-sizing: border-box;

    .q-edit {
      width: 100%;
      margin-left: 15px;

      .name {
        width: 100%;

        .q-analysis {
          width: calc(100% - 79px);
          margin-top: 20px;
        }

        .q-extension {
          width: calc(100% - 79px);
          margin-top: 20px;
        }
      }
    }

    &.triangle::before {
      content: "";
      display: block;
    }

    .q-operate {
      display: flex;
      line-height: 20px;
      align-items: center;
      justify-content: space-between;
      margin: 20px 0 -10px;

      .left {
        display: flex;
        flex-direction: row;
      }

      .right {
        display: flex;
        flex-direction: row;
        align-items: center;

        .elicon {
          margin-left: 20px;
          cursor: pointer;
          font-size: 21px;
          display: inline-block;
        }

        .icon {
          margin-left: 20px;
          cursor: pointer;

          i {
            font-size: 20px;

            &:hover {
              color: #eb9630;
            }
          }
        }

        /deep/ .el-checkbox__label {
          font-size: 14px;
        }
      }
    }
  }

  &.preview-pc {
    box-shadow: none;
    margin-bottom: 30px;
    border: none;

    &.page {
      margin: 0px;
    }

    .question-content {
      width: 100%;
      padding: 0;
      display: flex;
      align-items: flex-start;

      .index {
        position: relative;
        top: 0;
        left: 0;
        font-size: 16px;
        line-height: 22px;
      }

      .q-edit {
        margin-left: 15px;

        &.noIndex {
          margin-left: 0;
        }
      }
    }

    @media screen and (max-width: 768px) {
      .question-content {
        .index {
          position: absolute;
        }

        .q-edit {
          margin-left: 0px;
        }
      }
    }
  }
}
</style>
