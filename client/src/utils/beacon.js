
function _fetch (url, data) {
  const opt = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: data,
    withCredentials: true,
    keepalive: true
  }
  window.fetch(url, opt)
}

function _ajax (url, data) {
  let xhr = 'XMLHttpRequest' in this ? new window.XMLHttpRequest( ) : new window.ActiveXObject('Microsoft.XMLHTTP')
  xhr.open('POST', url, false)
  xhr.withCredentials = true
  xhr.setRequestHeader('Accept', '*/*')
  xhr.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
  xhr.send(data)
}

function _beacon (url, data) {
  window.navigator.sendBeacon(url, new Blob([data], {type: 'application/json;charset=utf-8'}))
}

export default function (url, data) {
  const $data = JSON.stringify(data)
  if (window.navigator && window.navigator.sendBeacon) return _beacon(url, $data)
  if (window.fetch) return _fetch(url, $data)
  return _ajax(url, $data)
}
