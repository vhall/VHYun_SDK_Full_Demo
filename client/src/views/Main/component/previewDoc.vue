<template>
  <div class="preview-mark">
    <section>
      <span @click="close"><i class="iconfont iconicon-guanbi"></i></span>
      <div class="preview-doc-box" :id="previewInfo.elId"></div>
      <div class="preview-footer">
        <i class="iconfont iconicon-shangyiye" title="上一步" @click="pageChange('prev')"></i>
        <span>
          <b>{{ previewInfo.slideIndex }}</b> / {{ previewInfo.slidesTotal }}</span
        >
        <i class="iconfont iconicon-xiayiye" title="下一步" @click="pageChange('next')"></i>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'PreviewDoc',
  props: {
    previewInfo: {
      type: Object,
      required: true,
      default() {
        return { docId: '', slideIndex: 0, slidesTotal: 0, canOperate: false,elId:''}
      },
    },
  },
  data() {
    return {
      $doc: null,
      elId: '',
    }
  },
  methods: {
    setDoc($doc) {
      this.$doc = $doc
      this.initDoc()
    },
    async initDoc() {
      await this.$nextTick()
      await this.$doc.setRole(window.VHDocSDK.RoleType.SPECTATOR)
      let option = {
        elId: this.previewInfo.elId,
        docId: this.previewInfo.docId,
        width: 720,
        height: 404.9,
      }
      this.$doc.createDocument(option)
      this.$doc.selectContainer({ id: this.previewInfo.elId })
      try {
        const { status, status_jpeg, slideIndex, slidesTotal, converted_page, converted_page_jpeg } = await this.$doc.loadDoc({
          docId: this.previewInfo.docId,
          id: this.previewInfo.elId,
        })
        let temp = {}
        if (status == 200) {
          temp = { slideIndex, slidesTotal }
        } else if (status_jpeg == 200) {
          temp = { slideIndex: converted_page, slidesTotal: converted_page_jpeg }
        }
        // this.previewInfo = { ...this.previewInfo, slideIndex: temp.slideIndex + 1, slidesTotal: temp.slidesTotal }
      } catch (error) {
        console.error(error)
      }
    },
    pageChange(str) {
      console.warn(this.previewInfo.canOperate)
      if (!this.previewInfo.canOperate) {
        
        this.$message.info('文档尚未加载完毕')
        return
      }
      const opts = {
        id: this.previewInfo.elId,
      }
      if (str == 'next') {
        this.$doc.nextStep(opts)
      } else {
        this.$doc.prevStep(opts)
      }
    },
    async close(){
      this.$doc.destroyContainer({ id: this.previewInfo.elId })
      await this.$doc.setRole(window.VHDocSDK.RoleType.HOST)
      this.$emit('closePreview')
    }
  },
}
</script>

<style lang="less">
.preview-mark {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  top: 0%;
  left: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  > section {
    width: 720px;
    height: 404.9px;
    position: relative;
    background-color: #0F0F0F;
    i {
      cursor: pointer;
    }
    > span {
      position: absolute;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #0F0F0F;
      font-size: 12px;
      right: 8px;
      top: 8px;
      z-index: 20;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .preview-doc-box {
      position: absolute;
      z-index: 10;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .preview-footer {
      position: absolute;
      bottom: 15px;
      left: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      transform: translate(-50%, -50%);
      border-radius: 4px;
      color: white;
      height: 40px;
      line-height: 40px;
      padding: 0 20px;
      display: flex;
      justify-content: center;
      z-index: 20;
      span {
        margin: 0 20px;
        font-size: 14px;
        b {
          font-style: normal;
          color: #1e90ff;
        }
      }
    }
  }
}
</style>
