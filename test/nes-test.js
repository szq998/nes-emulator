let CPU = require("../scripts/cpu");
let AS = require("../scripts/addr-space");
let game = require("../scripts/rom-loader");

let log = []

function fill0(str, num) {
  if (str.length < num) {
    let needFill = num - str.length
    while (needFill--) {
      str = "0" + str
    }
  }
  return str
}

function getRamWithLino(ram) {
  let rwl = []
  for (let i = 0; i < ram.length; ++i) {
    let lino = fill0(i.toString(16), 3)
    if (ram[i]) {
      rwl.push(lino + ":   " + fill0(ram[i].toString(16), 2))
    } else {
      rwl.push(lino + ": undifined")
    }
  }
  return rwl
}

function operate(cpu) {
  let line =  // (log.length + 1).toString() + " "
    "PC:" +
    fill0(cpu.reg.pc.toString(16).toUpperCase(), 4) +
    " A:" +
    fill0(cpu.reg.a.toString(16).toUpperCase(), 2) +
    " X:" +
    fill0(cpu.reg.x.toString(16).toUpperCase(), 2) +
    " Y:" +
    fill0(cpu.reg.y.toString(16).toUpperCase(), 2) +
    " P:" +
    fill0(cpu.flags2byte().toString(16).toUpperCase(), 2) +
    " SP:" +
    fill0(cpu.reg.s.toString(16).toUpperCase(), 2)
  console.log((log.length + 1).toString() + " " + line);
  cpu.operate();
  log.push(line)
  //  }
}

function nesTest() {
  let asCPU = new AS.CPUAddrSpace();
  let rom = game.rom.prg.concat(game.rom.prg);
  asCPU.loadRom(rom);
  let cpu = new CPU(asCPU);
  cpu.reg.pc = 0xc000;

  $ui.render({
    views: [
      {
        type: "button",
        props: {
          id: "operate",
          title: "operate"
        },
        layout: (make, view) => {
          make.size.equalTo($size(100, 50))
          make.center.equalTo(view.super)
        },
        events: {
          tapped: function (sender) {
            operate(cpu)
          }
        },
      },
      {
        type: "input",
        props: {
          id: "operateN"
        },
        layout: (make, view) => {
          make.size.equalTo($size(100, 35))
          make.centerX.equalTo(view.super)
          make.top.equalTo($("operate").bottom).offset(40)
        },
        events: {
          returned: function (sender) {
            let num = Number(sender.text)
            while (num--) {
              operate(cpu)
            }
          }
        }
      },
      {
        type: "list",
        props: {
          id: "ram",
          data: getRamWithLino(asCPU.ram)
        },
        layout: (make, view) => {
          make.height.equalTo(view.super)
          make.width.equalTo(150)
          make.left.top.equalTo(view.super)
        },

      },
      {
        type: "button",
        props: {
          id: "rfRam",
          title: "refresh ram"
        },
        layout: (make, view) => {
          make.size.equalTo($size(100, 40))
          make.centerX.equalTo(view.super)
          make.top.equalTo($("operateN").bottom).offset(40)
        },
        events: {
          tapped: function (sender) {
            $("ram").data = getRamWithLino(asCPU.ram)
          }
        },
      },
      {
        type: "button",
        props: {
          id: "saveBtn",
          title: "save log"
        },
        layout: (make, view) => {
          make.size.equalTo($size(100, 40))
          make.centerX.equalTo(view.super)
          make.top.equalTo($("rfRam").bottom).offset(40)
        },
        events: {
          tapped: function (sender) {
            let logPath = "test_log.log"
            let logStr = log.join('\n')
            let success = $file.write({
              data: $data({ string: logStr }),
              path: logPath
            });
            console.log("save log " + success)
          }
        },
      }
    ]
  })

}

module.exports = nesTest;
