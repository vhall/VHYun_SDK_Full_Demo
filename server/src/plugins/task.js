'use strict'
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')
const schedule = require('node-schedule')
const _ = require('lodash')
const internals = {}

const TASKS = new Map()
const jobs = new Map()

internals.registerTask = function (server, options) {
  const basePath = path.join(__dirname, '../tasks')
  let dirents
  try {
    dirents = fs.readdirSync(basePath, { encoding: "utf8", withFileTypes: true })
  } catch (e) {
    server.log('warn', 'registerTask read dir error: ' + e.message)
    return
  }
  for (const dirent of dirents) {
    if (!(dirent.isFile() || dirent.isSymbolicLink() )) continue
    const p = path.parse(dirent.name)
    if (p.ext !== '.js') continue
    try {
      const task = require(path.join(basePath, dirent.name))(server, options)
      if (task) TASKS.set(p.name, task)
    } catch (e) {
      console.error(e)
    }
  }
}

internals.getTask = function (id) {
  return jobs.get(id)
}

// 取消定时任务
internals.cancelTask = function (id) {
  const t = jobs.get(id)
  jobs.delete(id)
  if (!t) return
  t.cancel()
}

// 添加定时任务
internals.addTask = function (id, name, opt, params) {
  const $id = id || (name + uuid.v4())
  const task = TASKS.get(name)
  if (!task) return console.error('task not found: ' + $id + name)

  const done = () => internals.cancelTask($id)
  const job = schedule.scheduleJob(opt, function () {
    try {
      task(done, params)
    } catch (e) {
      done()
    }
  })
  job.on('canceled', () => done())
  job.on('run', () => !job.nextInvocation() && done())
  if (job) jobs.set($id, job)
}

exports.plugin = {
  pkg: {name: 'task-mangle'},
  register: async function (server, options) {
    await internals.registerTask(server, options)
    server.method('task.addTask', internals.addTask, {})
    server.method('task.cancelTask', internals.cancelTask, {})
  }
}
