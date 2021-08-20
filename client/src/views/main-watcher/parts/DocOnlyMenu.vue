<template>
  <div class="fileList">
    <div class="leftMenu">
      <div v-for="(item) in list" :key="item.cid" :class="['fileItem', item.cid === selectDoc.cid ? 'active' : '']">
        <span class="word">{{ item.cid }}</span>
        <i class="shu"></i>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'DocOnlyMenu',
  components: {},
  props: ['list', 'selectDoc', 'allComplete'],
  data() {
    return {
      activeSet: null,
      visible: false,
      value: 'CANCEL',
      color: '#333333',
      num: 4,
      status: false,
    }
  },
  methods: {},
  computed: {},
}
</script>

<style lang="less" scoped>
.fileList {
  height: 40px;
  background: #222;
  display: flex;
  padding: 0 8px;
  border-left: 1px black solid;
  border-right: 1px black solid;

  .addBorad {
    display: flex;
    align-items: center;
    color: #999;
    padding-left: 16px;
    cursor: pointer;

    > i {
      font-size: 12px;
      margin-right: 5px;
    }

    .shu {
      width: 1px;
      height: 16px;
      background: #363636;
      margin-left: 16px;
    }

    &:hover {
      background: #000;
      color: #1e90ff;
    }
  }

  .leftMenu {
    flex: 1;
    display: flex;
    width: 0px;
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

  .rightSet {
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

.BoardModalBox {
  padding: 0px 32px;

  .boardItem {
    display: flex;
    align-items: center;
    margin-top: 16px;

    .label {
      width: 56px;
      font-size: 14px;
      color: #666;
      margin-right: 16px;
      height: 36px;
      line-height: 36px;
    }

    .cont {
      width: 208px;
      height: 36px;

      /deep/ .popper__arrow {
        display: none;
      }
    }
  }
}
</style>
