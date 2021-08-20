<template>
  <div class="q-matrix-wrap" :class="{ 'preview-pc': !value.edit }">
    <div class="q-title">
      <div
        v-if="!value.edit"
        class="title"
        :class="{ must: !value.edit && value.required }"
      >
        {{ value.title }}
      </div>
      <img v-if="!value.edit && value.imgUrl" :src="value.imgUrl" alt/>
      <c-edit
        v-if="value.edit"
        v-model="value.title"
        :canUpload="true"
        :imgUrl="value.imgUrl"
        @upload="upload"
        @uploadFail="uploadFail"
      ></c-edit>
    </div>
    <!-- <div class="q-matrix clearfix"> -->
    <div class="q-table" ref="table">
      <div class="row-title">
        <div class="blank row-content"></div>
        <div
          class="row-content"
          v-for="(item, index) in value.row"
          :key="index"
        >
          <div class="item-row">
            <c-edit
              v-if="value.edit"
              v-model="item.value"
              :maxLength="5"
              :ismatrix="true"
            ></c-edit>
            <div v-if="!value.edit">{{ item.value }}</div>
            <div
              class="option"
              v-if="value.edit && isOneTr"
              @mouseenter="mouseenter(index, 'row')"
              @mouseleave="mouseleave(index, 'row')"
            >
              <i class="elicon el-icon-s-operation"></i>
              <div class="option-list" v-if="item.isenter">
                <div
                  class="item"
                  v-if="index !== 0"
                  @click="moveReduce(index, 'row')"
                >
                  向上移动
                </div>
                <div
                  class="item"
                  v-if="index + 1 !== value.row.length"
                  @click="moveIncrease(index, 'row')"
                >
                  向下移动
                </div>
                <div class="item" @click="del(index, 'row')">删除</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="main-table" ref="main-table">
        <div class="table">
          <div class="col">
            <div class="tr" v-for="(item, index) in value.column" :key="index">
              <c-edit
                v-if="value.edit"
                v-model="item.value"
                :maxLength="5"
                :ismatrix="true"
              ></c-edit>
              <div v-if="!value.edit">{{ item.value }}</div>
              <div
                class="option"
                v-if="value.edit && isOneTd"
                @mouseenter="mouseenter(index, 'column')"
                @mouseleave="mouseleave(index, 'column')"
              >
                <i class="elicon el-icon-s-operation"></i>
                <div class="option-list" v-if="item.isenter">
                  <div
                    class="item"
                    v-if="index !== 0"
                    @click="moveReduce(index, 'column')"
                  >
                    向左移动
                  </div>
                  <div
                    class="item"
                    v-if="index + 1 !== value.column.length"
                    @click="moveIncrease(index, 'column')"
                  >
                    向右移动
                  </div>
                  <div class="item" @click="del(index, 'column')">删除</div>
                </div>
              </div>
            </div>
          </div>
          <div
            class="table-data"
            v-for="(itemRow, indexRow) in value.row"
            :key="indexRow"
          >
            <div
              class="col-item"
              v-for="(itemCol, indexCol) in value.column"
              :key="indexCol"
            >
              <el-radio
                v-if="value.format === 'radio'"
                v-model="itemRow.selected"
                :label="`${indexRow + 1}-${indexCol + 1}`"
                @change="changeCorrect('radio')"
              ></el-radio>
              <el-checkbox
                v-if="value.format === 'checkbox'"
                v-model="itemRow.selected"
                :label="`${indexRow + 1}-${indexCol + 1}`"
                @change="changeCorrect('checkbox')"
              ></el-checkbox>
            </div>
          </div>
        </div>
        <div class="addCol" v-if="value.edit">
          <span @click="addCol(value.column)">
            <i class="elicon el-icon-plus"></i>添加列
          </span>
        </div>
      </div>
    </div>
    <div class="addRow" v-if="value.edit">
      <span @click="addRow(value.row)">
        <i class="elicon el-icon-plus"></i>添加行
      </span>
    </div>

    <!-- </div> -->
    <div class="error" v-if="errorTip">{{ errorTip }}</div>
  </div>
</template>

