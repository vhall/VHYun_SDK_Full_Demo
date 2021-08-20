<template>
  <div class="create-wrap-wrap">
    <div class="create-wrap">
      <div class="control-area">
        <div class="categroys control-often-use">
          <h5 class="category">常用</h5>
          <span @click="createPreset($event, `name`)">姓名</span>
          <span @click="createPreset($event, `sex`)">性别</span>
          <span @click="createDate">日期/时间</span>
          <span @click="createArea">城市</span>
        </div>
        <div class="categroys control-common-use">
          <h5 class="category">通用</h5>
          <span @click="createRadio">单选</span>
          <span @click="createCheckbox">多选</span>
          <span @click="createText">文本</span>
          <span @click="createRadioMatrix">单选表格</span>
          <span @click="createCheckboxMatrix">多选表格</span>
        </div>
        <div class="categroys remarks">
          <h5 class="category">备注</h5>
          <span @click="createPage">分页</span>
          <span @click="createLine">分割线</span>
          <span @click="createRemark">图文备注</span>
        </div>
      </div>
      <div class="question-content" ref="questionContents">
        <div class="base-info">
          <div class="title">
            <div class="title">
              <c-edit
                :maxLength="30"
                :isTitle="true"
                :isDescriptionNull="false"
                v-model="question.title"
              ></c-edit>
            </div>
            <c-edit
              type="textarea"
              :maxLength="500"
              :isSubTitle="true"
              :isDescriptionNull="false"
              v-model="question.description"
            />
            <c-edit
              style="marginTop:20px;"
              type="textarea"
              :maxLength="500"
              :isSubTitle="true"
              :isDescriptionNull="false"
              v-model="question.extension"
            />
          </div>
        </div>
        <div class="default-img" v-if="!this.question.detail.length">
          <img src="../../../assets/images/default-bgc.png" alt width="168"/>
          <div>
            <i class="iconfont icon-dianjitubiao"></i>
            <span>点击题型创建问卷</span>
          </div>
        </div>
        <div class="question-info">
          <question-wrap
            v-for="(item, index) in question.detail"
            :detail="question.detail"
            :key="`${index}${item}`"
            :value.sync="item"
            :index="index"
            :totalPage="totalPage"
            @remove="remove"
            @copy="copyQuestion"
            @delPage="delPage"
            :ref="`question${index}`"
          />
        </div>
        <div class="save" v-if="canSave">
          <!-- <p class="text">您已创建完成本次问卷！</p> -->
          <Button type="primary" @click="saveForm" :disabled="!canSave" v-if="isCreate">创建表单</Button>
          <Button type="primary" @click="saveForm" :disabled="!canSave" v-else>修改表单</Button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import {types as TYPE} from '../forms/contant'
import Button from '@/components/Button'
import questionWrap from '../forms/questionWrap.vue'
import cEdit from '../forms/c-edit.vue'
import {BLANK_DATA, PRESET_FROM} from '../forms/preset'
import {createFromCheck, clone, getPlainInfo, reBuildQu} from '../forms/sdk'

