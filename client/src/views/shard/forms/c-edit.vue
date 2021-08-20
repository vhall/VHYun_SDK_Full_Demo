<template>
  <div
    class="c-edit"
    :idx="idx"
    :class="{ 'matrix-wrap': ismatrix, 'preview-pc': isPreview }"
  >
    <div class="edit-wrap" @mouseenter="mouseenter" @mouseleave="mouseleave">
      <div
        class="edit-content"
        :class="{ ismatrix: ismatrix, isPreview: isPreview }"
      >
        <div
          v-show="!isQues && !localIsInput"
          class="show-text"
          :class="{ 'big-title': isTitle, 'sub-title': isSubTitle }"
          @click="switchType"
        >
          {{ tempValue }}
        </div>
        <input
          v-if="
            (type === 'text' && isQues) || (localIsInput && type === 'text')
          "
          type="text"
          ref="input"
          :placeholder="placeholder"
          :disabled="disabled"
          @focus="focusHandle"
          @blur="blurHandle"
          v-model="tempValue"
        />
        <textarea
          v-if="
            (type === 'textarea' && isQues) ||
              (localIsInput && type === 'textarea')
          "
          type="text"
          :placeholder="placeholder"
          :rows="rows"
          ref="input"
          @focus="focusHandle"
          @blur="blurHandle"
          v-model="tempValue"
          :isDescriptionNull="isDescriptionNull"
        ></textarea>
        <div
          ref="limit"
          class="limit"
          :class="{ area: type === 'textarea' }"
          v-if="
            showLength && maxLength && getLength > 0 && (isQues || localIsInput)
          "
        >
          <span class="length">{{ getLength }}</span
          >/
          <span>{{ maxLength }}</span>
        </div>
      </div>
      <div class="options" v-if="canOption">
        <label for="upload" v-if="canUpload">
          <i class="elicon el-icon-picture-outline"></i>
          <input
            type="file"
            id="upload"
            class="upload"
            @change="uploadFile($event)"
            accept="image/bmp, image/jpeg, image/png, image/jpg"
          />
        </label>
        <i
          v-if="canDel"
          class="elicon el-icon-close"
          @click="del"
        ></i>
      </div>
    </div>
    <div class="img-wrap" v-if="imgUrl">
      <img :src="imgUrl" alt />
      <i
        v-show="enterFlag"
        @click="delImg"
        class="elicon el-icon-close delImg"
      ></i>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    isDescriptionNull: Boolean,
    imgUrl: {
      // 为数据里面存的img url ，防止拖动题目时，src为空
      type: String,
      default: ""
    },
    idx: {
      // 当父组件循环时，这个为每个子组件的标识
      type: Number,
      default: 0
    },
    ismatrix: {
      // 处理多选表格样式
      type: Boolean,
      default: false
    },
    isPreview: {
      //是否是预览，input宽度为100%
      type: Boolean,
      default: false
    },
    canDel: {
      type: Boolean,
      default: false
    },
    isQues: {
      // 是否是只显示输入框的情况，问答题
      type: Boolean,
      default: false
    },
    isTitle: {
      // 是否为创建页面标题
      type: Boolean,
      default: false
    },
    isSubTitle: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: "text"
    },
    canUpload: {
      type: Boolean,
      default: false
    },
    placeholder: String,
    disabled: {
      type: Boolean,
      default: false
    },
    value: {
      // input的值
      type: String,
      default: ""
    },
    showLength: {
      type: Boolean,
      default: true
    },
    maxLength: {
      type: Number,
      default: 0
    },
    isChar: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      rows: 3,
      localIsInput: false,
      canOption: false,
      tempValue: "",
      oldValue: "",
      src: "",
      originValue: '',
      enterFlag: true // 移入图片显示删除图片
    };
  },
  mounted() {
    this.originValue = this.value
  },
  methods: {
    mouseenter() {
      this.canOption = true;
    },
    mouseleave() {
      this.canOption = false;
    },
    switchType() {
      this.localIsInput = true;
      this.$nextTick(function() {
        this.$refs.input.focus();
      });
    },
    uploadFile(e) {
      let file = e.target.files[0];
      if (!/\.(jpg|jpeg|png|bmp|JPG|PNG|BMP)$/.test(file.name)) {
        this.$emit("uploadFail", "file文件类型错误", this.idx);
        return;
      } else if (file.size > 2*1024 * 1024) {
        this.$emit("uploadFail", "上传图片大小过大，不能超过2M", this.idx);
        return;
      }
      let success = res => {
        this.src = `${res.imgUrl}`;
        this.$emit("upload", this.src, this.idx);
      };
      let fail = e => {
        this.$emit("uploadFail", e.msg, this.idx);
      };
      if (!window.form) {
        if (this.$message) this.$message.warning('表单SDK初始化失败，无法上传图片')
        return
      }
      window.form.uploadImage(
        {
          file: file
        },
        success,
        fail
      );
    },
    focusHandle(e) {
      this.oldValue = this.$refs.input.value;
      this.$emit("focus", e);
    },
    blurHandle(e) {
      // 只有编辑状态才执行这操作
      if (!this.$refs.input.value) {
        if (!this.isQues && !this.isDescriptionNull) {
          this.tempValue = this.oldValue;
        } else {
          this.oldValue = "";
        }
      } else {
        this.oldValue = "";
      }
      this.localIsInput = false;
      this.$emit("blur", e);
    },
    del() {
      this.$emit("del");
    },
    delImg() {
      this.src = "";
      this.$emit("upload", this.src, this.idx);
    },
    imgEnter() {
      this.enterFlag = true;
    },
    imgLeave() {
      this.enterFlag = false;
    }
  },
  watch: {
    value: {
      handler(value) {
        this.tempValue = value;
      },
      immediate: true
    },
    tempValue(value) {
      const newValue = (value || '').trim()
      this.tempValue = newValue
      if (this.maxLength && this.getLength > this.maxLength) {
        this.tempValue = newValue.substring(0, this.getIndex);
      }
      if (this.$refs.limit) {
        this.limitWidth = this.$refs.limit.offsetWidth;
      }
      this.$emit("input", this.tempValue);
    }
  },
  computed: {
    getLength() {
      if (!this.tempValue) {
        return;
      }
      return this.isChar ? this.tempValue.length : this.tempValue.gbLength();
    },
    getIndex() {
      return this.isChar
        ? this.maxLength
        : this.tempValue.gbIndex(this.maxLength) + 1;
    },
    style() {
      return {
        paddingRight: `${this.limitWidth + 47}px`
      };
    }
  }
};
</script>

