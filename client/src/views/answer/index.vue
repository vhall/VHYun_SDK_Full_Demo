<template>
  <div class="answer">
    <div class="pc-preview-wrap" v-if="type !== 'h5'">
      <div class="pc-preview">
        <div class="error">{{ errorText }}</div>
        <div class="base-info" v-show="!isSave && !errorText">
          <div class="title">{{ questionData.title }}</div>
          <div class="sub-title">{{ questionData.description }}</div>
        </div>
        <div class="line" v-show="!isSave && !errorText"></div>
        <div class="q-list" v-show="!isSave && !errorText">
          <c-question
            v-for="(item, index) in questionData.detail"
            @getNext="getNext"
            @getPrev="getPrev"
            :data-aindex="item.aIndex"
            :detail="questionData.detail"
            :key="item.aIndex"
            :value.sync="item"
            :index="index"
            :finalPage="nextPageBtn"
            :firstPage="prevPageBtn"
            :ref="`q${item.aIndex}`"
          ></c-question>
          <div
            class="option-btn"
            v-if="noPageLabel || isSubmit"
            :class="{ noPage: totalPage === 0 || noPageLabel }"
          >
            <el-button @click="getPrev" v-if="noPageLabel" class="prevBtn"
            >上一页
            </el-button
            >
            <el-button
              type="primary"
              v-if="isSubmit && hasRes && type !== 'preview' && !isSaveAnswer"
              @click="save"
              class="save"
              :class="{ left: totalPage === 0 && !noPageLabel }"
            >提交
            </el-button>
          </div>
        </div>
        <div class="save-succ" v-show="isSave && !errorText">
          <img src="../../assets/images/pc-submit.png" alt width="191" height="203"/>
          <p>您已完成本次问卷，感谢您的帮助与支持～</p>
        </div>
      </div>
    </div>
    <div class="preview-h5" v-if="type === 'h5'">
      <img src="../../assets/images/h5-bcg.png" alt/>
      <div class="error">{{ errorText }}</div>

      <div class="content" v-show="!isSave && !errorText">
        <div class="title">{{ questionData.title }}</div>
        <div class="sub-title">{{ questionData.description }}</div>
        <c-question
          v-for="(item, index) in questionData.detail"
          :detail="questionData.detail"
          :key="item.aIndex"
          :value.sync="item"
          :index="index"
          @getNext="getNext"
          @getPrev="getPrev"
          :finalPage="nextPageBtn"
          :firstPage="prevPageBtn"
          :ref="`q${item.aIndex}`"
        ></c-question>
        <div
          class="option-btn"
          v-if="noPageLabel || isSubmit"
          :class="{'noPage': totalPage === 0 || noPageLabel, 'left': totalPage !== 0&& !noPageLabel}"
        >
          <el-button @click="getPrev" v-if="noPageLabel" class="prevBtn">上一页</el-button>
          <el-button
            type="primary"
            v-if="isSubmit&&hasRes&&!isSaveAnswer"
            @click="save"
            class="save"
            :class="{'left': !noPageLabel}"
          >提交
          </el-button>
        </div>
      </div>

      <div class="save-succ" v-show="isSave && !errorText">
        <img src="../../assets/images/h5-submit.png" alt/>
        <p>您已完成本次问卷，感谢您的帮助与支持～</p>
      </div>
    </div>
  </div>
</template>

<script>
import querystring from 'querystring'
import questionWrap from '../shard/forms/questionWrap'
import {inavApi} from '@/common/api'

