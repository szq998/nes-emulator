const Machine = require("../scripts/machine.js")

const log = []
let printWhenSaved = []
const cpuLog = []
const cpuAddrSpaceLog = []
const ppuAddrSpaceLog = []
const oamAddrSpaceLog = []

let renderCavOc
let autoVB = true
let autoRd = true

const logger = {
  cpu: cpuLog,
  cpuAddrSpace: cpuAddrSpaceLog,
  ppuAddrSpace: ppuAddrSpaceLog,
  oamAddrSpace: oamAddrSpaceLog
}
const fc = new Machine(logger)

function operateBtnTapped(times) {
  if (autoVB) {
    fc.setVBlank()
  }

  const cpuTimeStart = Date.now()
  let ppuTimeStart
  if (logger.cpu.doLog) {
    while (times--) {
      operateWithLog()
    }
  } else {
    while (times--) {
      fc.cpu.operate()
      operateWithLog.lino++
    }
  }
  const cpuTime = Date.now() - cpuTimeStart
  let ppuTime = null
  if (autoRd) {
    ppuTimeStart = Date.now()
    fc.ppu.render()
    renderCavOc.$setNeedsDisplay()
    ppuTime = Date.now() - ppuTimeStart
  }
  console.log(`#${operateWithLog.lino - 1} cpu time: ${cpuTime}, ppu time: ${ppuTime}`)
}

function resetLog() {
  if ($("doLog").on) {
    saveLog()
  }
  saveLog.dirname = null
  operateWithLog.lino = 0
}

function saveLog() {
  if (log.length === 0) return

  if (!saveLog.dirname) {
    const romName = $("romPicker").data[0]
    saveLog.dirname = `log/${romName.toUpperCase()}-${Date()}`
    $file.mkdir(saveLog.dirname);
  }

  const filename = `${saveLog.dirname}/${operateWithLog.lino - 1}.log`

  const success = $file.write({
    data: $data({ string: log.join('\n\n\n') }),
    path: filename
  })
  if (success) {
    $ui.success(`log appended to /${filename}`)
    printWhenSaved = log.splice(-1000)
    log.splice(0)
  } else {
    $ui.error("save log failed");
  }
}

const to16pad4 = num => isNaN(num) ? num : num.toString(16).toUpperCase().padStart(4, "0")
const to16pad2 = num => isNaN(num) ? num : num.toString(16).toUpperCase().padStart(2, "0")
function operateWithLog() {
  const MAXUNSAVED = 100000
  if (log.length > MAXUNSAVED) {
    saveLog()
  }

  const currLogLine = []
  // record cpu reg
  const cReg = fc.cpu.reg
  const flagByte = fc.cpu.flags2byte()
  try {
    currLogLine.push(
      `${operateWithLog.lino++} ` +
      `PC:${to16pad4(cReg.pc)} ` +
      `A:${to16pad2(cReg.a)} ` +
      `X:${to16pad2(cReg.x)} ` +
      `Y:${to16pad2(cReg.y)} ` +
      `P:${to16pad2(flagByte)} ` +
      `SP:${to16pad2(cReg.s)}`
    )
  } catch (e) {
    console.log(cReg)
    console.log(flagByte)
    throw e
  }
  // record ppu reg
  const ppu = fc.ppu
  const pireg = fc.ppu.ireg
  const oamPointer = ppu.oamPointer
  const bufferedByte = ppu.bufferedByte
  const pReg = fc.cpuAddrSpace.ppuReg.innerBytes
  try {
    currLogLine.push(
      `v:${to16pad4(pireg.v)} ` +
      `t:${to16pad4(pireg.t)} ` +
      `x:${to16pad2(pireg.x)} ` +
      `w:${pireg.w} ` +
      `oamPointer:${to16pad2(oamPointer)} ` +
      `bufferedByte:${to16pad2(bufferedByte)}\n\t` +
      `0PPUCTRL:${to16pad2(pReg[0])} ` +
      `1PPUMASK:${to16pad2(pReg[1])} ` +
      `2PPUSTATUS:${to16pad2(pReg[2])} ` +
      `3OAMADDR:${to16pad2(pReg[3])} ` +
      `4OAMDATA:${to16pad2(pReg[4])} ` +
      `5PPUSCROLL:${to16pad2(pReg[5])} ` +
      `6PPUADDR:${to16pad2(pReg[6])} ` +
      `7PPUDATA:${isNaN(pReg[7]) ? pReg[7] : to16pad2(pReg[7])} ` +
      `14OAMDMA:${to16pad2(pReg[8])} `

    )
  } catch (e) {
    console.log(pReg)
    throw e
  }

  let err = null
  try {
    fc.cpu.operate()
  } catch (e) {
    err = e
    currLogLine[0] = "error: \"" + e + "\"\n" + currLogLine[0]
  }
  currLogLine.push(cpuLog.splice(0).join("  "))
  oamAddrSpaceLog.length && currLogLine.push(oamAddrSpaceLog.splice(0).join("\n\t"))
  cpuAddrSpaceLog.length && currLogLine.push(cpuAddrSpaceLog.splice(0).join("\n\t"))
  ppuAddrSpaceLog.length && currLogLine.push(ppuAddrSpaceLog.splice(0).join("\n\t"))
  log.push(currLogLine.join("\n\n\t"))
  if (err !== null) throw err
}
operateWithLog.lino = 1


