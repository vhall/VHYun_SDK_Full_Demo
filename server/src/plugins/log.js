'use strict'
const syslog = require('syslog-client')
const _ = require('lodash')
const internals = {}
internals._log = null
internals.transport = syslog.Transport.Udp
internals.Severity = {
  emergency:     0,
  alert:         1,
  critical:      2,
  error:         3,
  warn:          4,
  assert:        4,
  warning:       4,
  notice:        5,
  info:          6,
  log:           6,
  informational: 6,
  debug:         7,
  trace:         7
}

internals.tagsToLevel = function (tags) {
  let severity = internals._log && internals._log.severity || internals.Severity.info
  if (!tags) return severity
  for (const level of _.keys(internals.Severity)) {
    if (tags[level]) {
      severity = internals.Severity[level]
      break
    }
  }
  return severity
}

internals.logToSyslog = function (event, tags){
  if (!event) return
  if (internals._log) {
    try {
      internals._log.log(JSON.stringify(event), { severity: internals.tagsToLevel(tags) })
    } catch (e) {
      console.error(e)
    }
  }
}

internals.requestToSyslog = function (request, event, tags){
  if (!event) return
  if (internals._log) {
    try {
      const msg = {
        req: _.pick(event.info, ['acceptEncoding', 'completed', 'host', 'hostname', 'id', 'received', 'referrer', 'remoteAddress', 'remotePort', 'responded']),
        state: event.state,
      }
      internals._log.log(JSON.stringify(msg), { severity: internals.tagsToLevel(tags) })
    } catch (e) {
      console.error(e)
    }
  }
}

internals.configSyslog = function (host, port, ident, level) {
  internals._log = new syslog.Client(host, {
    transport: internals.transport,
    port: port,
    // syslogHostname: '',
    facility: syslog.Facility.Local0,
    severity: internals.Severity[level] || internals.Severity.informational,
    rfc3164: true,
    appName: ident,
  })
  internals._log.getTransport(function () {})
  function clear () {
    if (internals._log) internals._log.close()
    internals._log = null
  }
  setTimeout(function () {
    if (internals._log) internals._log.off('error', clear)
  }, 1000)
  internals._log.on('error', clear)

  internals._log.on('error', error => console.error(error))
}

// syslog
exports.plugin = {
  pkg: { name: 'syslog' },
  register: async function (server, settings){
    if (!settings) return
    if (!settings.ident) return

    const ident = settings.ident
    const host = settings.host || 'localhost'
    const port = settings.port || 5232
    const level = (settings.level || 'INFO').toLowerCase()

    try {
      internals.configSyslog(host, port, ident, level)
    } catch (e) {
      console.error('init syslog error: ', e)
    }

    server.events.on('log', internals.logToSyslog)
    server.events.on('request', internals.requestToSyslog)
    // server.events.on('response', internals.requestToSyslog)
  }
}
