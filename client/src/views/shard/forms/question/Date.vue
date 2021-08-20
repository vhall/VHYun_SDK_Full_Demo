<template>
  <div class="q-date" :class="{'preview-pc': !value.edit}">
    <div class="q-title">
      <!-- <div class="title-wrap"> -->
      <div v-if="!value.edit" class="preview" :class="{'must': !value.edit&&value.required}">{{ value.title }}</div>
      <img v-if="!value.edit&&value.imgUrl" :src="value.imgUrl" alt="">
      <!-- </div> -->
      <c-edit v-if="value.edit" v-model="value.title" :maxLength="50" :canUpload="true" @upload="titleUpload"
              :imgUrl="value.imgUrl" @uploadFail="titleUploadFail"></c-edit>
    </div>
    <!-- 选择日期+时间 -->
    <div class="date-wrap" :class="{'preview': !value.edit}" v-if="timeDatepreviewShow">
      <el-date-picker :editable="false" @change="change" type="datetime" v-model="val" @focus="focus"
                      placeholder="请选择日期+时间" :disabled="datetimeDisabled">
      </el-date-picker>
      <span v-if="value.edit" class="flag"
            @click="switchType(0, formats[0].type, formats[0].format)">{{ formats[0].text }}</span>
    </div>
    <!-- 选择日期 -->
    <div class="date-wrap" :class="{'preview': !value.edit}" v-if="datePreviewShow">
      <!-- 编辑 -->
      <el-date-picker :editable="false" @change="change" v-model="val" @focus="focus" placeholder="选择日期"
                      :disabled="dateDisabled">
      </el-date-picker>
      <span v-if="value.edit" class="flag"
            @click="switchType(1, formats[1].type, formats[1].format)">{{ formats[1].text }}</span>
    </div>
    <!-- 选择时间 -->
    <div class="date-wrap" :class="{'preview': !value.edit}" v-if="timePreviewShow">
      <el-time-picker :editable="false" @change="change" v-model="val" @focus="focus" placeholder="选择时间"
                      :disabled="timeDisabled">
      </el-time-picker>
      <span v-if="value.edit" class="flag"
            @click="switchType(2, formats[2].type, formats[2].format)">{{ formats[2].text }}</span>
    </div>
    <div v-if="errorTip" class="error-msg">{{ errorTip }}
    </div>
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
  created() {
    if (!this.value.edit) {
      if (this.value.format) {
        this.formats.forEach((el, index) => {
          if (el._format === this.value.format) {
            this.curType = this.formats[index].format
          }
        })
      }
      if (this.value.replys) {
        if (this.value.format === VhallForm.DATE_FORMART.TIME) {
          let timesArr = this.value.replys.split(':')
          this.val = new Date('', '', '', timesArr[0], timesArr[1], timesArr[2])
        } else {
          // 时间选择器回显 兼容IE
          this.val = (!!window.ActiveXObject || 'ActiveXObject' in window) ? this.value.replys.replace(/-/g, '/') : this.value.replys
        }
      }
    }
    // 编辑时回显选中的日期
    if (this.value.edit && this.value.format) {
      this.formats.forEach((el, index) => {
        if (el._format === this.value.format) {
          this.curType = this.formats[index].format
          this.switchType(index, this.formats[index].type, this.formats[index].format)
        }
      })
    }

  },
  data() {
    return {
      val: '',
      formats: [{
        format: 'YYYY-mm-dd HH:ii:ss',
        type: 'timedate',
        _format: VhallForm.DATE_FORMART.DATE_TIME,
        disabled: false,
        text: '隐藏'
      },
        {
          format: 'YYYY-mm-dd',
          _format: VhallForm.DATE_FORMART.DATE,
          type: 'date',
          disabled: true,
          text: '开启'
        },
        {
          format: 'HH:ii:ss',
          _format: VhallForm.DATE_FORMART.TIME,
          type: 'time',
          disabled: true,
          text: '开启'
        }
      ],
      errorTip: '',
      curType: 'YYYY-mm-dd HH:ii:ss',
      curIndex: 0
    }
  },
  computed: {
    datetimeDisabled() {
      let res = this.value.edit ? this.formats[0].disabled : (this.value.format === this.formats[0]._format ? false : true)
      return res
    },
    dateDisabled() {
      let res = this.value.edit ? this.formats[1].disabled : (this.value.format === this.formats[1]._format ? false : true)
      return res
    },
    timeDisabled() {
      let res = this.value.edit ? this.formats[2].disabled : (this.value.format === this.formats[2]._format ? false : true)
      return res
    },
    timeDatepreviewShow() {
      return this.value.edit || this.value.format === VhallForm.DATE_FORMART.DATE_TIME
    },
    datePreviewShow() {
      return this.value.edit || this.value.format === VhallForm.DATE_FORMART.DATE
    },
    timePreviewShow() {
      return this.value.edit || this.value.format === VhallForm.DATE_FORMART.TIME
    }
  },
  methods: {
    format(fmt, date) {
      let ret
      let opt = {
        'Y+': date.getFullYear().toString(), // 年
        'm+': (date.getMonth() + 1).toString(), // 月
        'd+': date.getDate().toString(), // 日
        'H+': date.getHours().toString(), // 时
        'i+': date.getMinutes().toString(), // 分
        's+': date.getSeconds().toString() // 秒
      }
      for (let k in opt) {
        ret = new RegExp('(' + k + ')').exec(fmt)
        if (ret) {
          fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')))
        }

      }

      return fmt
    },
    titleUpload(src) {
      this.errorTip = ''
      this.value.imgUrl = src
      this.$emit('change', this.value)
    },
    titleUploadFail(msg) {
      this.errorTip = '标题' + msg
    },
    switchType(index, type, format) {
      this.formats.forEach(el => {
        if (el.type === type) {
          el.disabled = false
          el.text = '隐藏'
          this.curType = el.format
        } else {
          el.disabled = true
          el.text = '打开'
        }
      })
      this.curType = type
      this.curIndex = index
      // change
      this.value.format = this.formats[index]._format
      this.$emit('change', this.value)
    },
    change(val) {
      let reply = this.format(this.curType, val)

      // change
      this.value.replys = reply
      this.$emit('change', this.value)
    },
    focus() {
      this.errorTip = ''
    },
    check() {
      if (!this.value.edit && this.value.required && !this.value.replys) {
        this.errorTip = '该题不能为空'
        return
      } else {
        this.errorTip = ''
        return true
      }
    }
  }
}
</script>

<style scoped lang="less">
.q-date {
  width: 100%;

  /deep/ .el-date-editor {
    width: 100%;
    height: 38px;
  }

  /deep/ .el-input__inner {
    height: 38px;
    line-height: 38px;
  }

  .error-msg {
    color: #fc5659;
    margin-top: 10px;
    line-height: 20px;
    text-align: left;
    font-size: 14px;
  }

  .date-wrap {
    width: calc(100% - 80px);
    position: relative;
    margin-top: 10px;
    display: flex;

    &:nth-last-child(1) {
      margin-bottom: 0px;
    }

    &.preview {
      width: 100%;
    }

    .flag {
      cursor: pointer;
      line-height: 38px;
      position: absolute;
      right: -40px;

      &:hover {
        color: #EB9630;
      }
    }
  }

  &.preview-pc {
    .q-title {
      margin-bottom: 18px;
      font-size: 16px;

      .preview {
        line-height: 22px;
        text-align: left;

        &.must::after {
          content: '*';
          color: red;
        }
      }
    }

    @media screen and (max-width: 768px) {
      .q-title {
        margin: 0 0 15px 15px;
      }

      /deep/ .el-input__inner {
        border-color: #ccc;
      }
    }
  }
}
</style>