<script>
import cEdit from '../c-edit.vue'
// import { mutations } from "../../store.js";
export default {
  props: {
    index: Number,
    value: Object,
  },
  data() {
    return {
      isOneTr: true,
      isOneTd: true,
      errorTip: ''
    }
  },
  computed: {
  },
  components: {
    cEdit
  },
  mounted() {
    if (this.value.edit) {
      // 行的index
      let rowIndex = []
      let columnIndex = []
      let correctAnswers = this.value.answer
      if (correctAnswers) {
        correctAnswers.forEach(el => {
          let elArr = el.split('-')
          rowIndex.push(elArr[0])
          columnIndex.push(elArr[1])
        })
        rowIndex.forEach((el, index) => {
          if (this.value.format === 'radio') {
            this.value.row[el - 1].selected = el + '-' + columnIndex[index]
          } else {
            this.value.row[el - 1].selected.push(el + '-' + columnIndex[index])
          }
        })
      }
    }
  },
  methods: {
    upload(src) {
      this.errorTip = ''
      this.value.imgUrl = src
      this.$emit('change', this.value)
    },
    uploadFail(msg) {
      this.errorTip = msg
    },
    addRow(e) {
      const obj = {
        value: `行${e.length + 1}`,
        isenter: false,
        selected: this.value.format === 'radio' ? '' : []
      }
      this.value.row.push(obj)
      this.$emit('change', this.value)
    },
    addCol(e) {
      const obj = {
        value: `列${e.length + 1}`,
        isenter: false
      }
      this.value.column.push(obj)
      this.$emit('change', this.value)
    },
    check() {
      if (
        this.value.required &&
        !this.value.edit &&
        !this.value.replys.length
      ) {
        this.errorTip = '该题必填'
        return
      } else {
        this.errorTip = ''
        return true
      }
    },
    del(selectIndex, type) {
      const format = this.value.format
      if (type === 'row') {
        this.delRowAnswer(format, this.value.row, selectIndex)
      } else {
        this.delColumnAnswer(format, this.value.row, selectIndex)
      }
      this.changeCorrect(format)
      this.value[type].splice(selectIndex, 1)
      this.$emit('change', this.value)
      this.mouseleave(selectIndex, type)
    },
    moveIncrease(index, type) {
      const value = this.value
      const next = value[type][index + 1]
      value[type][index + 1] = value[type][index]
      value[type][index] = next
      value[type][index].isenter = false
      this.mouseleave(index, type)
      // mutations.increase(index, type, this.index)
    },
    moveReduce(index, type) {
      const value = this.value
      const prev = value[type][index - 1]
      value[type][index - 1] = value[type][index]
      value[type][index] = prev
      // console.log(value[type][index - 1])
      // console.log(value[type][index])
      this.mouseleave(index, type)
      // mutations.reduce(index, type, this.index)
    },
    mouseenter(index, type) {
      this.value[type].forEach(el => {
        el.isenter = false
      })
      this.value[type][index].isenter = true
      // mutations.martixMouseenter(index, type, this.index)
    },
    mouseleave(index, type) {
      this._mouseleave(index, type)
      // setTimeout(() => {
      // }, 200)
    },
    _mouseleave(index, type) {
      this.value[type].forEach(el => {
        el.isenter = false
      })
      // mutations.martixMouseleave(index, type, this.index)
    },
    changeCorrect(format) {
      let answerArr = []
      this.value.row.forEach(el => {
        if (format === 'radio') {
          el.selected && answerArr.push(el.selected)
        } else {
          el.selected.length && answerArr.push(...el.selected)
        }
      })
      if (this.value.edit) {
        this.value.answer = [...answerArr]
        this.$emit('change', this.value)
      } else {
        this.value.replys = [...answerArr]
        this.$emit('change', this.value)
      }
      this.$forceUpdate()
    },
    delRowAnswer(fmt, data, selectIndex) {
      data.forEach((el, rowIndex) => {
        if (fmt === 'radio' && el.selected) {
          this.delRadioRow(rowIndex, selectIndex, el)
        } else if (fmt === 'checkbox' && el.selected.length) {
          this.delCheckboxRow(rowIndex, selectIndex, el)
        }
      })
    },
    delRadioRow(rowIndex, selectIndex, el) {
      let selectedArr = el.selected.split('-')
      if (rowIndex > selectIndex) {
        el.selected = `${selectedArr[0] - 1}-${selectedArr[1]}`
      } else if (rowIndex === selectIndex) {
        el.selected = ''
      }
    },
    delCheckboxRow(rowIndex, selectIndex, el) {
      let arr = []
      el.selected.forEach(item => {
        let selectedArr = item.split('-')
        if (rowIndex > selectIndex) {
          arr.push(`${selectedArr[0] - 1}-${selectedArr[1]}`)
        } else if (rowIndex !== selectIndex) {
          arr.push(item)
        }
      })
      el.selected = [...arr]
    },
    delRadioColumn(selectIndex, el) {
      let selectedArr = el.selected.split('-')
      if (selectedArr[1] - 1 > selectIndex) {
        el.selected = `${selectedArr[0]}-${selectedArr[1] - 1}`
      } else if (selectedArr[1] - 1 === selectIndex) {
        el.selected = ''
      }
    },
    delCheckboxColumn(selectIndex, el) {
      let arr = []
      el.selected.forEach((item, itemIndex) => {
        let selectedArr = item.split('-')
        if (selectedArr[1] - 1 > selectIndex) {
          arr.push(`${selectedArr[0]}-${selectedArr[1] - 1}`)
        } else if (selectedArr[1] - 1 !== selectIndex) {
          arr.push(item)
        }
      })
      el.selected = [...arr]
    },
    delColumnAnswer(fmt, data, selectIndex) {
      data.forEach((el, rowIndex) => {
        if (fmt === 'radio' && el.selected) {
          this.delRadioColumn(selectIndex, el)
        } else if (fmt === 'checkbox' && el.selected.length) {
          this.delCheckboxColumn(selectIndex, el)
        }
      })
    }
  },
  watch: {
    'value.column.length'(val) {
      this.isOneTd = val === 1 ? false : true
    },
    'value.row.length'(val) {
      this.isOneTr = val === 1 ? false : true
    },
    'value.format'(val) {
      // console.log(this.value);
    }
  }
}
</script>

