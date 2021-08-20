const types = {
  TEXT: 'text',
  DATE: 'date',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  PAGE: 'page',
  AREA: 'area',
  MATRIX: 'matrix',
  LINE: 'line',
  REMARK: 'remark',
  SEX: 'sex',
  SCANTRON:"scantron"
}

const coms = {
  text: 'q-text',
  date: 'q-date',
  radio: 'q-radio',
  checkbox: 'q-checkbox',
  page: 'q-pagination',
  area: 'q-area',
  matrix: 'q-matrix',
  line: 'q-line',
  remark: 'q-remark',
  sex: 'q-sex'
}

const EVENT = {
  READY: 'ready',
  CREATE: 'create',
  UPDATE: 'update',
  SUBMIT: 'submit',
  ERROR: 'error'
}

const HTTP = {
  AREA_JSON: 'getAreaData',
  SAVE_QUESTIONNAIRE: 'save',
  QUESTIONNAIRE_ID: 'getById',
  QUESTIONNAIRE_IDS: 'getByIds',
  SUBMIT_QUESTIONNAIRE: 'submit',
  PUBLISH_QUESTIONNAIRE: 'publish',
  CANCEL_PUBLISH_QUESTIONNAIRE: 'cancelPublish'
}
export { types, coms, EVENT, HTTP }