export default {
  name: 'FormCreate',
  props: {
    editId: [Number, String],
    editFormData: Object,
    submitCreate: Function,
  },
  components: {
    Button,
    cEdit,
    questionWrap,
  },
  data() {
    return {
      title: '',
      isSaving: false,
      page: 0,
      errorTip: '',
      drag: false, // 拖动状态
      question: clone(BLANK_DATA),
    }
  },
  created() {
  },
  mounted() {
    if (this.editFormData) {
      this.question = reBuildQu(this.editFormData)
    }
  },
  computed: {
    isCreate() {
      return !this.editId
    },
    canSave() {
      return this.question && this.question.detail && this.question.detail.length
    },
    totalPage() {
      let total = 0
      this.question.detail.forEach(el => {
        if (el.type === 'page') {
          total += 1
        }
      })
      return total
    }
  },
  methods: {
    scrollQuestionToBottom() {
      if (!this.$refs.questionContents) return
      const el = this.$refs.questionContents.lastElementChild
      if (el && el.scrollIntoView) return el.scrollIntoView({ behavior: 'smooth' })
    },
    // region 添加
    addQuestion: function (item) {
      if (!item) return
      item.edit = true
      this.question.detail.push(item)
      if (this.question.detail.length > this.question.max) this.$message.error('添加的题目过多，将无法保存')
      this.scrollQuestionToBottom()
    },
    // 常用
    createPreset(e, type) {
      const rs = PRESET_FROM[type]
      const category = rs && rs.type
      switch (category) {
        case 'text':
          this.addQuestion(getPlainInfo(rs))
          break
        case 'radio':
          this.addQuestion(getPlainInfo(rs))
          break
      }
    },
    createText(e) {
      this.addQuestion(getPlainInfo('text'))
    },
    createRadio(e) {
      this.addQuestion(getPlainInfo('radio'))
    },
    createDate() {
      this.addQuestion(getPlainInfo('date'))
    },
    createArea() {
      this.addQuestion(getPlainInfo('area'))
    },
    createCheckbox() {
      this.addQuestion(getPlainInfo('checkbox'))
    },
    createRadioMatrix() {
      this.addQuestion(getPlainInfo('matrix'))
    },
    createCheckboxMatrix() {
      this.addQuestion(getPlainInfo('matrix_checkbox'))
    },
    createLine() {
      this.addQuestion(getPlainInfo('line'))
    },
    createRemark() {
      this.addQuestion(getPlainInfo('remark'))
    },
    createPage() {
      const detailArr = this.question.detail
      if (detailArr.length === 0) {
        this.$message.error('请先添加题目')
        return
      }
      if (detailArr[detailArr.length - 1].type === TYPE.PAGE) {
        this.$message.error('不可连续添加分页')
        return
      }
      this.page++
      this.addQuestion(getPlainInfo('page'))
      this.handlePageId()
    },
    // 复制题目
    copyQuestion(index) {
      const detail = this.question.detail
      let arr = []
      arr.push(clone(detail[index]))
      this.question.detail = detail.concat(arr)
      this.handlePageId()
      this.$nextTick(function () {
        document.documentElement.scrollTop = document.body.scrollHeight
      })
    },
    // endregion 添加

    // region 编辑
    // 删除
    remove(id) {
      this.question.detail.splice(id, 1)
      this.handlePageId()
    },
    saveForm() {
      this.checkPage()
      const error = createFromCheck(this.question)
      if (error) return this.$message.error(error.message || error.msg || error)
      const question = Object.assign({}, this.question)
      question.detail = this.question.detail.map(item => {
        if (item && item.toObject) return item.toObject()
        return item
      })

      if (this.submitCreate) {
        this.submitCreate(question, this.editId).then(() => {
          this.$emit('submit')
          this.question = clone(BLANK_DATA)
          this.$message.success({message: this.editId ? `表单修改成功` : `表单创建成功`})
        }, (error) => {
          this.$message.error('创建失败：' + error.message)
        })
      } else {
        this.$emit('submit')
        this.question = clone(BLANK_DATA)
      }
    },
    // endregion 编辑

    // 校验分页
    checkPage() {
      const detail = this.question.detail
      const len = detail.length

      if (len < 2) {
        return
      }

      for (let i = 0; i < len - 1; i++) {
        let item = detail[i]
        let nextItem = detail[i + 1]
        if (item.type === TYPE.PAGE && nextItem.type === TYPE.PAGE) {
          this.$message.error('不可连续添加分页')
          break
        }
      }
    },
    delPage(pageId) {
      // 过滤出删除后的数组
      this.question.detail = this.question.detail.filter(info => info.pageId !== pageId)
      this.handlePageId()
    },

    handlePageId() {
      // 给所有题添加pageId，用于区分第几页
      const detail = this.question.detail
      let tempPage = 0
      for (let i = 0; i < detail.length; i++) {
        let info = detail[i]
        this.$set(info, 'pageId', tempPage)
        info.pageId = tempPage
        if (info.type === 'page') {
          tempPage += 1
        }
      }
    },
  },
}
</script>

