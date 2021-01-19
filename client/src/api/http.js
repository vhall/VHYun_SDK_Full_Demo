import axios from 'axios'
import QS from 'qs'
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=utf-8'

axios.interceptors.request.use(
  config => {
    // const token = store.getters.token
    // token && (config.headers['Authorization'] = 'Bearer ' + token)
    return config
  },
  err => {
    return Promise.reject({
      code: -1,
      data: err
    })
  }
)

axios.interceptors.response.use(
  response => {
    if (response.headers['content-type'].includes('text/plain')) {
      return response
    } else if (response.data.code >= 200 && response.data.code < 300) {
      return response.data
    } else {
      return Promise.reject(response.data)
    }
  },
  err => {
    return Promise.reject({
      code: -2,
      data: err
    })
  }
)

export function get(url, params) {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        params: params
      })
      .then(res => {
        resolve(res.data)
      })
      .catch(err => {
        reject(err.data)
      })
  })
}

export function post(url, params) {
  return new Promise((resolve, reject) => {
    axios
      .post(url, QS.stringify(params))
      .then(res => {
        resolve(res.data)
      })
      .catch(err => {
        reject(err.data)
      })
  })
}
