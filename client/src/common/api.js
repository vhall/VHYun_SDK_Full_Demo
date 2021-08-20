import axios from 'axios'
import { API_BASE } from '@/common/config'

async function _request_post(path, body){
  let res
  const params = { token: window.token || '' }
  const withCredentials = true
  try {
    res = await axios({ method: 'post', baseURL: API_BASE, url: path, params, withCredentials, data: body, timeout: 20000, json: true })
  } catch (e) {
    if (!e.response?.data?.statusCode) {
      throw e
    }
    res = e.response
  }
  if (res.data.statusCode !== 200) {
    const err = new Error(res.data.message || res.data.msg)
    err.resp = res
    throw err
  }
  return res.data
}

async function _request_get(path, params){
  let res
  params = Object.assign({}, params, { token: window.token || '' })
  const withCredentials = true
  try {
    res = await axios({ method: 'get', baseURL: API_BASE, url: path, withCredentials, timeout: 15000, params: params })
  } catch (e) {
    if (!e.response?.data?.statusCode) {
      throw e
    }
    res = e.response
  }
  if (res.data.statusCode !== 200) {
    const err = new Error(res.data.message || res.data.msg)
    err.resp = res
    throw err
  }
  return res.data
}

export const roomReport = () => {}

export const roomApi = {
  async create(type, title, nickName, identity){
    const rs = await _request_post('/api/v1/room/create', { type, title, nickName, identity })
    return rs.data
  },
  async reopen(roomId, title){
    const rs = await _request_post('/api/v1/room/reopen', { roomId, title })
    return rs.data
  },
  async enter(roomId, nickName, identity){
    const rs = await _request_post('/api/v1/room/enter', { roomId, nickName, identity })
    return rs.data
  },
  async vod(roomId, nickName){
    const rs = await _request_post('/api/v1/room/vod', { roomId, nickName })
    return rs.data
  },
  async info(title, roomId) {
    const res = await _request_get('/api/v1/room/info', { title, roomId, isVod: '' })
    return res.data
  },
  async infoVod(title, roomId) {
    const res = await _request_get('/api/v1/room/info', { title, roomId, isVod: 1 })
    return res.data
  },
  async login(nickName) {
    const res = await _request_post('/api/v1/room/login', { nickName })
    return res.data
  },
  // 旁路
  async another(roomId, open, maxScreenStream, time, layout) {
    const rs = await _request_post('/api/v1/room/another', { roomId, open, maxScreenStream, layout, time })
    return rs.data
  },
  // 关闭旁路 (unload专用)
  async unload(roomId, open, maxScreenStream, time, layout) {
    const rs = await _request_post('/api/v1/room/unload', { roomId, open, maxScreenStream, layout, time })
    return rs.data
  },
  async checkLivein(roomId) {
    const rs = await _request_get('/api/v1/room/checkLivein', { roomId })
    return rs.data
  },
  report(roomId, body) {
    let data = body
    if (body instanceof Error) {
      data = `Error: ${e.message} ${e.stack}`
    }
    else if (typeof body !== 'string') {
      try {
        data = JSON.stringify(body)
      } catch (e) { /**/ }
    }
    if (typeof body !== 'string') data = typeof body
    _request_post('/api/v1/log/rm', { roomId, data }).catch(e => null)
  },
}

export const rsApi = {
  docCreateUrl(roomId){
    return `${API_BASE}/api/v1/doc/create?roomId=${roomId}&token=${window.token || ''}`
  },

  lookupAnswer(roomId, id, formId) {
    return `${API_BASE}/api/v1/form/result?roomId=${roomId}&id=${id}&formId=${formId}&token=${window.token || ''}`
  },

  previewUrl(path){
    return `${API_BASE}${path}`
  },

  // 文档列表
  async docList(roomId, page = 1, limit = 20){
    return await _request_get('/api/v1/doc/list', { roomId, limit, page })
  },

  // 表单列表
  async formList(roomId, page = 1, limit = 20){
    return await _request_get('/api/v1/form/list', { roomId, limit, page })
  },

  // 创建表单
  async formCreate(roomId, body){
    return await _request_post('/api/v1/form/create', { roomId, ...body })
  },

  // 更新表单
  async formUpdate(roomId, id, body){
    return await _request_post('/api/v1/form/update', { roomId, $id: id, ...body })
  },

  // 表单
  async formFetch(roomId, id, formId){
    const rs = await _request_get('/api/v1/form/fetch', { roomId, id, formId })
    return rs.data
  }
}

