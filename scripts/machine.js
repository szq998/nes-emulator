const GameRom = require("./game-rom.js")
const { CPUAddrSpace, PPUAddrSpace } = require("./addr-space.js")
const CPU = require("./cpu.js")
const PPU = require("./ppu.js")

class Machine {
  constructor(logger=null) {
    this.cpuAddrSpace = new CPUAddrSpace(logger && logger.cpuAddrSpace)
    this.ppuAddrSpace = new PPUAddrSpace(logger && logger.ppuAddrSpace)
    this.cpu = new CPU(this.cpuAddrSpace, logger && logger.cpu)
    this.ppu = new PPU(this.ppuAddrSpace, this.cpuAddrSpace.ppuReg, {
      // fake draw api
      drawBgBlock: () => {
        console.log("1")
      }

    })

    this.gameRom
    this.gameLoaded = false

    this.work = this.work.bind(this)
  }

  loadRom(romString) {
    this.gameRom = new GameRom(romString)
    this.cpuAddrSpace.loadRom(this.gameRom.prgRom)
    this.ppuAddrSpace.loadRom(this.gameRom.chrRom)
    this.cpu.interrupt("reset")
    // this.cpu.reg.pc = 0xc000

    this.gameLoaded = true
  }

  setVBlank() {
    this.ppu.setVBlank(() => {
      this.cpu.interrupt("nmi")
      console.log("cpu in nmi")
    })
  }

  clearVBlank() {
    this.ppu.clearVBlank()
  }

  work() {
    if (!this.gameLoaded) throw "Machine started without game loaded."
    // Todo: 
    // this.ppu.clearVBlank()

    // for (let i = 0; i < 100; i++) {
    //   this.cpu.operate()
    // }

    // this.ppu.setVBlank(() => {
    //   this.cpu.interrupt("nmi")
    //   console.log("cpu in nmi")
    // })
  }
}


module.exports = Machine