function getMemWithLino(mem, numPad, startLino = 0) {
  const linoed = []

  for (let i = 0; i < mem.length; i++) {
    const byte = mem[i]
    const lino = (i + startLino).toString(16).padStart(numPad, "0")
    if (typeof byte === "undefined") {
      linoed.push(`${lino}:`)
    } else {
      linoed.push(`${lino}: ${byte.toString(16).padStart(2, "0")}`)
    }
  }
  return linoed
}

function getRamList() {
  return {
    type: "list",
    props: {
      id: "ram",
      data: getMemWithLino(fc.cpuAddrSpace.ram, 3),
      header: {
        type: "label",
        props: {
          height: 20,
          text: "RAM",
          textColor: $color("#AAAAAA"),
          align: $align.center,
          font: $font(12)
        }
      }
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(110)
      make.left.top.equalTo(view.super)
    },

  }
}

function getVRamNameTableList() {
  return {
    type: "list",
    props: {
      id: "vramName",
      data: getMemWithLino(fc.ppuAddrSpace.nameTable, 4, 0x2000),
      header: {
        type: "label",
        props: {
          height: 20,
          text: "VRAM",
          textColor: $color("#AAAAAA"),
          align: $align.center,
          font: $font(12)
        }
      }
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(110)
      make.right.top.equalTo(view.super)
    },

  }
}

function getVRamvPaletteList() {
  return {
    type: "list",
    props: {
      id: "vramPalette",
      data: getMemWithLino(fc.ppuAddrSpace.palette, 4, 0x3f00),
      header: {
        type: "label",
        props: {
          height: 20,
          text: "Palette",
          textColor: $color("#AAAAAA"),
          align: $align.center,
          font: $font(12)
        }
      }
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(110)
      make.top.equalTo(view.super)
      make.right.equalTo($("vramName").left)
    },

  }
}

function getOAMList() {
  return {
    type: "list",
    props: {
      id: "oam",
      data: getMemWithLino(fc.oamAddrSpace.mem, 2),
      header: {
        type: "label",
        props: {
          height: 20,
          text: "OAM",
          textColor: $color("#AAAAAA"),
          align: $align.center,
          font: $font(12)
        }
      }
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(110)
      make.top.equalTo(view.super)
      make.left.equalTo($("ram").right)
    },

  }
}