<style lang="less" scoped>
.create-wrap-wrap {
  padding-bottom: 50px;
  background-color: #f2f2f2;
  height: 100%;
}
.create-wrap {
  //margin: 0 20px;
  display: flex;
  width: 980px;
  height: 100%;

  .control-area {
    //text-align: center;
    //position: fixed;
    // width: 100px;
    padding: 0 10px;
    padding-top: 30px;
    width: 126px;
    flex-shrink: 0;
    //box-shadow: 0 0 12px 0 rgba(213, 197, 231, 0.5);
    //border-radius: 4px;
    //background: #fff;
    height: 640px;
    margin-bottom: 10px;
    overflow-y: scroll;
    /* 定义滚动条样式 */

    &::-webkit-scrollbar {
      width: 0px;
      height: 0px;
      background-color: rgba(0, 0, 0, 0);
    }

    /*定义滚动条轨道 内阴影+圆角*/

    &::-webkit-scrollbar-track {
      box-shadow: inset 0 0 0 rgba(240, 240, 240, 0.5);
      border-radius: 10px;
      background-color: rgba(240, 240, 240, 0.5);
    }

    /*定义滑块 内阴影+圆角*/

    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      box-shadow: inset 0 0 0 rgba(240, 240, 240, 0.5);
      background-color: rgba(240, 240, 240, 0.5);
    }

    .categroys {
      padding: 12px 0;
      //border-bottom: 1px dashed #1E89E4;
      overflow: hidden;

      .category {
        margin: 0 0 10px;
        color: #999;
        line-height: 22px;
        text-align: left;
        font-size: 14px;
        font-weight: 400;
      }

      &.remarks {
        border-bottom: none;
      }

      span {
        display: block;
        width: 100px;
        //height: 32px;
        margin-bottom: 20px;
        margin-left: 4px;
        color: #333;
        //line-height: 32px;
        font-size: 14px;
        //border: 1px solid #1E89E4;
        //box-sizing: border-box;
        //border-radius: 4px;
        cursor: pointer;

        &:last-child {
          margin-bottom: 0;
        }

        &:hover {
          color: #1E89E4;
          //color: #EB9630;
          //border-color: #fff;
          //box-shadow: 0 0 12px 0 rgba(213, 197, 231, 0.5);
          //border-radius: 4px 0 4px 4px;
        }
      }
    }
  }

  .default-img {
    width: 100%;
    padding: 30px 0;
    margin: 20px 0;
    font-size: 16px;
    border: 2px dashed #e2e2e2;
    border-radius: 4px;
    text-align: center;

    img {
      margin: 18px 0 30px;
    }

    i {
      font-size: 20px;
    }

    span {
      margin-left: 5px;
    }
  }

  .question-content {
    max-height: 760px;
    overflow-y: auto;
    padding-top: 30px;
    //padding-bottom: 18px;
    padding-right: 20px;
    //width: calc(100% - 120px);
    flex-grow: 1;

    .base-info {
      padding: 15px 30px;
      text-align: left;
      box-shadow: 0 0 12px 0 rgba(213, 197, 231, 0.5);
      border-radius: 4px;
      background: #fff;

      .title {
        margin-bottom: 15px;
      }
    }
  }

  .save {
    padding: 30px 56px;
    display: flex;
    justify-items: center;
    align-items: center;
    justify-content: center;

    .text {
      font-size: 16px;
      color: #555;
      line-height: 22px;
      margin: 0;
    }

    .el-button {
      width: 140px;
      margin-top: 50px;
      background: #1E89E4;
      color: #fff;
      border-radius: 100px;
      font-size: 16px;
      font-weight: 400;
    }
  }
}
</style>