export default {
  name: 'Home',
  components: {'c-question': questionWrap},
  computed: {
    errorText() {
      if (this.error) return this.error
      const check = this.roomId && this.formId && this.qs.id
      if (!check) return '参数错误'
      if (typeof VhallForm === 'undefined') return '表单SDK加载失败'
      return ''
    }
  },
  data: () => {
    const qs = querystring.parse((location.search || '').slice(1))
    const roomId = qs.roomId
    const type = typeof isMobile === 'boolean' && isMobile === true ? 'h5' : qs.type
    const id = qs.id
    const formId = qs.formId
    const appId = window.appId || qs.appId
    const accountId = window.accountId || qs.accountId
    const sdkToken = window.sdkToken || qs.sdkToken
    const isSave = false
    const isSaveAnswer = typeof answerData !== 'undefined' && answerData.answer

    return {
      roomId,
      formId,
      type,
      id,
      qs,
      error: typeof error === 'string' ? error : '',
      appId,
      accountId,
      sdkToken,

      questionData: {},
      pageData: {},
      page: 0, // 当前在第几页
      detail: [],
      nextPageBtn: true, // 是否是最后一页
      prevPageBtn: true, // 是否是第一页
      noPageLabel: false, // 当最后一道题不是分页时，显示上一页
      isSubmit: true,
      result: false,
      curData: [],
      totalPage: 0,
      keys: [],
      defaultInfo: {},
      isLoading: false,
      isSave: isSave,
      isSaveAnswer: isSaveAnswer,
      hasRes: false,
    }
  },
  async created() {
    const formOption = {
      appId: this.appId,
      accountId: this.accountId,
      token: this.sdkToken,
    }

    if (typeof formData !== 'undefined' && formData.detail) {
      this.parseAnswer(formData)
      this.previewInit(this.pageData)
      if (this.qs.token) this.hasRes = true
    }

    if (!formOption.token) {
      // this.error = '您必须先登录才能答题'
      return
    }

    if (typeof VhallForm === 'undefined') return
    try {
      const form = await new Promise((r, j) => VhallForm.createInstance(formOption, res => r(res.interface), j))
      window.form = form
    } catch (e) {
      this.error = '表单sdk初始化失败'
      return
    }

    if (this.detail.length === 0) {
      try {
        await this.loadAnswer()
        this.hasRes = true
      } catch (e) {
        this.error = '获取表单失败'
      }
    }
  },
  mounted() {
    window.token = this.qs.token
  },
  methods: {
    async loadAnswer() {
      const rs = await new Promise((r, j) => form.getForm({
        id: this.formId,
        showAnalysis: 'false',
        showAnswer: 'false'
      }, r, j))
      if (!(rs.data && rs.data.detail && Array.isArray(data.detail))) return
      this.parseAnswer(rs)
      this.previewInit(this.pageData)
    },
    parseAnswer(data) {
      if (data.detail.length === 0) return
      if (typeof answerData !== 'undefined' && answerData.questions) {
        for (const item of data.detail) {
          item.edit = false
          const answerObj = answerData.questions[item.id] || ''
          const answer = answerObj && answerObj.answer
          if (!answer) continue
          switch (item.type) {
            case 'matrix':
              item.replys = answer.split(',')
              if (!Array.isArray(item.row)) continue
              if (item.format === 'radio') {
                for (const reply of item.replys) {
                  const [row, col] = reply.split('-')
                  if (row && col) item.row[row - 1].selected = reply
                }
              } else {
                for (const row of item.row) row.selected = []
                for (const reply of item.replys) {
                  const [row, col] = reply.split('-')
                  if (row && col) item.row[row - 1].selected.push(reply)
                }
              }
              break
            case 'checkbox':
              item.replys = answerObj.answer.split(',')

              // 自定义填写选项
              if (answerObj.custom_key) {
                const origin = item.items.find(i => answerObj.custom_key === i.key)
                if (origin) origin.custom_val = answerObj.custom_val
              }
              break
            case 'radio':
              item.replys = answerObj.custom_key || answerObj.answer
              // 自定义填写选项
              if (answerObj.custom_key) {
                const origin = item.items.find(i => answerObj.custom_key === i.key)
                if (origin) origin.custom_val = answerObj.custom_val
              }
              break
            case 'area':
              item.replys = answer.split(',')
              if (item.replys.length === 1) item.replys = answer.split('|')
              break
            case 'scantron':
            case 'judge':
            case 'remark':
            case 'page':
            case 'line':
            case 'date':
            case 'select':
            case 'text':
              item.replys = answer
          }
        }
      }
      this.detail = data.detail

      let i = 1
      this.detail.forEach((el, index) => {
        // delete el.edit
        delete el.analysis
        if (
          el.type !== 'page' &&
          el.type !== 'remark' &&
          el.type !== 'line'
        ) {
          el.idx = i++
        }
        el.aIndex = index
      })
      this.handlerData()
      this.curData = this.detail.filter(info => info.pageId === 0)
      this.handerBtn()
      this.defaultInfo = {
        app_id: data.app_id,
        created_at: data.created_at,
        description: data.description,
        finishTime: data.finishTime,
        id: data.id,
        imgUrl: data.imgUrl,
        publish: data.publish,
        start_time: data.start_time,
        third_party_user_id: data.third_party_user_id,
        title: data.title,
        updated_at: data.updated_at
      }
      this.pageData = Object.assign({}, this.defaultInfo, {detail: this.curData})
      this.previewInit(this.pageData)
    },
    previewInit(data) {
      this.questionData = data
      this.questionData.detail.forEach(el => {
        if (el.edit) el.edit = false
        if (el.format === 'checkbox') {
          el.row.forEach(item => {
            if (!el.edit && !el.replys.length) {
              // console.log('答题')
              item.selected = []
            }
          })
        }
      })
    },
    async save() {
      this.check()
      if (!this.result) return
      let saveId

      try {
        inavApi.roomId = this.roomId
        const client = 'pc_browser'
        const detail = []
        for (const item of this.detail) {
          let replys = Array.isArray(item.replys) ? item.replys.join(',') : item.replys || ''
          if (item.type === 'area') {
            if (Array.isArray(item.replys)) replys = item.replys.join('|')
          }
          else if (item.type === 'radio') {
            const replyOrigin = item.items.find(i => i.key === item.replys)
            // 自定义选项填写
            if (replyOrigin && replyOrigin.custom_opt === 1 && replyOrigin.custom_val) replys = item.replys + '|' +replyOrigin.custom_val + '|'
          }
          else if (item.type === 'checkbox') {
            const $replys = []
            for (const reply of item.replys) {
              const replyOrigin = item.items.find(i => i.key === reply)
              // 自定义选项填写
              if (replyOrigin && replyOrigin.custom_opt === 1 && replyOrigin.custom_val) $replys.push(reply + '|' +replyOrigin.custom_val  + '|')
              else $replys.push(reply)
            }
            replys = $replys.join(',')
          }
          const r0 = { id: item.id, replys }
          detail.push(r0)
        }

        const rs0 = await inavApi.answerForm(this.qs.id, this.qs.formId, client, detail)
        // const rs = await new Promise((r, j) => form.createAnswer({id: this.formId, answer: this.detail}, r, j))
        saveId = rs0.id
      } catch (e) {
        this.$message ? this.$message.error(e.message) : alert(e.message)
        return
      }
      this.isSave = true

      // 填写完成回调
      if (typeof saveCallback === 'function') {
        saveCallback({type: 'answerSave', data: {id: saveId || 0}})
      } else if (typeof postMessage === 'function') {
        postMessage({type: 'answerSave', data: JSON.stringify({id: saveId || 0})})
      }

      if (this.type !== 'h5') {
        this.$message && this.$message.success({
          showClose: true,
          message: `填写成功`,
        })
      }
    },
    check() {
      this.keys = []
      this.result = true
      let data = {}
      this.keys = Object.keys(this.$refs)
      const size = this.keys.length
      let curRefs = []
      for (let key in this.$refs) {
        if (this.$refs[`${key}`].length) {
          curRefs.push(this.$refs[`${key}`])
        }
      }
      for (let i = 0, len = curRefs.length; i < len; i++) {
        let _data = curRefs[i][0].check()
        if (!_data) {
          this.result = false
          break
        }
      }
    },
    getNext() {
      this.check()
      if (this.result) {
        this.page++
        this.curData = this.detail.filter(info => info.pageId === this.page)
        this.pageData = Object.assign({}, this.defaultInfo, {
          detail: this.curData
        })
        this.previewInit(this.pageData)
      } else {
        this.$message.error('您有未填写完成的选项')
      }
    },
    getPrev() {
      this.check()
      if (this.result) {
        this.page--
        this.curData = this.detail.filter(info => info.pageId === this.page)
        this.pageData = Object.assign({}, this.defaultInfo, {
          detail: this.curData
        })
        this.previewInit(this.pageData)
      }
    },
    handlerData() {
      let tempPage = 0
      for (let i = 0; i < this.detail.length; i++) {
        let info = this.detail[i]
        info.pageId = tempPage
        if (info.type === 'page') {
          tempPage += 1
        }
      }
      this.totalPage = this.detail[this.detail.length - 1].pageId
    },
    handerBtn(cur) {
      // console.log(this.page);
      if (this.totalPage === 0) {
        // console.log("只有一页");
        this.prevPageBtn = false
        this.nextPageBtn = false
        this.noPageLabel = false
        this.isSubmit = true
      } else {
        if (this.page === 0) {
          // console.log("2页及以上，第一页");
          this.prevPageBtn = false
          this.nextPageBtn = true
          this.noPageLabel = false
          this.isSubmit = false
        } else if (this.page > 0 && this.page < this.totalPage) {
          // console.log("2页及以上，大于第一页");
          this.prevPageBtn = true
          this.nextPageBtn = true
          this.noPageLabel = false
          this.isSubmit = false
        } else if ((this.page = this.totalPage)) {
          // console.log("最后一页");
          if (this.detail[this.detail.length - 1].type === 'page') {
            // 最后一页是分页
            this.nextPageBtn = false
            this.prevPageBtn = true
            this.noPageLabel = false
            this.isSubmit = true
          } else {
            this.nextPageBtn = false

            this.noPageLabel = true
            this.isSubmit = true
          }
        }
      }
    },
  },
  watch: {
    page(val) {
      this.handerBtn()
    },
    detail: {
      deep: true,
      handler: function (newV, oldV) {
        if (!newV) return
        sessionStorage.setItem('answer-detail-' + this.qs.id, JSON.stringify(newV))
      }
    }
  }
}
</script>