function getOperateButton() {
  let keepOperating = false
  return {
    type: "button",
    props: {
      id: "operate",
      title: "operate"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo(view.super)
      make.centerY.equalTo(view.super).offset(100)
    },
    events: {
      tapped: sender => {
        if (keepOperating) {
          keepOperating = false
          sender.title = "opearte"
          return
        }
        let num = Number($("operateTimes").text)
        $("operateTimes").blur()
        $cache.setAsync({ key: "opTimes", value: num })
        if (!num) { num = 1 }

        operateBtnTapped(num)
      }, // tapped
      longPressed: info => {
        info.sender.title = "opearting..."
        keepOperating = true

        let num = Number($("operateTimes").text)
        $("operateTimes").blur()
        $cache.setAsync({ key: "opTimes", value: num })
        if (!num || num < 1000) { num = 1000 }

        (function longOperate() {
          try {
            operateBtnTapped(num)
          } catch (e) {
            // info.sender.title = "operate"
            // throw e
            console.error(e)
          }
          keepOperating && setTimeout(longOperate, 0)
        })()
      } // longPressed
    } // events
  }
}

function getOperateTimesInput() {
  return {
    type: "input",
    props: {
      id: "operateTimes",
      type: $kbType.number,
      text: $cache.get("opTimes")
    },
    layout: (make, view) => {
      make.size.equalTo($size(100, 35))
      make.centerY.equalTo($("operate"))
      make.right.equalTo($("operate").left).offset(-20)
    }
  }
}

function getRamRefreshButton() {
  return {
    type: "button",
    props: {
      id: "ramRef",
      title: "check RAM"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo(view.super)
      make.top.equalTo($("operateTimes").bottom).offset(30)
    },
    events: {
      tapped: function (sender) {
        $("ram").data = getMemWithLino(fc.cpuAddrSpace.ram, 3)
      }
    },
  }
}

function getVRamRefreshButton() {
  return {
    type: "button",
    props: {
      id: "vramRef",
      title: "check VRAM"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo(view.super)
      make.top.equalTo($("ramRef").bottom).offset(30)
    },
    events: {
      tapped: function (sender) {
        $("vramName").data = getMemWithLino(fc.ppuAddrSpace.nameTable, 4, 0x2000)
        $("vramPalette").data = getMemWithLino(fc.ppuAddrSpace.palette, 4, 0x3f00)
        $("oam").data = getMemWithLino(fc.oamAddrSpace.mem, 2)
      }
    },
  }
}

function getPrintLogButton() {
  return {
    type: "button",
    props: {
      id: "printLog",
      title: "print log",
      info: [-10, undefined],
      menu: {
        title: "set print index",
        items: [
          {
            title: "start",
            handler: sender => {
              $input.text({
                type: $kbType.number,
                placeholder: "start",
                text: sender.info[0],
                handler: function (text) {
                  if (isNaN(Number(text))) return
                  sender.info = [Number(text), sender.info[1]]
                }
              });
            }
          },
          {
            title: "end",
            handler: sender => {
              $input.text({
                type: $kbType.number,
                placeholder: "end",
                text: sender.info[1],
                handler: function (text) {
                  sender.info = [sender.info[0], Number(text) || undefined]
                }
              });
            }
          }
        ]
      }
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.top.equalTo($("saveLog"))
      make.left.equalTo($("saveLog").right).offset(20)
    },
    events: {
      tapped: (sender) => {
        let forPrint
        if (log.length < 1000) {
          forPrint = printWhenSaved.concat(log)
        } else {
          forPrint = log
        }

        if (forPrint.length === 0) return
        for (const line of forPrint.slice(sender.info[0], sender.info[1] || undefined)) {
          console.log(line)
        }
      }
    }
  }
}

function getSaveLogButton() {
  return {
    type: "button",
    props: {
      id: "saveLog",
      title: "save log"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo(view.super)
      make.top.equalTo($("vramRef").bottom).offset(30)
    },
    events: {
      tapped: saveLog
    }
  }
}

