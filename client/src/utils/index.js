export const VH_TITLE = '微吼云DEMO'

export function checkBrowserEnv(){
  for (const sdk of ['VhallChat']) {
    if (!(sdk in window)) return 'SDK加载失败'
  }
  // const isHttps = window.location.protocol === 'https:'
  // const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  // if (!isHttps && !isLocal) return '网页功能需要https才能正常使用'
  if (!window.localStorage) return '浏览器不支持Storage功能'
  if (typeof Proxy === 'undefined') return '该浏览器不支持'
  // if (!window?.navigator?.mediaDevices?.ondevicechange) return '浏览器可能不支持'
}

export function isSecure(){
  if (window.isSecureContext) return true
  return window.location.protocol === 'https'
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
  [IDENTITY.player]: 3
}

export const IDENTITY_COLORS = {
  master: ['#1E90FF', 'rgba(30,144,255,0.20)'],
  helper: ['#1AD5CE', 'rgba(26,213,206,0.20)'],
  guest: ['#F0BE1C', 'rgba(240,190,28,0.20)'],
  player: ['', ''],
  undefined: ['', ''],
  '': ['', '']
}

export function checkSdkOpt(opt){
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
  return function (...ag){
    return new Promise(function (resolve, reject){
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

  const [ r, g, b ] = HSL2RGB(H / 360, S / 100, L / 100)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function HSL2RGB(h, s, l){
  let r, g, b
  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    let hue2rgb = function hue2rgb(p, q, t){
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s
    let p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
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

export function cookies(){
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

// 请求设备访问权限（摄像头和麦克风）
export function requestAccessPermissions(){
  return new Promise(function (resolve, reject){
    if (!navigator || !navigator.mediaDevices) return reject()
    const config = { video: true, audio: true }
    return navigator.mediaDevices.getUserMedia(config).then(function (stream){
      resolve(true)
      stream.getTracks().forEach(function (trackInput){ trackInput && trackInput.stop() })
    }, function (e){
      reject(e)
    })
  })
}

export function getProxy(target, obj){
  const h = {
    get: function (target, p){
      const vv = obj[p]
      if (vv === null) return function (){}
      if (!vv) return target[p]
      if (typeof vv === 'string') return typeof target[vv] === 'function' ? target[vv].bind(target) : target[vv]
      return vv(typeof target[p] === 'function' ? target[p].bind(target) : target[p])
    }
  }
  return new Proxy(target, h)
}

export async function checkAccess() {
  // granted prompt denied
  if (!(navigator.permissions && navigator.permissions.query)) return 'prompt'
  try {
    const [s0, s1] = await Promise.all([
      navigator.permissions.query({ name: "camera", panTiltZoom: true }),
      navigator.permissions.query({ name: "microphone", panTiltZoom: true })
    ])
    if (s0.state === 'granted' && s1.state === 'granted') return 'granted'
    if (s0.state === 'denied' || s1.state === 'denied') return 'denied'
  } catch (e) {
    return 'prompt'
  }
  return 'prompt'
}

// 请求设备访问权限，并发出提示
export async function requestAccessPermissionsAndTip(tip, fail){
  const tipCheckTime = 1000
  let result

  const state = await Promise.race([checkAccess().catch(() => ''), wait(100)])
  if (state === 'denied') {
    fail && fail()
    return
  }
  else if (state === 'granted') {
    return requestAccessPermissions()
  }

  // 在获取权限未操作完成时，进行提示
  wait(tipCheckTime).then(async function (){
    if (result) return
    const state = await Promise.race([checkAccess(), wait(100)])
    if (state === 'prompt') {
      tip && tip()
    }
  })

  return requestAccessPermissions().then(function (r){
    result = true
    return Promise.resolve(r)
  }, function (r){
    result = true
    fail && fail()
    return Promise.reject(r)
  })
}


export function uuid4cb(){
  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function uuid4(){
  const crypto = crypto || msCrypto

  if (!(crypto === void 0) && crypto.getRandomValues) {
    let arr
    try {
      arr = new Uint16Array(8)
      crypto.getRandomValues(arr)
    } catch (e) {
      return uuid4cb()
    }
    // eslint-disable-next-line no-bitwise
    arr[3] = (arr[3] & 0xfff) | 0x4000
    // eslint-disable-next-line no-bitwise
    arr[4] = (arr[4] & 0x3fff) | 0x8000

    const pad = (num) => {
      let v = num.toString(16)
      while (v.length < 4) {
        v = `0${v}`
      }
      return v
    }

    return (
      pad(arr[0]) + pad(arr[1]) + pad(arr[2]) + pad(arr[3]) + pad(arr[4]) + pad(arr[5]) + pad(arr[6]) + pad(arr[7])
    )
  }

  return uuid4cb()
}

export function docCreateUUID(prefix){
  let d = new Date().getTime()
  const uuid = 'xxxxxxx'.replace(/[xy]/g, function (c){
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
  return `${prefix}-${uuid}`
}

export function pageIsReload(){
  if (typeof performance === 'undefined') return
  const t = performance.getEntriesByType('navigation')[0]
  if (t && t.type === 'reload') return true
  return performance.navigation.type === 1
}

export function secToTimeString(time){
  if (time <= 0) return ''
  time = Math.trunc(time / 1000)
  const h = Math.trunc(time / 3600)
  const arr = []
  arr.push(h.toString().padStart(2, '0'))
  time -= h * 3600
  const m = Math.trunc(time / 60)
  arr.push(m.toString().padStart(2, '0'))
  time -= m * 60
  arr.push(time.toString().padStart(2, '0'))
  return arr.join(':')
}

export function safeParse(data) {
  try {
    return JSON.parse(data)
  } catch (e) {
    return null
  }
}

export function isScreenShareSupported() {
  return !!(navigator.getDisplayMedia || (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia))
}
