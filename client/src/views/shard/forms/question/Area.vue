<template>
  <div class="q-area" :class="{'preview-pc': !value.edit}">
    <div class="q-title">
      <div
        v-if="!value.edit"
        class="preview"
        :class="{'must': !value.edit&&value.required}"
      >{{ value.title }}
      </div>
      <img v-if="!value.edit&&value.imgUrl" :src="value.imgUrl" alt/>
      <c-edit
        v-if="value.edit"
        v-model="value.title"
        :canUpload="true"
        @upload="upload"
        :imgUrl="value.imgUrl"
        @uploadFail="uploadFail"
      ></c-edit>
    </div>
    <div class="select">
      <div class="q-edit-select vhall-inline">
        <el-select v-model="provinceVal" @change="changeProvince" placeholder="请选择省份">
          <el-option
            v-for="(item,index) in provinces"
            :label="item.label"
            :value="item.value"
            :key="index"
          ></el-option>
        </el-select>
      </div>
      <!-- 当创建时隐藏该行，创建页面依然显示，答题页面不显示 -->
      <div class="q-edit-select vhall-inline" v-if="value.edit || showCity">
        <el-select
          v-model="cityVal"
          @change="changeCity"
          placeholder="请选择城市"
          :disabled="canChooseArea[0].disabled"
        >
          <el-option
            v-for="(item,index) in cities"
            :label="item.label"
            :value="item.value"
            :key="index"
          ></el-option>
        </el-select>
        <span
          v-if="value.edit"
          class="flag"
          @click="switchState(0, canChooseArea[0].text)"
        >{{ canChooseArea[0].text }}</span>
      </div>
      <div class="q-edit-select vhall-inline" v-if="value.edit || showCounty">
        <el-select
          v-model="countyVal"
          placeholder="请选择区/县"
          @change="changeCounty"
          :disabled="canChooseArea[1].disabled"
        >
          <el-option
            v-for="(item,index) in counties"
            :label="item.label"
            :value="item.value"
            :key="index"
          ></el-option>
        </el-select>
        <span
          v-if="value.edit"
          class="flag"
          @click="switchState(1, canChooseArea[1].text)"
        >{{ canChooseArea[1].text }}</span>
      </div>
      <div class="q-edit-select q-edit-detail" v-if="value.edit || showAddress">
        <c-edit
          placeholder="详细地址"
          v-model="address"
          @blur="addressBlur"
          :max-length="50"
          :isQues="true"
          :disabled="canChooseArea[2].disabled"
          :isPreview="!value.edit"
        ></c-edit>
        <span
          v-if="value.edit"
          class="flag detail-flag"
          @click="switchState(2, canChooseArea[2].text)"
        >{{ canChooseArea[2].text }}</span>
      </div>
    </div>
    <div class="error-msg" v-if="errorTip">{{ errorTip }}</div>
  </div>
</template>

<script>
import CEdit from '../c-edit.vue'
import axios from 'axios'
// import {store, mutations} from '../../store.js'

