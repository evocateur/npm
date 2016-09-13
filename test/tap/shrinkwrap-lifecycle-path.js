'use strict'
var fs = require('graceful-fs')
var path = require('path')
var test = require('tap').test
var Tacks = require('tacks')
var File = Tacks.File
var Dir = Tacks.Dir
var Symlink = Tacks.Symlink
var common = require('../common-tap.js')
var testdir = path.join(__dirname, path.basename(__filename, '.js'))

var fixture = new Tacks(Dir({
  node_modules: Dir({
    '.bin': Dir({
      'echoPATH': Symlink('../a/bin.js')
    }),
    'a': Dir({
      'bin.js': File('#!/usr/bin/env node\nconsole.log(process.env.PATH)'),
      'package.json': File({
        _requested: {
          rawSpec: 'file:///mods/a'
        },
        name: 'a',
        version: '1.0.0',
        bin: {
          'echoPATH': './bin.js'
        }
      })
    })
  }),
  scripts: Dir({
    echoCWD: File('#!/usr/bin/env node\nconsole.log(process.cwd())')
  }),
  'package.json': File({
    name: 'shrinkwrap-lifecycle-path',
    version: '1.0.0',
    scripts: {
      preshrinkwrap: './scripts/echoCWD',
      shrinkwrap: process.platform === 'win32'
        ? 'echo %CD%; echo %PATH%'
        : 'echo $PWD; echo $PATH',
      postshrinkwrap: 'echoPATH'
    },
    dependencies: {
      'a': 'file:///mods/a'
    }
  })
}))

function setup () {
  cleanup()
  fixture.create(testdir)
  fs.chmodSync(path.resolve(testdir, './node_modules/a/bin.js'), '0755')
  fs.chmodSync(path.resolve(testdir, './scripts/echoCWD'), '0755')
}

function cleanup () {
  fixture.remove(testdir)
}

test('setup', function (t) {
  setup()
  t.done()
})

test('verify CWD and PATH are correct during shrinkwrap lifecycle', function (t) {
  common.npm([
    'shrinkwrap',
    '--loglevel', 'warn'
  ], {
    cwd: testdir
  }, function (err, code, stdout, stderr) {
    if (err) throw err
    t.is(code, 0, 'exited ok')
    t.notOk(stderr, 'no output stderr')
    t.comment(stdout.trim())
    var lines = stdout.trim().toLowerCase().split('\n')

    var expectWorkingDir = testdir.toLowerCase()
    var actualWorkingDir = lines.shift()
    t.contains(actualWorkingDir, expectWorkingDir, 'cwd is package root')

    var expectBinPath = path.resolve(testdir, 'node_modules', '.bin').toLowerCase()
    var actualBinPath = lines.pop()
    t.contains(actualBinPath, expectBinPath, 'path includes local .bin')

    t.done()
  })
})

test('cleanup', function (t) {
  cleanup()
  t.done()
})

