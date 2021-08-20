<template>
  <div class="file-list">
    <div class="left-menu">
      <div v-for="(item, index) in menuList" :key="item.cid"
           :class="['fileItem', item.cid === selectDoc.cid ? 'active' : '']" @click="clooseFile(item)">
        <span class="word">{{ item.cid }}</span>
        <i class="iconfont iconicon-guanbi iconClose" @click.stop="delFile(item, index)"></i>
        <i class="shu"></i>
      </div>
    </div>
    <div class="right-set">
      <i :class="['iconfont', 'iconicon-fangda', activeSet === 'big' ? 'active' : '']" title="放大"
         @click="setFile('big')"></i>
      <i :class="['iconfont', 'iconicon-suoxiao', activeSet === 'small' ? 'active' : '']" title="缩小"
         @click="setFile('small')"></i>
      <i :class="['iconfont', 'iconicon-huanyuan']" title="还原" @click="setFile('reset')"></i>
      <i :class="['iconfont', 'iconicon-yidong', activeSet === 'move' ? 'active' : '']" title="移动"
         @click="setFile('move')"></i>
    </div>
  </div>
</template>

<script>

export default {
  name: 'DocBoardMenu',
  components: {},
  props: ['changeViewDoc', 'list', 'selectDoc', 'delFile', 'addNewFile', 'allComplete'],
  data() {
    return {
      activeSet: null,
      visible: false,
      value: 'CANCEL',
      color: '#333333',
      num: 4,
      status: false,
      options: [],
      $doc: null,
    }
  },
  methods: {
    setDoc(doc) {
      this.$doc = doc
    },
    inputLimit(e) {
      this.num = e.target.value.replace(/[^\d.]/g, '')
      if (this.num > 30) {
        this.num = 30
      }
    },
    open() {
      this.visible = true
    },
    async clooseFile(item) {
      // this.changeViewDoc(item)
    },
    setFile(str) {
      if (!this.selectDoc.cid) {
        return false
      }
      this.activeSet = str
      let opts = {
        id: this.selectDoc.cid,
      }
      if (str === 'big') {
        this.$doc.zoomIn(opts)
      } else if (str === 'small') {
        this.$doc.zoomOut(opts)
      } else if (str === 'reset') {
        this.$doc.zoomReset(opts)
      } else if (str === 'move') {
        this.$doc.move(opts)
      }
    },
  },
  computed: {
    menuList: function () {
      return this.list.filter((item) => Number(item.is_board) === 2)
    },
  },
}
</script>

<style lang="less" scoped>
.file-list {
  height: 40px;
  background: #222;
  display: flex;
  padding: 0 8px;
  border-left: 1px black solid;
  border-right: 1px black solid;

  .left-menu {
    flex: 1;
    display: flex;
    width: 0;
    color: #999;
    overflow: auto;

    .fileItem {
      display: flex;
      align-items: center;
      padding-left: 16px;
      cursor: pointer;

      .iconClose {
        &:hover {
          color: #1e90ff;
        }
      }

      .word {
        margin-right: 10px;
        white-space: nowrap;
      }

      > i {
        font-size: 14px;
        margin-right: 16px;
      }

      .shu {
        width: 1px;
        height: 16px;
        background: #363636;
        margin-right: 0px;
      }

      &.active {
        background: #000;
        color: #1e90ff;

        .shu {
          display: none;
        }
      }

      &:last-child {
        .shu {
          width: 0px;
        }
      }
    }
  }

  .right-set {
    min-width: 170px;
    color: #f7f7f7;
    display: flex;
    // align-items: center;
    margin-left: 20px;
    line-height: 40px;

    .word {
      margin-right: 10px;
      min-width: 46px;
      text-align: right;
    }

    > i {
      font-size: 24px;
      margin-right: 8px;
      margin-left: 8px;
      cursor: pointer;

      &.active {
        color: #1ad5ce;
      }

      &.shu {
        width: 1px;
        height: 16px;
        background: #363636;
        margin-top: 12px;
      }
    }

    .switch {
      display: flex;
      justify-content: center;
      align-items: center;

      b {
        font-weight: normal;
        margin-right: 8px;
      }
    }

    .icon_shouqi {
      transform: rotate(180deg);
    }
  }
}
</style>