function getLogToggle() {
  return {
    type: "switch",
    props: {
      id: "doLog",
      on: false
    },
    layout: (make, view) => {
      make.centerY.equalTo($("saveLog"))
      make.right.equalTo($("saveLog").left).offset(-20)

    },
    events: {
      changed: sender => {
        switch (sender.on) {
          case true:
            for (const p in logger) {
              logger[p].doLog = true
            }
            break
          case false:
            for (const p in logger) {
              logger[p].doLog = false
            }
            break
        }
      }
    }
  }
}

function getRomSelector() {
  const romDir = "assets"
  const nesFiles = $file.list(romDir).filter(fn => fn.toLowerCase().endsWith(".nes"))
  nesFiles.sort((a, b) => a.toLowerCase().charCodeAt() - b.toLowerCase().charCodeAt())

  const lastRom = $cache.get("lastRom")
  // move the last selected one to first
  lastRom && nesFiles.indexOf(lastRom) != -1 && nesFiles.unshift(nesFiles.splice(nesFiles.indexOf(lastRom), 1)[0])


  const romName = nesFiles[0]
  const romFile = $file.read(`${romDir}/${romName}`);
  const romString = romFile.toString();
  fc.loadRom(romString)
  console.log(fc.gameRom.header)

  return {
    type: "picker",
    props: {
      id: "romPicker",
      items: [nesFiles]
    },
    layout: (make, view) => {
      make.top.equalTo($("operateTimes").bottom).offset(0)
      make.right.equalTo($("operateTimes"))
      make.size.equalTo($size(200, 170))
    },
    events: {
      changed: sender => {
        resetLog()
        const romName = sender.data[0]
        const romFile = $file.read(`${romDir}/${romName}`);
        const romString = romFile.toString();
        fc.loadRom(romString)
        console.log(fc.gameRom.header)
        $ui.success(`rom "${romName}" selected`)

        $cache.setAsync({
          key: "lastRom",
          value: romName
        })
      }
    }
  }
}

function getSetVBlankButton() {
  return {
    type: "button",
    props: {
      id: "setVB",
      title: "set VBlank"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerY.equalTo($("operate"))
      make.left.equalTo($("operate").right).offset(20)
    },
    events: {
      tapped: function (sender) {
        fc.setVBlank()
      }
    },
  }
}

function getClearVBlankButton() {
  return {
    type: "button",
    props: {
      id: "clrVB",
      title: "clear VBlank"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo($("setVB"))
      make.top.equalTo($("ramRef"))
    },
    events: {
      tapped: function (sender) {
        fc.clearVBlank()
      }
    },
  }
}

function getVBlankToggle() {
  return {
    type: "switch",
    props: {
      id: "autoVB",
      on: autoVB
    },
    layout: (make, view) => {
      make.centerY.equalTo($("setVB"))
      make.left.equalTo($("setVB").right).offset(20)
    },
    events: {
      changed: sender => {
        autoVB = sender.on
      }
    }
  }
}

function getRenderCanvas() {
  return {
    type: "canvas",
    props: {
      id: "renderCavs",
    },
    layout: (make, view) => {
      make.size.equalTo($size(256, 240))
      make.centerX.equalTo(view.super).offset(43)
      make.top.equalTo(view.super).offset(60)
    },
    events: {
      ready: sender => {
        sender.scale(1.5)
        renderCavOc = sender.ocValue()
      },
      draw: (view, ctx) => {
        const img = $image($data({ byteArray: fc.bitmap.bmp }))
        ctx.drawImage($rect(0, 0, fc.bitmap.width, fc.bitmap.height), img)
      }
    }
  }
}

function getRenderButton() {
  return {
    type: "button",
    props: {
      id: "renderBtn",
      title: "render"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.top.equalTo($("vramRef"))
      make.left.equalTo($("vramRef").right).offset(20)
    },
    events: {
      tapped: function (sender) {
        fc.ppu.render()
        renderCavOc.$setNeedsDisplay()
      }
    },
  }
}

