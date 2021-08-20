/* eslint-disable */
export const PRESET_FROM = {
  name: { type: 'text', title: '请问你的姓名是什么？' },
  sex: {
    title: '你的性别是什么？',
    type: 'radio',
    custom_ques: 2,
    items: [
      {
        value: '男',
        key: 'A',
        imgUrl: '',
        custom_opt: 2,
        disabled: false
      },
      {
        value: '女',
        key: 'B',
        imgUrl: '',
        custom_opt: 2,
        disabled: false
      }
    ]
  }
}

export const BASE_QUESTION_PRESET_DATA = {
  area: { type: 'area', title: '地区选择题', required: false, level: 'county', replys: [], js_file: 'https://static.vhallyun.com/public/static/js/area.json' },
  text: { type: 'text', title: '文本题', required: false, min: 1, max: 60, imgUrl: '' },
  remark: { type: 'remark', title: '图文备注', required: false, imgUrl: '' },
  page: { type: 'page', title: '分页', required: false },
  line: { type: 'line', title: '分割线', required: false },
  date: { type: 'date', title: '请选择您的时间', required: false, format: 'Y-m-d H:i:s' },
  radio: { type: 'radio', title: '单选题', required: false, correctIndex: -1, replys: [], custom_ques: 2, items: [{ value: '选项', key: 'A', imgUrl: '', custom_opt: 2, disabled: false }, { value: '选项', key: 'B', imgUrl: '', custom_opt: 2, disabled: false }] },
  checkbox: { type: 'checkbox', title: '多选题', required: false, replys: [], correctIndex: [], custom_ques: 2, min:1, max: 10, items: [{ value: '选项1', key: 'A', imgUrl: '', custom_opt: 2, disabled: false }, { value: '选项2', key: 'B', imgUrl: '', custom_opt: 2, disabled: false }, { value: '选项3', key: 'C', imgUrl: '', custom_opt: 2, disabled: false }, { value: '选项4', key: 'D', imgUrl: '', custom_opt: 2, disabled: false }] },
  matrix: { type: 'matrix', title: '表格', required: false, format: 'radio', answer: [], replys: [], column: [{ value: '列1', isenter: false }, { value: '列2', isenter: false }], row: [{ value: '行1', isenter: false }, { value: '行2', isenter: false }] },
  matrix_checkbox: { type: 'matrix', title: '表格', required: false, format: 'checkbox', answer: [], replys: [], column: [{ value: '列1', isenter: false }, { value: '列2', isenter: false }], row: [{ value: '行1', isenter: false, selected: [] }, { value: '行2', isenter: false, selected: [] }] },
  select: { type: 'select', title: '', required: false, replys: [], correctIndex: -1 },
  judge: { type: 'judge', title: '', required: false, replys: [], correctIndex: -1 },
  scantron: { type: 'scantron', title: '', required: false, replys: [], items: [] },
}

export const BLANK_DATA = {
  id: null,
  title: '标题', // 表单标题
  description: '问卷简介',
  imgUrl: null,
  publish: false,
  detail: [],
  max: 100,
  extension: '扩展信息'
}