<style lang="less" scoped>

.c-edit {
  width: 100%;
  text-align: left;
  // margin-bottom: 10px;

  &.matrix-wrap {
    display: flex;
    justify-content: center;
  }

  .edit-wrap {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;

    .edit-content {
      position: relative;
      width: calc(100% - 80px);

      &.isPreview {
        width: 100%;
      }

      .show-text {
        font-size: 16px;
        border: 1px dashed transparent;
        width: 100%;
        // padding-left: 10px;
        word-break: break-all;
        line-height: 36px;

        &:hover {
          border-color: #1E89E4;
        }
      }

      // 处理多选表格中样式
      &.ismatrix {
        width: 100px;

        input {
          width: 90%;
          font-size: 12px;
          height: 28px;
          line-height: 28px;
          padding: 0 5px;
          padding-right: 2px;
        }

        .show-text {
          height: 28px;
          line-height: 28px;
          margin: 4px 0;
          font-size: 14px;
          text-align: center;
        }
      }
    }

    .big-title {
      font-size: 20px;
      font-weight: 500;
    }

    .sub-title {
      font-size: 16px;
      min-height: 38px;
    }
  }

  .options {
    display: flex;
    #upload {
      display: none;
    }
  }

  i {
    font-size: 20px;
    margin-left: 20px;
    cursor: pointer;

    &:hover {
      color: #EB9630;
    }
  }

  .img-wrap {
    position: relative;
    max-width: 200px;
    margin-top: 10px;
    cursor: pointer;

    img {
      width: 100%;
    }

    .delImg {
      position: absolute;
      right: 5px;
      top: 5px;
      font-size: 16px;
      color: #333;
    }
  }

  input {
    outline: none;
    display: inline-block;
    width: calc(100% - 22px);
    height: 36px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.65);
    background-color: #fff;
    background-image: none;
    border: 1px solid #d2d2d2;
    border-radius: 4px;
    padding: 0 10px;
    color: #555;

    &:focus {
      border: 1px solid transparent;
      background: #EAF6FF;
    }

    &::-moz-placeholder {
      color: #bfbfbf;
      opacity: 1;
    }

    &:-ms-input-placeholder {
      color: #bfbfbf;
    }

    &::-webkit-input-placeholder {
      color: #bfbfbf;
    }

    &[disabled] {
      background: #f5f7fa;
      border-color: #e4e7ed;
      cursor: not-allowed;
    }
  }

  .limit {
    font-size: 12px;
    color: #999999;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: -8px;

    .length {
      color: rgb(94, 166, 237);
    }

    &.area {
      transform: translateX(110%);
      top: auto;
      bottom: 6px;
      line-height: normal;
      right: 20px;
    }
  }

  textarea {
    resize: none;
    outline: none;
    display: inline-block;
    padding: 0px 10px;
    width: calc(100% - 20px);
    height: 100%;
    font-size: 14px;
    line-height: 28px;
    background-color: #fff;
    background-image: none;
    border: 1px solid #d2d2d2;
    border-radius: 4px;
    color: #555;

    &.error {
      border-color: #fc5659;
    }

    &:focus {
      border: 1px solid transparent;
      background: #EAF6FF;
    }

    &::-moz-placeholder {
      color: #bfbfbf;
      opacity: 1;
    }

    &:-ms-input-placeholder {
      color: #bfbfbf;
    }

    &::-webkit-input-placeholder {
      color: #bfbfbf;
    }

    &[disabled] {
      cursor: not-allowed;
    }
  }

  &.preview-pc {
    .edit-content {
      width: 100%;
    }

    @media screen and (max-width: 768px) {
      input {
        &:focus {
          background: #fff;
          border-color: #1E89E4;
        }
      }

      textarea {
        border: 1px solid #ddd;

        &:focus {
          background: #fff;
          border-color: #1E89E4;
        }
      }

      .edit-wrap {
        .edit-content {
          width: 100%;
        }
      }
    }
  }
}
</style>