export default {
  props: {
    index: Number,
    value: Object,
  },

  components: {
    CEdit
  },
  data() {
    return {
      level: '',
      provinceVal: '',
      cityVal: '',
      countyVal: '',
      address: '',
      area: {},
      province: '',
      city: '',
      county: '',
      provinces: [],
      cities: [],
      counties: [],
      errorTip: '',
      canChooseArea: [
        {
          text: '隐藏',
          disabled: false,
          level: 'city'
        },
        {
          text: '隐藏',
          disabled: false,
          level: 'county'
        },
        {
          text: '隐藏',
          disabled: false,
          level: 'address'
        }
      ]
    }
  },
  created() {
    this.getAreaData()
  },
  mounted() {
    if (!this.value.edit) {
      if (this.value.level === VhallForm.AREA_LEVEL.PROVINCE) {
        this.provinceVal = this.value.replys[0]
      } else if (this.value.level === VhallForm.AREA_LEVEL.CITY) {
        this.provinceVal = this.value.replys[0]
        this.cityVal = this.value.replys[1]
      } else if (this.value.level === VhallForm.AREA_LEVEL.COUNTY) {
        this.provinceVal = this.value.replys[0]
        this.cityVal = this.value.replys[1]
        this.countyVal = this.value.replys[2]
      } else if (this.value.level === VhallForm.AREA_LEVEL.ADDRESS) {
        this.provinceVal = this.value.replys[0]
        this.cityVal = this.value.replys[1]
        this.countyVal = this.value.replys[2]
        this.address = this.value.replys[3]
      }
    } else {


      let levelIdx
      for (let i = 0; i < this.canChooseArea.length; i++) {
        const el = this.canChooseArea[i]
        if (el.level === this.value.level) {
          levelIdx = i
          break
        }
      }

      this.canChooseArea.forEach((el, index) => {
        if (levelIdx !== -1) {
          if (index > levelIdx) {
            el.disabled = true
            el.text = '显示'
          }
        } else {
          el.disabled = true
          el.text = '显示'
        }
      })
    }
  },
  computed: {
    showCity() {
      return (
        this.value.level === 'city' ||
        this.value.level === 'county' ||
        this.value.level === 'address'
      )
    },
    showCounty() {
      return this.value.level === 'county' || this.value.level === 'address'
    },
    showAddress() {
      return this.value.level === 'address'
    },
  },
  methods: {
    check() {
      if (!this.value.level) {
        this.errorTip = '地区级别不能为空'
        return
      } else if (
        this.value.required &&
        !this.value.edit &&
        !this.value.replys.length
      ) {
        this.errorTip = '请选择地址'
        return
      } else {
        this.errorTip = ''
        return true
      }
    },
    async getAreaData() {
      let res = await axios(this.value.js_file)
      try {
        let data = res.data
        this.area = res.data
        this.provinces = data.provinces
      } catch (e) {
        console.error(e)
      }
    },
    switchState(index, text) {
      if (text === '隐藏') {
        this.canChooseArea.forEach((el, i) => {
          if (i >= index) {
            el.text = '显示'
            el.disabled = true
          }
          this.level =
            index === 0 ? 'province' : this.canChooseArea[index - 1].level
        })
      } else if (text === '显示') {
        this.canChooseArea.forEach((el, i) => {
          if (i <= index) {
            el.text = '隐藏'
            el.disabled = false
          }
          this.level = this.canChooseArea[index].level
        })
      }

      this.value.level = this.level
      this.$emit('change', this.value)
    },
    changeProvince(value) {
      this.cities = []
      this.counties = []
      this.cities = this.area.cities[value]
      this.cityVal = ''
      this.countyVal = ''
      let province
      for (let i = 0; i < this.area.provinces.length; i++) {
        const el = this.area.provinces[i]
        if (el.value === value) {
          province = el
          break
        }
      }
      if (
        this.value.level === 'province' ||
        this.value.level === 'city' ||
        this.value.level === 'county' ||
        this.value.level === 'address'
      ) {
        this.value.replys[0] = province.label
        this.$emit('change', this.value)
      }
    },
    changeCity(value) {
      this.counties = this.area.counties[value]
      // this.value.replys[1] = this.cityVal
      this.countyVal = ''

      let city
      for (let i = 0; i < this.cities.length; i++) {
        const el = this.cities[i]
        if (el.value === value) {
          city = el
          break
        }
      }

      if (
        this.value.level === 'city' ||
        this.value.level === 'county' ||
        this.value.level === 'address'
      ) {
        this.value.replys[1] = city.label
        this.$emit('change', this.value)
      }
    },
    changeCounty(value) {
      let county
      for (let i = 0; i < this.counties.length; i++) {
        const el = this.counties[i]
        if (el.value === value) {
          county = el
          break
        }
      }

      if (this.value.level === 'county' || this.value.level === 'address') {
        this.value.replys[2] = county.label
        this.$emit('change', this.value)
      }
    },
    addressBlur() {
      if (this.value.level === 'address') {
        this.value.replys[3] = this.address
        this.$emit('change', this.value)
      }
    },
    upload(src) {
      this.errorTip = ''
      this.value.imgUrl = src
      this.$emit('change', this.value)
    },
    uploadFail(msg) {
      console.error(msg)
      this.errorTip = msg
    }
  },
  watch: {}
}
</script>

<style scoped lang="less">
.q-area {
  text-align: left;

  .select {
    margin-top: 10px;
  }

  .q-edit-select {
    display: inline-block;
    width: 100%;
    height: 38px;
    margin-bottom: 10px;

    .el-select {
      // min-width: 540px;
      width: calc(100% - 80px);
      height: 38px;
    }

    .remove {
      cursor: pointer;
      font-size: 12px;
      margin-left: 10px;
    }
  }

  &.display {
    margin-bottom: 0;
  }

  .vhall-inline {
    display: inline-block;
    font-size: 0;
    // width: 60%;
    // min-width: 540px;
  }

  .edit {
    position: relative;

    .area-title {
      display: inline-block;
      margin-right: 40px;
      width: calc(100% - 40px);
      border: 1px solid #d2d2d2;
      background-color: #f2f2f2;
      height: 30px;
      padding: 0 10px;
      line-height: 30px;
      border-radius: 2px;
      margin-bottom: 14px;
      color: #999;
    }

    .remove {
      position: absolute;
      right: 0;
      top: 7px;
      color: #999999;
      cursor: pointer;

      &:hover {
        color: #fc5659;
      }
    }
  }

  .flag {
    font-size: 12px;
    color: #555;
    margin-left: 20px;
    cursor: pointer;
  }

  .q-edit-detail {
    position: relative;

    .detail-flag {
      position: absolute;
      right: 36px;
      top: 50%;
      transform: translateY(-50%);
    }
  }

  &.preview-pc {
    .q-title {
      font-size: 16px;
      margin-bottom: 18px;

      .preview {
        line-height: 22px;

        &.must::after {
          content: "*";
          color: red;
        }
      }

      img {
        max-width: 500px;
        margin-top: 10px;
      }
    }

    .el-select {
      width: 100%;
    }

    @media screen and (max-width: 768px) {
      .q-title {
        margin: 0 0 15px 15px;
      }

      /deep/ .el-select {
        &.is-focus .el-input__inner {
          border-color: #1e89e4;
        }

        .el-input__inner {
          border-color: #ccc;
        }
      }
    }
  }
}

</style>

<style lang="less">
.q-area {
    .error-msg {
      position: absolute;
      color: #fc5659;
      // padding-left: 10px;
      line-height: 20px;
      font-size: 14px;
    }

    .el-select .el-input.is-focus .el-input__inner {
      border: 1px solid #999;
      color: #666;
    }

    .el-select .el-input__inner {
      padding-left: 10px;

      :focus {
        border-color: #999;
      }
    }
  }
</style>
