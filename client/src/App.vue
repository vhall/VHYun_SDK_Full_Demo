<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="less">
#app {
  color: #fff;
  min-height: 800px;
  height: 100vh;
  min-width: 1280px;
  overflow: hidden;
}
body {
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;
}
body::-webkit-scrollbar {
  display: none;
  width: 0 !important;
}
.hidden {
  visibility: hidden;
}
body{
  /deep/ .el-select-dropdown.el-popper .popper__arrow{
    display: none;
  }
}
</style>
