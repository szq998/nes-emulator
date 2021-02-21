const Machine = require("../scripts/machine.js")


const log = []
const cpuLog = []
const cpuAddrSpaceLog = []
const ppuAddrSpaceLog = []
// let asCPU = new AS.CPUAddrSpace();
// let rom = game.rom.prg //.concat(game.rom.prg);
// asCPU.loadRom(rom);
// let cpu = new CPU(asCPU);
// cpu.reg.pc = 0xc000;
const ROMPATH = "./assets/nestest.nes";
// const ROMPATH = "./assets/BOMBMAN.NES";
const romFile = $file.read(ROMPATH);
const romString = romFile.toString();

const fc = new Machine({
  cpu: cpuLog,
  cpuAddrSpace: cpuAddrSpaceLog,
  ppuAddrSpace: ppuAddrSpaceLog
})
fc.loadRom(romString)
console.log(fc.gameRom.header)


function getMemWithLino(mem, numPad, startLino = 0) {
  const linoed = []

  for (let i = 0; i < mem.length; i++) {
    const byte = mem[i]
    const lino = (i + startLino).toString(16).padStart(numPad, "0")
    if (typeof (byte) === "undefined") {
      linoed.push(`${lino}: undefined`)
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
      data: getMemWithLino(fc.cpuAddrSpace.ram, 3)
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(150)
      make.left.top.equalTo(view.super)
    },

  }
}

function getVRamNameTableList() {
  return {
    type: "list",
    props: {
      id: "vramName",
      data: getMemWithLino(fc.ppuAddrSpace.nameTable, 4, 0x2000)
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(160)
      make.right.top.equalTo(view.super)
    },

  }
}

function getVRamvPaletteList() {
  return {
    type: "list",
    props: {
      id: "vramPalette",
      data: getMemWithLino(fc.ppuAddrSpace.palette, 4, 0x3f00)
    },
    layout: (make, view) => {
      make.height.equalTo(view.super)
      make.width.equalTo(160)
      make.top.equalTo(view.super)
      make.right.equalTo($("vramName").left)
    },

  }
}

function getOperateButton() {
  return {
    type: "button",
    props: {
      id: "operate",
      title: "operate"
    },
    layout: (make, view) => {
      make.size.equalTo($size(110, 40))
      make.centerX.equalTo(view.super)
      make.centerY.equalTo(view.super).offset(-100)
    },
    events: {
      tapped: function (sender) {
        // operate(fc.cpu)
        // fc.work() 
        let num = Number($("operateTimes").text)
        $("operateTimes").blur()

        if (!num) num = 1
        while (num--) {
          operateWithLog()
        }
      }
    }
  }
}

function getOperateTimesInput() {
  return {
    type: "input",
    props: {
      id: "operateTimes",
      type: $kbType.number
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
      make.centerX.equalTo(view.super)
      make.top.equalTo($("vramRef").bottom).offset(30)
    },
    events: {
      tapped: (sender) => {
        if (log.length === 0) return
        console.log(log.slice(sender.info[0], sender.info[1] || undefined).join("\n"))
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
      make.top.equalTo($("printLog").bottom).offset(30)
    },
    events: {
      tapped: function (sender) {
        $input.text({
          text: "test-log.txt",
          handler: function (text) {
            const success = $file.write({
              data: $data({ string: log.join('\n') }),
              path: text
            })
            if (success) {
              $ui.success(`log saved to /${text}`)
            } else {
              $ui.error("save log failed");
            }
          }
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

operateWithLog.lino = 1
function operateWithLog() {
  const to16pad4 = num => num.toString(16).toUpperCase().padStart(4, "0")
  const to16pad2 = num => num.toString(16).toUpperCase().padStart(2, "0")

  const reg = fc.cpu.reg
  const flagByte = fc.cpu.flags2byte()
  // record reg
  const currLogLine = []

  currLogLine.push(
    `${operateWithLog.lino++} PC:${to16pad4(reg.pc)} A:${to16pad2(reg.a)} X:${to16pad2(reg.x)} Y:${to16pad2(reg.y)} P:${to16pad2(flagByte)} SP:${to16pad2(reg.s)}`
  )

  fc.cpu.operate()

  currLogLine.push(cpuLog.pop())
  currLogLine.push(cpuAddrSpaceLog.splice(0).join(" "))
  currLogLine.push(ppuAddrSpaceLog.splice(0).join(" "))
  log.push(currLogLine.join("\t"))
}

function nesTest() {
  $ui.render({
    views: [
      getRamList(),
      getVRamNameTableList(),
      getVRamvPaletteList(),

      getOperateButton(),
      getOperateTimesInput(),
      getRamRefreshButton(),
      getVRamRefreshButton(),
      getPrintLogButton(),
      getSaveLogButton(),

      getSetVBlankButton(),
      getClearVBlankButton(),
    ]
  })

}

module.exports = nesTest