export const inavApi = {
  roomId: null,

  // 申请上麦
  async request(){
    const rs = await _request_post('/api/v1/inav/apply', { roomId: this.roomId })
    return rs.data
  },

  // 申请上麦同意/拒绝
  async requestCallbackAgree(targetId){
    const rs = await _request_post('/api/v1/inav/agreeApply', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 申请上麦同意/拒绝
  async requestCallbackReject(targetId){
    const rs = await _request_post('/api/v1/inav/rejectApply', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 邀请上麦
  async inviter(targetId){
    const rs = await _request_post('/api/v1/inav/invite', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 邀请上麦同意
  async inviterCallbackAgree(status){
    const rs = await _request_post('/api/v1/inav/agreeInvite', { roomId: this.roomId, status })
    return rs.data
  },

  // 邀请上麦拒绝
  async inviterCallbackReject(status){
    const rs = await _request_post('/api/v1/inav/rejectInvite', { roomId: this.roomId, status })
    return rs.data
  },

  // 关闭/开启 麦克风/摄像头
  async handleDevice(targetId, device, close){
    const rs = await _request_post('/api/v1/inav/handleDevice', { roomId: this.roomId, targetId, device, close })
    return rs.data
  },

  // 下麦（管理）
  async down(targetId){
    const rs = await _request_post('/api/v1/inav/down', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 下麦
  async inavDownCall(){
    const rs = await _request_post('/api/v1/inav/inavDownCall', { roomId: this.roomId })
    return rs.data
  },

  // 踢出房间
  async kick(targetId){
    const rs = await _request_post('/api/v1/inav/kick', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 取消踢出房间
  async unkick(targetId){
    const rs = await _request_post('/api/v1/inav/unkick', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 禁言
  async mute(targetId){
    const rs = await _request_post('/api/v1/inav/mute', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 取消禁言
  async unmute(targetId){
    const rs = await _request_post('/api/v1/inav/unmute', { roomId: this.roomId, targetId })
    return rs.data
  },

  // 全局禁言
  async muteAll(){
    const rs = await _request_post('/api/v1/inav/mute', { roomId: this.roomId, targetId: '' })
    return rs.data
  },

  // 取消全局禁言
  async unmuteAll(){
    const rs = await _request_post('/api/v1/inav/unmute', { roomId: this.roomId, targetId: '' })
    return rs.data
  },

  async sendForm(id, formId){
    const rs = await _request_post('/api/v1/inav/sendForm', { roomId: this.roomId, id, formId })
    return rs.data
  },

  async answerForm(id, formId, client, data){
    const rs = await _request_post('/api/v1/inav/answerForm', { roomId: this.roomId, client, id, formId, data })
    return rs.data
  },

  // 直播间已发布表单
  async formList(){
    const rs = await _request_get('/api/v1/inav/formList', { roomId: this.roomId })
    return rs.data
  },

  // 在线用户数量
  async onlineCount(){
    const rs = await _request_get('/api/v1/inav/onlineCount', { roomId: this.roomId })
    return rs.data.count
  },

  // 被踢出用户列表
  async kickList(){
    return _request_get('/api/v1/inav/kickList', { roomId: this.roomId })
  },

  // 请求上麦用户列表
  async inavList(){
    return _request_get('/api/v1/inav/inavPaddingList', { roomId: this.roomId })
  },

    // 在线用户列表
  async onlineList() {
    return _request_get('/api/v1/inav/onlineList', { roomId: this.roomId })
  },
}
