const GameRom = require("./game-rom.js")
const { CPUAddrSpace, PPUAddrSpace, OAMAddrSpace } = require("./addr-space.js")
const CPU = require("./cpu.js")
const PPU = require("./ppu.js")
const BitMap8Bit = require("./bitmap.js")

// only for Little Endian!
const fcColorPalette = new Uint32Array([
    0x7F7F7F, 0x2000B0, 0x2800B8, 0x6010A0,
    0x982078, 0xB01030, 0xA03000, 0x784000,
    0x485800, 0x386800, 0x386C00, 0x306040,
    0x305080, 0x000000, 0x000000, 0x000000,

    0xBCBCBC, 0x4060F8, 0x4040FF, 0x9040F0,
    0xD840C0, 0xD84060, 0xE05000, 0xC07000,
    0x888800, 0x50A000, 0x48A810, 0x48A068,
    0x4090C0, 0x000000, 0x000000, 0x000000,

    0xFFFFFF, 0x60A0FF, 0x5080FF, 0xA070FF,
    0xF060FF, 0xFF60B0, 0xFF7830, 0xFFA000,
    0xE8D020, 0x98E800, 0x70F040, 0x70E090,
    0x60D0E0, 0x606060, 0x000000, 0x000000,

    0xFFFFFF, 0x90D0FF, 0xA0B8FF, 0xC0B0FF,
    0xE0B0FF, 0xFFB8E8, 0xFFC8B8, 0xFFD8A0,
    0xFFF090, 0xC8F080, 0xA0F0A0, 0xA0FFC8,
    0xA0FFF0, 0xA0A0A0, 0x000000, 0x000000
])

class Machine {
  constructor(logger = null) {
    this.bitmap = new BitMap8Bit(256, 240, fcColorPalette)
    this.drawCallback = {
      drawBgBlock: this.bitmap.setPixelBlock.bind(this.bitmap),
      pixels: this.bitmap.pixels,
      bmpWidth: this.bitmap.widthWithPad
    }

    this.cpuAddrSpace = new CPUAddrSpace(logger && logger.cpuAddrSpace)
    this.ppuAddrSpace = new PPUAddrSpace(logger && logger.ppuAddrSpace)
    this.oamAddrSpace = new OAMAddrSpace(this .cpuAddrSpace.DMAPort, logger && logger.oamAddrSpace)
    this.cpu = new CPU(this.cpuAddrSpace, logger && logger.cpu)
    this.ppu = new PPU(this.ppuAddrSpace, this.oamAddrSpace, this.cpuAddrSpace.ppuReg, this.drawCallback)

    this.gameRom
    this.gameLoaded = false

    this.work = this.work.bind(this)
  }

  loadRom(romString) {
    this.gameRom = new GameRom(romString)
    this.cpuAddrSpace.loadRom(this.gameRom.prgRom)
    this.ppuAddrSpace.loadRom(this.gameRom.chrRom)
    this.ppuAddrSpace.isFourScreen = this.gameRom.header.isFourScreen
    this.cpu.interrupt("reset")
    // this.cpu.reg.pc = 0xc000

    this.gameLoaded = true
  }

  setVBlank() {
    this.ppu.setVBlank(() => {
      this.cpu.interrupt("nmi")
      // console.log("cpu in nmi")
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