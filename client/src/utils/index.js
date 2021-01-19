
export const VH_TITLE = '微吼云DEMO'

export function checkBrowserEnv(){
  for (const sdk of ['VhallRTC', 'VhallChat', 'VHDocSDK']) {
    if (!(sdk in window)) return 'SDK加载失败'
  }
  const isHttps = window.location.protocol === 'https:'
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isHttps && !isLocal) return '网页功能需要https才能正常使用'
  if (!window.localStorage) return '浏览器不支持Storage功能'
  // if (!window?.navigator?.mediaDevices?.ondevicechange) return '浏览器可能不支持'
}

export const localStoragePrefix = require('../../package.json').name + '-'

export const IDENTITY = {
  master: 'master',
  helper: 'helper',
  guest: 'guest',
  player: 'player'
}

export const IDENTITY_NAME = {
  [IDENTITY.master]: '主持人',
  [IDENTITY.helper]: '助理',
  [IDENTITY.guest]: '嘉宾',
  [IDENTITY.player]: '观众'
}

export const USER_LIST_SORT_WIDTH = {
  [IDENTITY.master]: 9,
  [IDENTITY.helper]: 7,
  [IDENTITY.guest]: 5,
  [IDENTITY.player]: 3,
}

export const IDENTITY_COLORS = {
  master: ['#1E90FF', 'rgba(30,144,255,0.20)'],
  helper: ['#1AD5CE', 'rgba(26,213,206,0.20)'],
  guest: ['#F0BE1C', 'rgba(240,190,28,0.20)'],
  player: ['', ''],
  undefined: ['', ''],
  '': ['', '']
}

export function checkSdkOpt(opt) {
 return opt.appId
   && opt.accountId
   && opt.token
   && opt.paasLiveId
   && opt.paasInavId
   && opt.paasImId
   && opt.identity
}

export function promisify(bind, fn, catchErr){
  if (typeof fn === 'function') {
    fn = fn.bind(bind)
  } else {
    catchErr = fn
    fn = bind
  }
  return function (...ag) {
    return new Promise(function (resolve, reject) {
      return fn(...ag, resolve, catchErr ? resolve : reject)
    })
  }
}

export function wait(time){
  return new Promise(resolve => setTimeout(resolve, time))
}

export function djb2(str){
  if (!str) str = ''
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i) /* hash * 33 + c */
  }
  return hash
}

export function randomHashColor1(str){
  const SS = [0.35, 0.5, 0.65]
  const LL = [0.35, 0.5, 0.65]
  let hash = Math.abs(djb2(str))
  let H, S, L

  H = hash % 359
  hash = Math.trunc(hash / 360)
  S = SS[hash % SS.length] * 100
  hash = Math.trunc(hash / SS.length)
  L = LL[hash % LL.length] * 100

  return `hsl(${H}, ${S}%, ${L}%)`
}
export function randomHashColor(str){
  const CC = ['#1E90FF', '#1AD5CE', '#0A59A6', '#3A2DFF']
  const hash = Math.abs(djb2(str))
  return CC[hash % CC.length]
}

export function userFirstStr(user){
  if (!user) return ''
  if (user.title) return user.title
  return (user.nickName || user.nick_name || user.userId || '').slice(0, 1).toUpperCase()
}

export function randomColor(){
  let r = Math.floor(Math.random() * 255)
  let g = Math.floor(Math.random() * 255)
  let b = Math.floor(Math.random() * 255)
  return `rgba(${r},${g},${b},1)`
}

export function stringCut(str, len){
  if (!str) return ''
  if (str.length <= len) return str
  return str.slice(0, len - 2) + '...'
}

export function cookies() {
  if (!window.document.cookie) return {}
  const cc = window.document.cookie.split(/;\s?/)
  const obj = {}
  for (const c of cc) {
    if (!c) continue
    let [name, val] = c.split('=')
    if (val) obj[name] = val
  }
  return obj
}
