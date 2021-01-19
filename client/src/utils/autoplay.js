
// eslint-disable-next-line
const h264 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjYwMSBhMGNkN2QzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA3//728P4FNjuZQQAAAu5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAZAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACGHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAZAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAIAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAGQAAAAAAAEAAAAAAZBtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAACgAAAAEAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAE7bWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAA+3N0YmwAAACXc3RzZAAAAAAAAAABAAAAh2F2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAgACAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAxYXZjQwFkAAr/4QAYZ2QACqzZX4iIhAAAAwAEAAADAFA8SJZYAQAGaOvjyyLAAAAAGHN0dHMAAAAAAAAAAQAAAAEAAAQAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAAsUAAAABAAAAFHN0Y28AAAAAAAAAAQAAADAAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU2LjQwLjEwMQ=='

let videoAutoPlayTestResult = null
export const videoAutoPlaySupport = async function videoAutoPlaySupport () {
  if (videoAutoPlayTestResult !== null) return videoAutoPlayTestResult
  if (videoAutoPlayTestResult instanceof Promise) return videoAutoPlayTestResult
  const defaultRet = false
  let timeout
  let waitTime = 200
  let retries = 5
  let currentTry = 0
  let elem = window.document.createElement('video')
  let elemStyle = elem.style
  let resolve
  let ret = new Promise($resolve => resolve = (result) => { videoAutoPlayTestResult = result; $resolve(result) })
  if (videoAutoPlayTestResult === null) videoAutoPlayTestResult = ret

  function testAutoplay(arg) {
    currentTry++
    clearTimeout(timeout)

    let result = arg && arg.type === 'playing' || elem.currentTime !== 0

    if (!result && currentTry < retries) {
      //Detection can be flaky if the browser is slow, so lets retry in a little bit
      timeout = setTimeout(testAutoplay, waitTime)
      return resolve(defaultRet)
    }

    elem.removeEventListener('playing', testAutoplay, false)
    resolve(result)

    // Cleanup, but don't assume elem is still in the page -
    // an extension (eg Flashblock) may already have removed it.
    if (elem.parentNode) {
      elem.parentNode.removeChild(elem)
    }
  }

  //skip the test if video itself, or the autoplay
  //element on it isn't supported
  if (!('autoplay' in elem)) {
    return defaultRet
  }

  elemStyle.position = 'absolute'
  elemStyle.height = '0'
  elemStyle.width = '0'
  elemStyle.left = '-9999px'
  elemStyle.top = '-9999px'

  try {
    elem.src = h264
  } catch (e) {
    return defaultRet
  }

  elem.setAttribute('autoplay', '')
  window.document.documentElement.appendChild(elem)
  // wait for the next tick to add the listener, otherwise the element may
  // not have time to play in high load situations (e.g. the test suite)
  setTimeout(function() {
    elem.addEventListener('playing', testAutoplay, false)
    timeout = setTimeout(testAutoplay, waitTime)
  }, 10000)

  return ret
}

export const videoAutoPlay = async function videoAutoPlay (videoNode, mute) {
  // https://goo.gl/xX8pDD
  if (!videoNode) return
  if (videoNode.tagName !== 'VIDEO') return
  if (await videoAutoPlaySupport()) {
    videoNode.play()
    return
  }

  videoNode.muted = true
  videoNode.autoPlay = true
  videoNode.play()
  if (mute) return

  async function unmuted () {
    videoNode.muted = false
    videoNode.autoPlay = true
    try {
      await videoNode.play()
    } catch (e) {
      videoAutoPlay(videoNode)
    }
    window.removeEventListener('touch', unmuted)
    window.removeEventListener('click', unmuted)
  }
  window.addEventListener('touch', unmuted)
  window.addEventListener('click', unmuted)
}




