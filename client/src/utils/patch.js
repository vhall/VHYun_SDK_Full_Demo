import { videoAutoPlaySupport } from '@/utils/autoplay'

Date.prototype.toLocaleDateString = function (){
  // 重写日期函数格式化日期 "2020-01-02"
  return `${this.getFullYear()}-${this.getMonth() + 1 >= 10 ? this.getMonth() + 1 : '0' + (this.getMonth() + 1)}-${
    this.getDate() >= 10 ? this.getDate() : '0' + this.getDate()
  }`
}

Date.prototype.toLocaleDateTimeString = function (){
  const t = this
  const m = t.getMonth() + 1 >= 10 ? t.getMonth() + 1 : '0' + (t.getMonth() + 1)
  const date = `${t.getFullYear()}-${m}-${t.getDate() >= 10 ? t.getDate() : '0' + t.getDate()}`
  const time = `${(t.getHours()).toString().padStart(2, '0')}:${(t.getMinutes()).toString().padStart(2, '0')}:${(t.getSeconds()).toString().padStart(2, '0')}`
  return date + ' ' + time
}

String.prototype.formatDate = function (fmt){
  let params = this.replace(/[-\s]/g, ':').split(':')
  params[1] -= 1
  let result = new Date(...params)
  return result.format(fmt)
}

String.prototype.gbLength = function (){
  var l = this.length
  var blen = 0
  for (let i = 0; i < l; i++) {
    if ((this.charCodeAt(i) & 0xff00) !== 0) {
      blen += 1
    } else {
      blen += 0.5
    }
  }
  return Math.ceil(blen)
}

String.prototype.gbIndex = function (length){
  let l = this.length
  let blen = 0
  let index = 0
  for (let i = 0; i < l; i++) {
    if ((this.charCodeAt(i) & 0xff00) !== 0) {
      blen += 1
    } else {
      blen += 0.5
    }
    if (blen === length) {
      index = i
      break
    } else if (blen > length) {
      index = i - 1
      break
    }
  }
  return index
}

String.prototype.copyClipboard = function (callBack){
  var textarea = document.createElement('textarea')
  textarea.innerHTML = this
  textarea.style.position = 'fixed'
  textarea.style.top = '1000000000px'
  document.body.appendChild(textarea)
  textarea.select()
  if (document.execCommand('copy')) {
    document.execCommand('copy')
    textarea.blur()
    if (callBack) callBack('success')
  } else {
    if (callBack) callBack('error')
  }
  var lt = setTimeout(function (){
    clearTimeout(lt)
    document.body.removeChild(textarea)
  }, 500)
}

String.prototype.padStart = function padStart(targetLength, padString){
  targetLength = targetLength >> 0 //floor if number or convert non-number to 0;
  padString = String(typeof padString !== 'undefined' ? padString : ' ')
  if (this.length > targetLength) {
    return String(this)
  } else {
    targetLength = targetLength - this.length
    if (targetLength > padString.length) {
      padString += padString.repeat(targetLength / padString.length) //append to original to ensure we are longer than needed
    }
    return padString.slice(0, targetLength) + String(this)
  }
}

// 提前测试是否支持自动播放
setTimeout(async () => {
  await videoAutoPlaySupport()
  document.body.oncontextmenu = function () { return false }
}, 200)