<style lang="less" scoped>
.login {
  width: 100%;
  height: 100%;
  background: #f4f8fe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
}

.pc-preview-wrap {
  position: relative;
  width: 100%;
  background: url("../../assets/images/pc-bcg.png") no-repeat;
  background-size: 100% 286px;
  overflow: hidden;
}

.pc-preview {
  position: relative;
  min-width: 760px;
  padding: 50px 80px 80px;
  margin: 0 auto;
  margin-top: 120px;
  background-color: #fff;
  box-shadow: 0px 0px 12px 0px rgba(213, 197, 231, 0.5);
  border-radius: 5px;

  .error {
    font-size: 24px;
    text-align: center;
    margin: 20px 0;
  }

  .base-info {
    .title {
      font-size: 20px;
      color: #333;
      line-height: 28px;
    }

    .sub-title {
      margin-top: 15px;
      font-size: 16px;
      line-height: 22px;
    }
  }

  .line {
    width: 100%;
    height: 4px;
    margin-top: 30px;
    background: #1e89e4;
    border-radius: 2px;
  }

  .q-list {
    margin-top: 40px;
  }

  .option-btn {
    display: flex;
    justify-content: flex-start;

    &.noPage {
      height: 40px;
      margin-top: 30px;
    }

    /deep/ .el-button {
      position: absolute;
      bottom: 80px;
      width: 140px;
      background: #1e89e4;
      border-radius: 100px;
      font-weight: 400;
      color: #fff;

      &.prevBtn {
        left: 80px;
      }

      &.save {
        left: 240px;

        &.left {
          left: 80px;
        }
      }

      &:nth-child(1) {
        margin-right: 25px;
      }
    }
  }

  .save-succ {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: calc(100vh - 460px);
    // min-height: 600px;
    margin: 50px 0;

    p {
      margin-top: 30px;
      font-size: 16px;
    }
  }
}

.preview-h5 {
  min-height: 100vh;
  width: 100%;
  background: #fff;

  img {
    width: 100%;
  }

  .error {
    font-size: 24px;
    text-align: center;
    margin: 20px 0;
  }

  .content {
    position: relative;
    padding: 36px 5% 40px;

    .title {
      font-size: 20px;
      line-height: 28px;
      color: #333;
      font-weight: 500;
    }

    .sub-title {
      margin-top: 8px;
      font-size: 14px;
      line-height: 20px;
      color: #555;
    }
  }

  .option-btn {
    width: 100%;
    height: 40px;
    display: flex;
    justify-content: center;

    &.noPage {
      height: 40px;
    }

    &.left {
      width: 44%;
      position: absolute;
      right: 0;
      // padding: 0 5%;
      bottom: 40px;
      margin-right: 5%;
      justify-content: flex-end;

      /deep/ .el-button {
        width: 100%;
      }
    }

    /deep/ .el-button {
      width: 49%;
      background: #1e89e4;
      border-radius: 4px;
      font-weight: 400;
      color: #fff;
    }
  }

  .save-succ {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    // margin: 50px 0;
    height: calc(100vh - 203px);

    img {
      width: 175px;
      margin-bottom: 20px;
    }
  }
}
</style>
