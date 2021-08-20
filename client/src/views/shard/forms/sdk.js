import { types as TYPE } from './contant'
import { BASE_QUESTION_PRESET_DATA, BLANK_DATA } from './preset'

export function createFromCheck(question) {
  const details = question && question.detail || []
  if (!details.filter(item => item.type !== TYPE.PAGE && item.type !== TYPE.LINE).length) return new Error('不允许无题目的表单')
  if (details[0].type === TYPE.PAGE) return new Error('第一道题不应是分页题')
  if (typeof VhallForm === 'undefined') return
  for (const item of details) {
    const rs = typeof item.validateCreate === 'function' ? item : createInfo(item)
    if (!rs) continue
    // if (!rs) return new Error('未知类型表单')
    const error = rs.validateCreate()
    if (error) return error
  }
}

export function clone (data) {
  if (!data) return data
  return JSON.parse(JSON.stringify(data))
}

export function createInfo(data){
  let info = null
  switch (data.type) {
    case 'judge':
      info = new VhallForm.JudgeInfo()
      break
    case 'text':
      info = new VhallForm.TextInfo()
      break
    case 'select':
      info = new VhallForm.SelectInfo()
      break
    case 'scantron':
      info = new VhallForm.ScantronInfo()
      break
    case 'remark':
      info = new VhallForm.RemarkInfo()
      break
    case 'radio':
      info = new VhallForm.RadioInfo()
      break
    case 'page':
      info = new VhallForm.PageInfo()
      break
    case 'line':
      info = new VhallForm.LineInfo()
      break
    case 'date':
      info = new VhallForm.DateInfo()
      break
    case 'checkbox':
      info = new VhallForm.CheckBoxInfo()
      break
    case 'area':
      info = new VhallForm.AreaInfo()
      break
    case 'matrix':
      info = new VhallForm.MatrixInfo()
  }
  if (info) Object.assign(info, data)
  return info
}

export function getPlainInfo(data){
  const type = typeof data === 'string' ? data : data.type
  if (typeof data === 'string') data = {}
  const base = BASE_QUESTION_PRESET_DATA[type]
  return Object.assign({}, clone(base), clone(data))
}

export function reBuildQu(data) {
  const question = clone(BLANK_DATA)
  for (const key of Object.keys(question)) {
    question[key] = data[key]
  }

  if (!Array.isArray(data.detail)) return question
  question.detail = []
  let pageId = 0
  for (const item of data.detail) {
    const ii = Object.fromEntries(Object.entries(item).filter(i => i[1] !== null))
    delete ii.detail
    // fix pageId
    if (item.type === 'page') ii.pageId = pageId++
    question.detail.push(getPlainInfo(ii))
  }

  for (const item of question.detail) {
    item.edit = true
  }
  return question
}