<style lang="less" scoped>

.q-matrix-wrap {
  width: 100%;
  position: relative;
}

.q-title {
  margin-bottom: 10px;
}

// .q-matrix {
// width: 100%;
// position: relative;
// margin-top: 10px;

.q-table {
  width: 100%;
  display: flex;
  font-size: 14px;
  overflow-y: visible;

  .row-title {
    border-bottom: 1px solid #ddd;
    border-left: 1px solid #ddd;

    .row-content {
      position: relative;
      width: 122px;
      height: 38px;
      line-height: 38px;
      border-right: 1px solid #ddd;
      border-top: 1px solid #ddd;
    }
  }

  .option {
    position: absolute;
    right: 0px;
    top: 0;

    i {
      cursor: pointer;

      &:hover {
        color: #eb9630;
      }
    }

    .option-list {
      position: absolute;
      top: 32px;
      right: 0;
      z-index: 2000;
      background: #fff;
      box-shadow: 2px 2px 4px 1px rgb(97, 97, 97, 0.2);

      .item {
        width: 100px;
        line-height: 28px;
        color: #555;
        font-size: 12px;
        cursor: pointer;

        &:hover {
          background: #eaf6ff;
          color: #1e89e4;
        }
      }
    }
  }

  .main-table {
    max-width: calc(100% - 203px);
    overflow-y: visible;
    position: absolute;
    left: 123px;
  }

  .table {
    max-width: 100%;
    overflow-x: auto;
    text-align: center;

    .col {
      display: flex;
    }

    .tr {
      position: relative;
      flex-shrink: 0;
      height: 38px;
      line-height: 38px;
      width: 122px;
      border-right: 1px solid #ddd;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      text-align: center !important;
    }

    .table-data {
      display: flex;

      .col-item {
        flex-shrink: 0;
        width: 122px;
        height: 38px;
        line-height: 38px;
        border-right: 1px solid #ddd;
        border-bottom: 1px solid #ddd;
      }
    }

    /deep/ .el-checkbox__label,
    /deep/ .el-radio__label {
      display: none;
    }

    /deep/ .el-radio__inner {
      border-color: #1E89E4;
    }
  }
}

// }

.error {
  margin-top: 10px;
  font-size: 14px;
  color: red;
  line-height: 20px;
  text-align: left;
}

.addRow {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  line-height: 20px;
  font-size: 14px;

  span {
    cursor: pointer;

    &:hover {
      color: #eb9630;
    }
  }

  i {
    font-size: 20px;
    margin-right: 5px;
  }
}

.addCol {
  display: inline-flex;
  line-height: 38px;
  align-items: center;
  width: 100px;
  position: absolute;
  top: 0;
  right: -123px;
  font-size: 14px;

  span {
    cursor: pointer;

    &:hover {
      color: #eb9630;
    }

    i {
      font-size: 20px;
      margin-right: 5px;
    }
  }
}

.preview-pc {
  .q-title {
    text-align: left;
    margin-bottom: 18px;

    .must::after {
      content: "*";
      color: red;
    }
  }

  .title {
    line-height: 22px;
    font-size: 16px;
  }

  img {
    margin-top: 10px;
  }

  .q-matrix {
    .q-table {
      .main-table {
        max-width: calc(100% - 123px);
      }
    }
  }

  @media screen and (max-width: 768px) {
    .q-title {
      margin: 0 0 15px 15px;
    }

    .q-table {
      .row-title {
        .row-content {
          width: 90px;
        }
      }

      .main-table {
        max-width: calc(100% - 90px);
        position: absolute;
        left: 90px;

        .tr {
          width: 90px;
        }

        .table-data {
          .col-item {
            width: 90px;
          }
        }
      }
    }
  }
}
</style>