function getRenderToggle() {
  return {
    type: "switch",
    props: {
      id: "autoRd",
      on: true
    },
    layout: (make, view) => {
      make.centerY.equalTo($("renderBtn"))
      make.left.equalTo($("renderBtn").right).offset(20)
    },
    events: {
      changed: sender => {
        autoRd = sender.on
      }
    }
  }
}

function getControllerBtn(name, layout) {
  return {
    type: "button",
    props: {
      id: `${name}Key`,
      title: name.toUpperCase()
    },
    layout: layout,
    events: {
      touchesBegan: () => fc.controllerPressed(0, name),
      touchesEnded: () => fc.controllerReleased(0, name)
    }
  }
}

function controllerBtnPressWithAutoRelease(key, time = 40) {
  fc.controllerPressed(0, key)
  setTimeout(() => fc.controllerReleased(0, key), time)
}

function getKeyCommands() {
  const key2key = {
    "w": "up",
    "a": "left",
    "s": "down",
    "d": "right",
    "f": "select",
    "h": "start",
    "j": "b",
    "k": "a"
  }

  const keyCommands = []
  for (const key in key2key) {
    keyCommands.push({
      input: key,
      handler: () => controllerBtnPressWithAutoRelease(key2key[key])
    })
  }
  return keyCommands
}

function nesTest() {
  $ui.render({
    props: {
      title: "Nes Test",
      keyCommands: getKeyCommands()
    },
    views: [
      getRamList(),
      getVRamNameTableList(),
      getVRamvPaletteList(),
      getOAMList(),

      getOperateButton(),
      getOperateTimesInput(),
      getRamRefreshButton(),
      getVRamRefreshButton(),

      getSaveLogButton(),
      getPrintLogButton(),
      getLogToggle(),

      getRomSelector(),

      getSetVBlankButton(),
      getClearVBlankButton(),
      getVBlankToggle(),

      getRenderButton(),
      getRenderCanvas(),
      getRenderToggle(),

      getControllerBtn("right", (make, view) => {
        make.size.equalTo($size(55, 50))
        make.right.equalTo($("renderCavs").left).offset(-64 - 10)
        make.bottom.equalTo($("renderCavs")).offset(60 - 15)
      }),
      getControllerBtn("up", (make, view) => {
        make.size.equalTo(view.prev)
        make.right.equalTo(view.prev.left)
        make.bottom.equalTo(view.prev.top)
      }),
      getControllerBtn("down", (make, view) => {
        make.size.equalTo(view.prev)
        make.right.equalTo(view.prev)
        make.top.equalTo(view.prev.prev.bottom)
      }),
      getControllerBtn("left", (make, view) => {
        make.size.equalTo(view.prev)
        make.right.equalTo(view.prev.left)
        make.bottom.equalTo(view.prev.top)
      }),
      getControllerBtn("select", (make, view) => {
        make.size.equalTo($size(80, 50))
        make.top.equalTo($("renderCavs").bottom).offset(60 + 10)
        make.centerX.equalTo($("renderCavs")).offset(-50)
      }),
      getControllerBtn("start", (make, view) => {
        make.size.equalTo(view.prev)
        make.top.equalTo(view.prev)
        make.centerX.equalTo($("renderCavs")).offset(50)
      }),
      getControllerBtn("a", (make, view) => {
        make.size.equalTo(view.prev)
        make.left.equalTo($("renderCavs").right).offset(64 + 10)
        make.centerY.equalTo($("rightKey")).offset(-30)
      }),
      getControllerBtn("b", (make, view) => {
        make.size.equalTo(view.prev)
        make.left.equalTo(view.prev)
        make.centerY.equalTo($("rightKey")).offset(30)
      })
    ]
  })

}

// expose to REPL
test = {
  fc: fc,
  logger: logger,
  getRdoc: () => renderCavOc
}

module.exports = nesTest