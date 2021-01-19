<template>
  <VhDialog
    :appendToBody="true"
    :showFooter="false"
    :showHeader="false"
    :closeOnClickModal="false"
    :visible="visible"
  >
    <!--设备选择-->
    <Device
      :handlerDevice="handlerDeviceSelect"
      :selectType="selectType"
      :attributes="attributes"
      :mustStream="mustStream"
      :rtc="rtc"
    />
  </VhDialog>
</template>

<script>
import VhDialog from '../../src/component'
import Device from '@/components/Device'

export default {
  name: 'DeviceDialog',
  components: { VhDialog, Device },
  props: ['closeOnClickModal', 'attributes', 'rtc', 'onSelect', 'selectType', 'mustStream'],
  data: () => ({
    visible: true
  }),
  mounted(){},
  methods: {
    handlerDeviceSelect(ok, settings) {
      if (!this.onSelect) return false
      this.onSelect(ok, settings)
    },
    hide(){
      this.visible = false
    },
  },
}
</script>

<style lang="less" scoped>
</style>
