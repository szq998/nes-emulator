class CPU {
  constructor(addrSpace) {
    // memory and other devices in cpu's address space
    this.addrSpace = addrSpace
    // register
    this.reg = {
      a: 0,  // accumulator
      x: 0,  // x index register
      y: 0,  // y index reigister
      s: 0xfd,  // stack pointer
      pc: 0,  // program counter
      flag: {
        c: false,  // carry
        z: false,  // zero
        i: true,  // irq disabled
        d: false,  // decimal mode
        b: false,  // brk
        r: true,  // reversed, always true
        v: false,  // overflow
        s: false,  // sign
      }
    }
    // interrupt
    this.int = {
      reset: false,
      nmi: false,
      irq: false,
      //brk: false
    }
    // interrupt vector
    this.nmiAddr = 0xfffa  // 0xfffa, 0xfffb
    this.resetAddr = 0xfffc  // 0xfffc, 0xfffd
    this.irqAddr = 0xfffe  // 0xfffe, 0xffff

    // clear memory after power-up
    // this.addrSpace.write(0x4015, 0)
    // this.addrSpace.write(0x4017, 0)
    // for (let i = 0x4000; i <= 0x400f; ++i) {
    //   this.addrSpace.write(i, 0)
    // }
    // for (let i = 0x4010; i <= 0x4013; ++i) {
    //   this.addrSpace.write(i, 0)
    // }
  }  // constructor

  // trigger interrupt
  interrupt(name) {
    switch (name) {
      case "reset":
        this.int.reset = true
        break
      case "nmi":
        this.int.nmi = true
        break
      case "irq":
        this.int.irq = true
        break
      default:
        throw "Illegal interrupt name."
    }
  }

  // handle interrupt 
  handleReset() {
    // this.reg.s -= 3
    // this.reg.flag.i = true
    // set pc
    this.reg.pc = this.addrSpace.read(this.resetAddr) | (this.addrSpace.read(this.resetAddr + 1) << 8)
  }
  handleNmi() {
    // push pc
    this.push((this.reg.pc & 0xff00) >> 8)
    this.push(this.reg.pc & 0x00ff)
    // push flag
    this.push(this.flags2byte())
    // disable irq
    this.reg.flag.i = true
    // set pc
    this.reg.pc = this.addrSpace.read(this.nmiAddr) | (this.addrSpace.read(this.nmiAddr + 1) << 8)
  }
  handleIrq() {
    // push pc
    this.push((this.reg.pc & 0xff00) >> 8)
    this.push(this.reg.pc & 0x00ff)
    // push flag
    this.push(this.flags2byte())
    // disable irq
    this.reg.flag.i = true
    // set pc
    this.reg.pc = this.addrSpace.read(this.irqAddr) | (this.addrSpace.read(this.irqAddr + 1) << 8)
  }

  // transformation between byte and flags
  flags2byte() {
    let byte = 0
    byte |= this.reg.flag.c ? 0x01 : 0
    byte |= this.reg.flag.z ? 0x02 : 0
    byte |= this.reg.flag.i ? 0x04 : 0
    byte |= this.reg.flag.d ? 0x08 : 0
    byte |= this.reg.flag.b ? 0x10 : 0
    byte |= this.reg.flag.r ? 0x20 : 0
    byte |= this.reg.flag.v ? 0x40 : 0
    byte |= this.reg.flag.s ? 0x80 : 0
    return byte
  }
  byte2flags(byte) {
    this.reg.flag.c = (byte & 0x01) ? true : false
    this.reg.flag.z = (byte & 0x02) ? true : false
    this.reg.flag.i = (byte & 0x04) ? true : false
    this.reg.flag.d = (byte & 0x08) ? true : false
    this.reg.flag.b = (byte & 0x10) ? true : false
    this.reg.flag.r = (byte & 0x20) ? true : false
    this.reg.flag.v = (byte & 0x40) ? true : false
    this.reg.flag.s = (byte & 0x80) ? true : false
  }

  // stack
  push(byte) {
    this.addrSpace.write(0x0100 + this.reg.s--, byte)
  }
  pop() {
    return this.addrSpace.read(0x0100 + ++this.reg.s)
  }

  // addressing
  // (d, x)
  zeroPageXregIndirect() {
    let addr1 = this.addrSpace.read(this.reg.pc++)
    addr1 += this.reg.x
    addr1 &= 0xff
    let addr2 = this.addrSpace.read(addr1) | (this.addrSpace.read((addr1 + 1) & 0xff) << 8)
    return addr2
  }
  // d
  zeroPageDirect() {
    let addr = this.addrSpace.read(this.reg.pc++)
    return addr
  }
  // #i
  immediate() {
    return this.reg.pc++
  }
  // a
  direct() {
    let addr = this.addrSpace.read(this.reg.pc++)
    addr |= (this.addrSpace.read(this.reg.pc++) << 8)
    return addr
  }
  // (d), y
  zeroPageYregIndirect() {
    let addr1 = this.addrSpace.read(this.reg.pc++)
    let addr2 = this.addrSpace.read(addr1) | (this.addrSpace.read((addr1 + 1) & 0xff) << 8)
    addr2 += this.reg.y
    addr2 &= 0xffff
    return addr2
  }
  // d, x
  zeroPageXregDirect() {
    let addr = this.addrSpace.read(this.reg.pc++)
    addr += this.reg.x
    addr &= 0xff
    return addr
  }
  // d, y
  zeroPageYregDirect() {
    let addr = this.addrSpace.read(this.reg.pc++)
    addr += this.reg.y
    addr &= 0xff
    return addr
  }
  // a, y
  YregDirect() {
    let addr = this.addrSpace.read(this.reg.pc++)
    addr |= (this.addrSpace.read(this.reg.pc++) << 8)
    addr += this.reg.y
    addr &= 0xffff
    return addr
  }
  // a, x
  XregDirect() {
    let addr = this.addrSpace.read(this.reg.pc++)
    addr |= (this.addrSpace.read(this.reg.pc++) << 8)
    addr += this.reg.x
    addr &= 0xffff
    return addr
  }
  // (a)
  indirect() {
    let addr1 = this.addrSpace.read(this.reg.pc++)
    addr1 |= (this.addrSpace.read(this.reg.pc++) << 8)
    // hardware bug!
    let addr2Low = this.addrSpace.read(addr1)
    let addr2High = this.addrSpace.read((addr1 & 0xff00) | ((addr1 + 1) & 0x00ff))
    return addr2Low | (addr2High << 8)
  }
  // *+d
  relative() {
    let offset = this.addrSpace.read(this.reg.pc++)
    // signed
    offset = (offset & 0x80) * -1 | (offset & 0x7f)
    return (this.reg.pc /*without "- 2" !*/ + offset) & 0xffff
  }

  // flags
  checkFlagZS(src) {
    this.reg.flag.z = !src
    this.reg.flag.s = !!(src >> 7)
  }

  // alu
  bit(opd2) {
    let and = this.reg.a & opd2
    this.reg.flag.z = !and
    this.reg.flag.v = !!(opd2 & 0x40)  // bit 6
    this.reg.flag.s = !!(opd2 & 0x80)  // bit 7
  }

  adc(opd2) {
    let opd1 = this.reg.a
    let rawAdd = opd1 + opd2 + (this.reg.flag.c ? 1 : 0)
    this.reg.a = rawAdd & 0xff
    // check z,s flag
    this.checkFlagZS(this.reg.a)
    // check c flag
    this.reg.flag.c = !!(rawAdd >> 8)
    // check v flag
    this.reg.flag.v = !((opd1 ^ opd2) & 0x80) && ((opd1 ^ this.reg.a) & 0x80)
  }

  sbc(opd2) {
    let opd1 = this.reg.a
    let rawSub = opd1 - opd2 - (this.reg.flag.c ? 0 : 1)
    this.reg.a = rawSub & 0xff
    // check z,s flag
    this.checkFlagZS(this.reg.a)
    // check c flag
    this.reg.flag.c = !(rawSub >> 8)
    // check v flag 
    this.reg.flag.v = ((opd1 ^ opd2) & 0x80) && ((opd1 ^ this.reg.a) & 0x80)
  }

  compare(opd1, opd2) {
    let rawSub = opd1 - opd2
    // check z, s flag
    this.checkFlagZS(rawSub & 0xff)
    // check c flag
    this.reg.flag.c = !(rawSub >> 8)
  }

  asl(addr) {
    if (addr) {
      let val = this.addrSpace.read(addr)
      this.reg.flag.c = !!(val & 0x80)
      val = (val << 1) & 0xff
      this.checkFlagZS(val)
      this.addrSpace.write(addr, val)
    } else {
      this.reg.flag.c = !!(this.reg.a & 0x80)
      this.reg.a = (this.reg.a << 1) & 0xff
      this.checkFlagZS(this.reg.a)
    }
  }

  lsr(addr) {
    if (addr) {
      let val = this.addrSpace.read(addr)
      this.reg.flag.c = !!(val & 0x01)
      val = (val >> 1) & 0xff
      this.checkFlagZS(val)
      this.addrSpace.write(addr, val)
    } else {
      this.reg.flag.c = !!(this.reg.a & 0x01)
      this.reg.a = (this.reg.a >> 1) & 0xff
      this.checkFlagZS(this.reg.a)
    }
  }

  rol(addr) {
    if (addr) {
      let val = this.addrSpace.read(addr)
      val <<= 1
      val |= this.reg.flag.c ? 0x01 : 0x00
      this.reg.flag.c = !!(val & 0x100)
      val &= 0xff
      this.checkFlagZS(val)
      this.addrSpace.write(addr, val)
    } else {
      this.reg.a <<= 1
      this.reg.a |= this.reg.flag.c ? 0x01 : 0x00
      this.reg.flag.c = !!(this.reg.a & 0x100)
      this.reg.a &= 0xff
      this.checkFlagZS(this.reg.a)
    }
  }

  ror(addr) {
    if (addr) {
      let val = this.addrSpace.read(addr)
      val |= this.reg.flag.c ? 0x100 : 0x000
      this.reg.flag.c = !!(val & 0x01)
      val >>= 1
      val &= 0xff
      this.checkFlagZS(val)
      this.addrSpace.write(addr, val)
    } else {
      this.reg.a |= this.reg.flag.c ? 0x100 : 0x000
      this.reg.flag.c = !!(this.reg.a & 0x01)
      this.reg.a >>= 1
      this.reg.a &= 0xff
      this.checkFlagZS(this.reg.a)
    }
  }

  dec(addr) {
    let val = this.addrSpace.read(addr)
    val = (val - 1) & 0xff
    this.checkFlagZS(val)
    this.addrSpace.write(addr, val)
  }

  inc(addr) {
    let val = this.addrSpace.read(addr)
    val = (val + 1) & 0xff
    this.checkFlagZS(val)
    this.addrSpace.write(addr, val)
  }

  slo(addr) {
    // asl
    let val = this.addrSpace.read(addr)
    this.reg.flag.c = !!(val & 0x80)
    val = (val << 1) & 0xff
    this.addrSpace.write(addr, val)
    // or
    this.reg.a |= val
    this.checkFlagZS(this.reg.a)
  }

  rla(addr) {
    //rol
    let val = this.addrSpace.read(addr)
    val <<= 1
    val |= this.reg.flag.c ? 0x01 : 0x00
    this.reg.flag.c = !!(val & 0x100)
    val &= 0xff
    this.addrSpace.write(addr, val)
    //and
    this.reg.a &= val
    this.checkFlagZS(this.reg.a)
  }

  sre(addr) {
    // asl
    let val = this.addrSpace.read(addr)
    this.reg.flag.c = !!(val & 0x01)
    val = (val >> 1) & 0xff
    this.addrSpace.write(addr, val)
    // eor
    this.reg.a ^= val
    this.checkFlagZS(this.reg.a)
  }

  rra(addr) {
    // ror
    let val = this.addrSpace.read(addr)
    val |= this.reg.flag.c ? 0x100 : 0x000
    this.reg.flag.c = !!(val & 0x01)
    val >>= 1
    val &= 0xff
    this.addrSpace.write(addr, val)
    //adc
    this.adc(val)
  }

  sax(addr) {
    this.addrSpace.write(addr, this.reg.a & this.reg.x)
  }

  lax(addr) {
    this.reg.x = this.addrSpace.read(addr)
    this.reg.a = this.addrSpace.read(addr)
    this.checkFlagZS(this.reg.a)
  }

  dcp(addr) {
    //dec
    let val = this.addrSpace.read(addr)
    val = (val - 1) & 0xff
    this.addrSpace.write(addr, val)
    // cmp
    this.compare(this.reg.a, val)
  }

  isc(addr) {
    // inc
    let val = this.addrSpace.read(addr)
    val = (val + 1) & 0xff
    this.addrSpace.write(addr, val)
    // sbc
    this.sbc(val)
  }

  // execute
  operate() {
    // handle interrupt
    if (this.int.reset) {
      this.handleReset()
      this.int.reset = false
      return
    } else if (this.int.nmi) {
      this.handleNmi()
      this.int.nmi = false
      return
    } else if (!this.reg.flag.i && this.int.irq) {
      this.handleIrq()
      this.int.irq = false
      return
    }

    // operate
    const instr = this.addrSpace.read(this.reg.pc++);  // read instruction
    let opd1, opd2, addr
    switch (instr) {
      // ctrl 1
      case 0x00:  // brk
        this.reg.pc++
        // push pc
        this.push((this.reg.pc & 0xff00) >> 8)
        this.push(this.reg.pc & 0x00ff)
        // set flag
        this.reg.flag.i = true
        this.reg.flag.b = true
        // push flag
        this.push(this.flags2byte())
        this.pc = this.addrSpace.read(this.irqAddr) | (this.addrSpace.read(this.irqAddr + 1) << 8)
        break
      case 0x04:  // nop d
        this.zeroPageDirect()
        break
      case 0x08:  // php
        this.push(this.flags2byte() | 0x20 /*r*/ | 0x10/*b*/)
        break
      case 0x0c:  // nop a
        this.direct()
        break
      case 0x10:  // bpl *+d
        addr = this.relative()
        if (!this.reg.flag.s) {
          this.reg.pc = addr
        }
        break
      case 0x14:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0x18:  // clc
        this.reg.flag.c = false
        break
      case 0x1c:  // nop a, x
        this.XregDirect()
        break

      // ctrl 2
      case 0x20:  // jsr a
        addr = this.direct()
        this.reg.pc--
        this.push((this.reg.pc & 0xff00) >> 8)
        this.push(this.reg.pc & 0x00ff)
        this.reg.pc = addr
        break
      case 0x24:  // bit d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.bit(opd2)
        break
      case 0x28:  // plp
        this.byte2flags(this.pop())
        this.reg.flag.r = true
        this.reg.flag.b = false
        break
      case 0x2c:  // bit a
        opd2 = this.addrSpace.read(this.direct())
        this.bit(opd2)
        break
      case 0x30:  // bmi *+d
        addr = this.relative()
        if (this.reg.flag.s) {
          this.reg.pc = addr
        }
        break
      case 0x34:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0x38:  // sec
        this.reg.flag.c = true
        break
      case 0x3c:  // nop a, x
        this.XregDirect()
        break

      // ctrl 3
      case 0x40:  // rti
        // restore flag
        this.byte2flags(this.pop())
        // restore pc
        addr = this.pop()
        addr |= this.pop() << 8
        this.reg.pc = addr
        // set flag
        this.reg.flag.r = true
        //this.reg.flag.i = false
        this.reg.flag.b = false
        break
      case 0x44:  // nop d
        this.zeroPageDirect()
        break
      case 0x48:  // pha
        this.push(this.reg.a)
        break
      case 0x4c:  // jmp a
        this.reg.pc = this.direct()
        break
      case 0x50:  // bvc *+d
        addr = this.relative()
        if (!this.reg.flag.v) {
          this.reg.pc = addr
        }
        break
      case 0x54:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0x58:  // cli
        this.reg.flag.i = false
        break
      case 0x5c:  // nop a, x
        this.XregDirect()
        break

      // ctrl 4
      case 0x60:  // rts
        addr = this.pop()
        addr |= this.pop() << 8
        this.reg.pc = addr + 1
        break
      case 0x64:  // nop d
        this.zeroPageDirect()
        break
      case 0x68:  // pla
        this.reg.a = this.pop()
        this.checkFlagZS(this.reg.a)
        break
      case 0x6c:  // jmp (a)
        this.reg.pc = this.indirect()
        break
      case 0x70:  // bvs *+d
        addr = this.relative()
        if (this.reg.flag.v) {
          this.reg.pc = addr
        }
        break
      case 0x74:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0x78:  // sei
        this.reg.flag.i = true
        break
      case 0x7c:  // nop a, x
        this.XregDirect()
        break

      // ctrl 5
      case 0x80:  // nop #i
        this.immediate()
        break
      case 0x84:  // sty d
        addr = this.zeroPageDirect()
        this.addrSpace.write(addr, this.reg.y)
        break
      case 0x88:  // dey
        this.reg.y = (this.reg.y - 1) & 0xff
        this.checkFlagZS(this.reg.y)
        break
      case 0x8c:  // sty a
        addr = this.direct()
        this.addrSpace.write(addr, this.reg.y)
        break
      case 0x90:  // bcc *+d
        addr = this.relative()
        if (!this.reg.flag.c) {
          this.reg.pc = addr
        }
        break
      case 0x94:  // sty d, x
        addr = this.zeroPageXregDirect()
        this.addrSpace.write(addr, this.reg.y)
        break
      case 0x98:  // tya
        this.reg.a = this.reg.y
        this.checkFlagZS(this.reg.a)
        break
      case 0x9c:  // shy a, x
        // unknown opcode and not necessary to implement
        // addr = this.direct()
        // this.addrSpace.write(addr + this.reg.x, (((addr >> 8) + 1) && 0xff) & this.reg.y)
        break

      // ctrl 6
      case 0xa0:  // ldy #i
        this.reg.y = this.addrSpace.read(this.immediate())
        this.checkFlagZS(this.reg.y)
        break
      case 0xa4:  // ldy d
        this.reg.y = this.addrSpace.read(this.zeroPageDirect())
        this.checkFlagZS(this.reg.y)
        break
      case 0xa8:  // tay
        this.reg.y = this.reg.a
        this.checkFlagZS(this.reg.y)
        break
      case 0xac:  // ldy a
        this.reg.y = this.addrSpace.read(this.direct())
        this.checkFlagZS(this.reg.y)
        break
      case 0xb0:  // bcs *+d
        addr = this.relative()
        if (this.reg.flag.c) {
          this.reg.pc = addr
        }
        break
      case 0xb4:  // ldy d, x
        this.reg.y = this.addrSpace.read(this.zeroPageXregDirect())
        this.checkFlagZS(this.reg.y)
        break
      case 0xb8:  // clv
        this.reg.flag.v = false
        break
      case 0xbc:  // ldy a, x
        this.reg.y = this.addrSpace.read(this.XregDirect())
        this.checkFlagZS(this.reg.y)
        break

      // ctrl 7
      case 0xc0:  // cpy #i
        opd2 = this.addrSpace.read(this.immediate())
        this.compare(this.reg.y, opd2)
        break
      case 0xc4:  // cpy d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.compare(this.reg.y, opd2)
        break
      case 0xc8:  // iny
        this.reg.y = (this.reg.y + 1) & 0xff
        this.checkFlagZS(this.reg.y)
        break
      case 0xcc:  // cpy a
        opd2 = this.addrSpace.read(this.direct())
        this.compare(this.reg.y, opd2)
        break
      case 0xd0:  // bne *+d
        addr = this.relative()
        if (!this.reg.flag.z) {
          this.reg.pc = addr
        }
        break
      case 0xd4:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0xd8:  // cld
        this.reg.flag.d = false
        break
      case 0xdc:  // nop a, x
        this.XregDirect()
        break

      // ctrl 8
      case 0xe0:  // cpx #i
        opd2 = this.addrSpace.read(this.immediate())
        this.compare(this.reg.x, opd2)
        break
      case 0xe4:  // cpx d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.compare(this.reg.x, opd2)
        break
      case 0xe8:  // inx
        this.reg.x = (this.reg.x + 1) & 0xff
        this.checkFlagZS(this.reg.x)
        break
      case 0xec:  // cpx a
        opd2 = this.addrSpace.read(this.direct())
        this.compare(this.reg.x, opd2)
        break
      case 0xf0:  // beq *+d
        addr = this.relative()
        if (this.reg.flag.z) {
          this.reg.pc = addr
        }
        break
      case 0xf4:  // nop d, x
        this.zeroPageXregDirect()
        break
      case 0xf8:  // sed
        this.reg.flag.d = true
        break
      case 0xfc:  // nop a, x
        this.XregDirect()
        break


      // ora  Flags: z, s
      case 0x01:  // ora (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x05:  // ora d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x09:  // ora #i
        opd2 = this.addrSpace.read(this.immediate())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x0d:  // ora a
        opd2 = this.addrSpace.read(this.direct())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x11:  // ora (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x15:  // ora d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x19:  // ora a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x1d:  // ora a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.reg.a |= opd2
        this.checkFlagZS(this.reg.a)
        break

      // and  Flags: z, s
      case 0x21:  // and (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x25:  // and d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x29:  // and #i
        opd2 = this.addrSpace.read(this.immediate())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x2d:  // and a
        opd2 = this.addrSpace.read(this.direct())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x31:  // and (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x35:  // and d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x39:  // and a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x3d:  // and a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.reg.a &= opd2
        this.checkFlagZS(this.reg.a)
        break

      // eor  Flags: z, s
      case 0x41:  // eor (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x45:  // eor d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x49:  // eor #i
        opd2 = this.addrSpace.read(this.immediate())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x4d:  // eor a
        opd2 = this.addrSpace.read(this.direct())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x51:  // eor (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x55:  // eor d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x59:  // eor a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break
      case 0x5d:  // eor a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.reg.a ^= opd2
        this.checkFlagZS(this.reg.a)
        break

      // adc  Flags: z,s,c,v
      case 0x61:  // adc (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.adc(opd2)
        break
      case 0x65:  // adc d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.adc(opd2)
        break
      case 0x69:  // adc #i
        opd2 = this.addrSpace.read(this.immediate())
        this.adc(opd2)
        break
      case 0x6d:  // adc a
        opd2 = this.addrSpace.read(this.direct())
        this.adc(opd2)
        break
      case 0x71:  // adc (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.adc(opd2)
        break
      case 0x75:  // adc d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.adc(opd2)
        break
      case 0x79:  // adc a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.adc(opd2)
        break
      case 0x7d:  // adc a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.adc(opd2)
        break

      // sta 
      case 0x81:  // sta (d, x)
        this.addrSpace.write(this.zeroPageXregIndirect(), this.reg.a)
        break
      case 0x85:  // sta d
        this.addrSpace.write(this.zeroPageDirect(), this.reg.a)
        break
      case 0x89:  // NOP #i
        //this.addrSpace.write(this.immediate(), this.reg.a)
        this.immediate()
        break
      case 0x8d:  // sta a
        this.addrSpace.write(this.direct(), this.reg.a)
        break
      case 0x91:  // sta (d), y
        this.addrSpace.write(this.zeroPageYregIndirect(), this.reg.a)
        break
      case 0x95:  // sta d, x
        this.addrSpace.write(this.zeroPageXregDirect(), this.reg.a)
        break
      case 0x99:  // sta a, y
        this.addrSpace.write(this.YregDirect(), this.reg.a)
        break
      case 0x9d:  // sta a, x
        this.addrSpace.write(this.XregDirect(), this.reg.a)
        break

      // lda
      case 0xa1:  // lda (d, x)
        this.reg.a = this.addrSpace.read(this.zeroPageXregIndirect())
        this.checkFlagZS(this.reg.a)
        break
      case 0xa5:  // lda d
        this.reg.a = this.addrSpace.read(this.zeroPageDirect())
        this.checkFlagZS(this.reg.a)
        break
      case 0xa9:  // lda #i
        this.reg.a = this.addrSpace.read(this.immediate())
        this.checkFlagZS(this.reg.a)
        break
      case 0xad:  // lda a
        this.reg.a = this.addrSpace.read(this.direct())
        this.checkFlagZS(this.reg.a)
        break
      case 0xb1:  // lda (d), y
        this.reg.a = this.addrSpace.read(this.zeroPageYregIndirect())
        this.checkFlagZS(this.reg.a)
        break
      case 0xb5:  // lda d, x
        this.reg.a = this.addrSpace.read(this.zeroPageXregDirect())
        this.checkFlagZS(this.reg.a)
        break
      case 0xb9:  // lda a, y
        this.reg.a = this.addrSpace.read(this.YregDirect())
        this.checkFlagZS(this.reg.a)
        break
      case 0xbd:  // lda a, x
        this.reg.a = this.addrSpace.read(this.XregDirect())
        this.checkFlagZS(this.reg.a)
        break

      // cmp  Flags: z, s, c
      case 0xc1:  // cmp (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.compare(this.reg.a, opd2)
        break
      case 0xc5:  // cmp d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.compare(this.reg.a, opd2)
        break
      case 0xc9:  // cmp #i
        opd2 = this.addrSpace.read(this.immediate())
        this.compare(this.reg.a, opd2)
        break
      case 0xcd:  // cmp a
        opd2 = this.addrSpace.read(this.direct())
        this.compare(this.reg.a, opd2)
        break
      case 0xd1:  // cmp (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.compare(this.reg.a, opd2)
        break
      case 0xd5:  // cmp d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.compare(this.reg.a, opd2)
        break
      case 0xd9:  // cmp a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.compare(this.reg.a, opd2)
        break
      case 0xdd:  // cmp a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.compare(this.reg.a, opd2)
        break

      // sbc  Flags: z, s, c, v
      case 0xe1:  // sbc (d, x)
        opd2 = this.addrSpace.read(this.zeroPageXregIndirect())
        this.sbc(opd2)
        break
      case 0xe5:  // sbc d
        opd2 = this.addrSpace.read(this.zeroPageDirect())
        this.sbc(opd2)
        break
      case 0xe9:  // sbc #i
        opd2 = this.addrSpace.read(this.immediate())
        this.sbc(opd2)
        break
      case 0xed:  // sbc a
        opd2 = this.addrSpace.read(this.direct())
        this.sbc(opd2)
        break
      case 0xf1:  // sbc (d), y
        opd2 = this.addrSpace.read(this.zeroPageYregIndirect())
        this.sbc(opd2)
        break
      case 0xf5:  // sbc d, x
        opd2 = this.addrSpace.read(this.zeroPageXregDirect())
        this.sbc(opd2)
        break
      case 0xf9:  // sbc a, y
        opd2 = this.addrSpace.read(this.YregDirect())
        this.sbc(opd2)
        break
      case 0xfd:  // sbc a, x
        opd2 = this.addrSpace.read(this.XregDirect())
        this.sbc(opd2)
        break


      // asl
      case 0x02:  // stp
        // stop processor, not implement
        break
      case 0x06:  // asl d
        addr = this.zeroPageDirect()
        this.asl(addr)
        break
      case 0x0a:  // asl
        this.asl(/*implied a*/)
        break
      case 0x0e:  // asl a
        addr = this.direct()
        this.asl(addr)
        break
      case 0x12:  // stp
        // stop processor, not implement
        break
      case 0x16:  // asl d, x
        addr = this.zeroPageXregDirect()
        this.asl(addr)
        break
      case 0x1a:  // nop
        break
      case 0x1e:  // asl a, x
        addr = this.XregDirect()
        this.asl(addr)
        break

      // rol
      case 0x22:  // stp
        // stop processor, not implement
        break
      case 0x26:  // rol d
        addr = this.zeroPageDirect()
        this.rol(addr)
        break
      case 0x2a:  // rol
        this.rol(/*implied a*/)
        break
      case 0x2e:  // rol a
        addr = this.direct()
        this.rol(addr)
        break
      case 0x32:  // stp
        // stop processor, not implement
        break
      case 0x36:  // rol d, x
        addr = this.zeroPageXregDirect()
        this.rol(addr)
        break
      case 0x3a:  // nop
        break
      case 0x3e:  // rol a, x
        addr = this.XregDirect()
        this.rol(addr)
        break

      // lsr
      case 0x42:  // stp
        // stop processor, not implement
        break
      case 0x46:  // lsr d
        addr = this.zeroPageDirect()
        this.lsr(addr)
        break
      case 0x4a:  // lsr
        this.lsr(/*implied a*/)
        break
      case 0x4e:  // lsr a
        addr = this.direct()
        this.lsr(addr)
        break
      case 0x52:  // stp
        // stop processor, not implement
        break
      case 0x56:  // lsr d, x
        addr = this.zeroPageXregDirect()
        this.lsr(addr)
        break
      case 0x5a:  // nop
        break
      case 0x5e:  // lsr a, x
        addr = this.XregDirect()
        this.lsr(addr)
        break

      // ror
      case 0x62:  // stp
        // stop processor, not implement
        break
      case 0x66:  // ror d
        addr = this.zeroPageDirect()
        this.ror(addr)
        break
      case 0x6a:  // ror
        this.ror(/*implied a*/)
        break
      case 0x6e:  // ror a
        addr = this.direct()
        this.ror(addr)
        break
      case 0x72:  // stp
        // stop processor, not implement
        break
      case 0x76:  // ror d, x
        addr = this.zeroPageXregDirect()
        this.ror(addr)
        break
      case 0x7a:  // nop
        break
      case 0x7e:  // ror a, x
        addr = this.XregDirect()
        this.ror(addr)
        break

      // stx
      case 0x82:  // nop #i
        this.immediate()
        break
      case 0x86:  // stx d
        addr = this.zeroPageDirect()
        this.addrSpace.write(addr, this.reg.x)
        break
      case 0x8a:  // txa
        this.reg.a = this.reg.x
        this.checkFlagZS(this.reg.a)
        break
      case 0x8e:  // stx a
        addr = this.direct()
        this.addrSpace.write(addr, this.reg.x)
        break
      case 0x92:  // stp
        // stop processor, not implement
        break
      case 0x96:  // stx d, y
        addr = this.zeroPageYregDirect()
        this.addrSpace.write(addr, this.reg.x)
        break
      case 0x9a:  // txs
        this.reg.s = this.reg.x
        break
      case 0x9e:  // shx a, y
        // unknown opcode and not necessary to implement
        // addr = this.direct()
        // this.addrSpace.write(addr + this.reg.y, (((addr >> 8) + 1) && 0xff) & this.reg.x)
        break

      // ldx
      case 0xa2:  // ldx #i
        this.reg.x = this.addrSpace.read(this.immediate())
        this.checkFlagZS(this.reg.x)
        break
      case 0xa6:  // ldx d
        this.reg.x = this.addrSpace.read(this.zeroPageDirect())
        this.checkFlagZS(this.reg.x)
        break
      case 0xaa:  // tax
        this.reg.x = this.reg.a
        this.checkFlagZS(this.reg.x)
        break
      case 0xae:  // ldx a
        this.reg.x = this.addrSpace.read(this.direct())
        this.checkFlagZS(this.reg.x)
        break
      case 0xb2:  // stp
        // stop processor, not implement
        break
      case 0xb6:  // ldx d, y
        this.reg.x = this.addrSpace.read(this.zeroPageYregDirect())
        this.checkFlagZS(this.reg.x)
        break
      case 0xba:  // tsx
        this.reg.x = this.reg.s
        this.checkFlagZS(this.reg.x)
        break
      case 0xbe:  // ldx a, y
        this.reg.x = this.addrSpace.read(this.YregDirect())
        this.checkFlagZS(this.reg.x)
        break

      // dec
      case 0xc2:  // nop #i
        this.immediate()
        break
      case 0xc6:  // dec d
        addr = this.zeroPageDirect()
        this.dec(addr)
        break
      case 0xca:  // dex
        this.reg.x = (this.reg.x - 1) & 0xff
        this.checkFlagZS(this.reg.x)
        break
      case 0xce:  // dec a
        addr = this.direct()
        this.dec(addr)
        break
      case 0xd2:  // stp
        // stop processor, not implement
        break
      case 0xd6:  // dec d, x
        addr = this.zeroPageXregDirect()
        this.dec(addr)
        break
      case 0xda:  // nop
        break
      case 0xde:  // dec a, x
        addr = this.XregDirect()
        this.dec(addr)
        break

      // inc
      case 0xe2:  // nop #i
        this.immediate()
        break
      case 0xe6:  // inc d
        addr = this.zeroPageDirect()
        this.inc(addr)
        break
      case 0xea:  // nop
        break
      case 0xee:  // inc a
        addr = this.direct()
        this.inc(addr)
        break
      case 0xf2:  // stp
        // stop processor, not implement
        break
      case 0xf6:  // inc d, x
        addr = this.zeroPageXregDirect()
        this.inc(addr)
        break
      case 0xfa:  // nop
        break
      case 0xfe:  // inc a, x
        addr = this.XregDirect()
        this.inc(addr)
        break


      // slo
      case 0x03:  // slo (d, x)
        addr = this.zeroPageXregIndirect()
        this.slo(addr)
        break
      case 0x07:  // slo d
        addr = this.zeroPageDirect()
        this.slo(addr)
        break
      case 0x0b:  // anc #i
        addr = this.immediate()
        this.reg.a &= this.addrSpace.read(addr)
        this.checkFlagZS(this.reg.a)
        this.reg.flag.c = this.reg.flag.s
        break
      case 0x0f:  // slo a
        addr = this.direct()
        this.slo(addr)
        break
      case 0x13:  // slo (d), y
        addr = this.zeroPageYregIndirect()
        this.slo(addr)
        break
      case 0x17:  // slo d, x
        addr = this.zeroPageXregDirect()
        this.slo(addr)
        break
      case 0x1b:  // slo a, y
        addr = this.YregDirect()
        this.slo(addr)
        break
      case 0x1f:  // slo a, x
        addr = this.XregDirect()
        this.slo(addr)
        break

      // rla
      case 0x23:  // rla (d, x)
        addr = this.zeroPageXregIndirect()
        this.rla(addr)
        break
      case 0x27:  // rla d
        addr = this.zeroPageDirect()
        this.rla(addr)
        break
      case 0x2b:  // anc #i
        addr = this.immediate()
        this.reg.a &= this.addrSpace.read(addr)
        this.checkFlagZS(this.reg.a)
        this.reg.flag.c = this.reg.flag.s
        break
      case 0x2f:  // rla a
        addr = this.direct()
        this.rla(addr)
        break
      case 0x33:  // rla (d), y
        addr = this.zeroPageYregIndirect()
        this.rla(addr)
        break
      case 0x37:  // rla d, x
        addr = this.zeroPageXregDirect()
        this.rla(addr)
        break
      case 0x3b:  // rla a, y
        addr = this.YregDirect()
        this.rla(addr)
        break
      case 0x3f:  // rla a, x
        addr = this.XregDirect()
        this.rla(addr)
        break

      // sre
      case 0x43:  // sre (d, x)
        addr = this.zeroPageXregIndirect()
        this.sre(addr)
        break
      case 0x47:  // sre d
        addr = this.zeroPageDirect()
        this.sre(addr)
        break
      case 0x4b:  // alr #i
        // and
        addr = this.immediate()
        this.reg.a &= this.addrSpace.read(addr)
        // lsr
        this.reg.flag.c = !!(this.reg.a & 0x01)
        this.reg.a >>= 1
        this.checkFlagZS(this.reg.a)
        break
      case 0x4f:  // sre a
        addr = this.direct()
        this.sre(addr)
        break
      case 0x53:  // sre (d), y
        addr = this.zeroPageYregIndirect()
        this.sre(addr)
        break
      case 0x57:  // sre d, x
        addr = this.zeroPageXregDirect()
        this.sre(addr)
        break
      case 0x5b:  // sre a, y
        addr = this.YregDirect()
        this.sre(addr)
        break
      case 0x5f:  // sre a, x
        addr = this.XregDirect()
        this.sre(addr)
        break

      // rra
      case 0x63:  // rra (d, x)
        addr = this.zeroPageXregIndirect()
        this.rra(addr)
        break
      case 0x67:  // rra d
        addr = this.zeroPageDirect()
        this.rra(addr)
        break
      case 0x6b:  // arr #i
        // and
        addr = this.immediate()
        this.reg.a &= this.addrSpace.read(addr)
        // ror
        this.reg.a |= this.reg.flag.c ? 0x100 : 0x000
        this.reg.a >>= 1
        this.reg.a &= 0xff
        this.checkFlagZS(this.reg.a)
        this.reg.flag.c = !!(this.reg.a & 0x40)
        this.reg.flag.v = !!(((this.reg.a >> 6) ^ (this.reg.a >> 5)) & 0x01)
        break
      case 0x6f:  // rra a
        addr = this.direct()
        this.rra(addr)
        break
      case 0x73:  // rra (d), y
        addr = this.zeroPageYregIndirect()
        this.rra(addr)
        break
      case 0x77:  // rra d, x
        addr = this.zeroPageXregDirect()
        this.rra(addr)
        break
      case 0x7b:  // rra a, y
        addr = this.YregDirect()
        this.rra(addr)
        break
      case 0x7f:  // rra a, x
        addr = this.XregDirect()
        this.rra(addr)
        break

      // sax
      case 0x83:  // sax (d, x)
        addr = this.zeroPageXregIndirect()
        this.sax(addr)
        break
      case 0x87:  // sax d
        addr = this.zeroPageDirect()
        this.sax(addr)
        break
      case 0x8b:  // xaa #i
        // unknown opcode and not necessary to implement
        break
      case 0x8f:  // sax a
        addr = this.direct()
        this.sax(addr)
        break
      case 0x93:  // ahx (d), y
        // unknown opcode and not necessary to implement
        break
      case 0x97:  // sax d, y
        addr = this.zeroPageYregDirect()
        this.sax(addr)
        break
      case 0x9b:  // tas a, y
        // unknown opcode and not necessary to implement
        break
      case 0x9f:  // ahx a, y
        // unknown opcode and not necessary to implement
        break

      // lax
      case 0xa3:  // lax (d, x)
        addr = this.zeroPageXregIndirect()
        this.lax(addr)
        break
      case 0xa7:  // lax d
        addr = this.zeroPageDirect()
        this.lax(addr)
        break
      case 0xab:  // lax #i
        addr = this.immediate()
        this.lax(addr)
        break
      case 0xaf:  // lax a
        addr = this.direct()
        this.lax(addr)
        break
      case 0xb3:  // lax (d), y
        addr = this.zeroPageYregIndirect()
        this.lax(addr)
        break
      case 0xb7:  // lax d, y
        addr = this.zeroPageYregDirect()
        this.lax(addr)
        break
      case 0xbb:  // las a, y
        // unknown opcode and not necessary to implement
        break
      case 0xbf:  // lax a, y
        addr = this.YregDirect()
        this.lax(addr)
        break

      // dcp
      case 0xc3:  // dcp (d, x)
        addr = this.zeroPageXregIndirect()
        this.dcp(addr)
        break
      case 0xc7:  // dcp d
        addr = this.zeroPageDirect()
        this.dcp(addr)
        break
      case 0xcb:  // axs #i
        addr = this.immediate()
        this.reg.x = this.reg.a & this.reg.x - this.addrSpace.read(addr)
        this.reg.flag.c = !!(this.reg.x & 0x100)
        this.reg.x &= 0xff
        break
      case 0xcf:  // dcp a
        addr = this.direct()
        this.dcp(addr)
        break
      case 0xd3:  // dcp (d), y
        addr = this.zeroPageYregIndirect()
        this.dcp(addr)
        break
      case 0xd7:  // dcp d, x
        addr = this.zeroPageXregDirect()
        this.dcp(addr)
        break
      case 0xdb:  // dcp a, y
        addr = this.YregDirect()
        this.dcp(addr)
        break
      case 0xdf:  // dcp a, x
        addr = this.XregDirect()
        this.dcp(addr)
        break

      // isc
      case 0xe3:  // isc (d, x)
        addr = this.zeroPageXregIndirect()
        this.isc(addr)
        break
      case 0xe7:  // isc d
        addr = this.zeroPageDirect()
        this.isc(addr)
        break
      case 0xeb:  // sbc #i
        opd2 = this.addrSpace.read(this.immediate())
        this.sbc(opd2)
        break
      case 0xef:  // isc a
        addr = this.direct()
        this.isc(addr)
        break
      case 0xf3:  // isc (d), y
        addr = this.zeroPageYregIndirect()
        this.isc(addr)
        break
      case 0xf7:  // isc d, x
        addr = this.zeroPageXregDirect()
        this.isc(addr)
        break
      case 0xfb:  // isc a, y
        addr = this.YregDirect()
        this.isc(addr)
        break
      case 0xff:  // isc a, x
        addr = this.XregDirect()
        this.isc(addr)
        break
    }  // switch-case

  }  // operate

}  // CPU

module.exports = CPU
