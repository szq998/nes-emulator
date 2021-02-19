class AddrSpace {
    read(addr) { }
    write(addr, byte) { }
}

class CPUAddrSpace extends AddrSpace {
    constructor() {
        super()
        this.ram = []
        this.rom
    }

    loadRom(rom) {
        this.rom = rom
    }

    read(addr) {
        if (addr < 0x2000) {
            // ram 0x0000-0x07ff
            // ram mirror  0x0800-0x0fff  
            //             0x1000-0x17ff
            //             0x1800-0x1fff 
            return this.ram[addr & 0x07ff]
        } else if (addr < 0x2008) {
            // register 0x2000-0x200f
        } else if (addr < 0x4000) {
            // ppu register 0x2008-0x3fff
        } else if (addr < 0x4020) {
            // register 0x4000-0x401f
        } else if (addr < 0x6000) {
            // expansion rom 0x4020-0x5fff
        } else if (addr < 0x8000) {
            // save ram 0x6000-0x7fff
        } else if (addr < 0xc000) {
            // prg-rom 0x8000-0xbfff
            return this.rom[addr - 0x8000]
        } else {
            // prg-rom 0xc000-0xffff
            return this.rom[addr - 0x8000]
        }
    }

    write(addr, byte) {
        if (addr < 0x2000) {
            // ram 0x0000-0x07ff
            // ram mirror  0x0800-0x0fff  0x1000-0x17ff
            //             0x1800-0x1fff 
            this.ram[addr & 0x07ff] = byte
        } else if (addr < 0x2008) {
            // register 0x2000-0x200f
        } else if (addr < 0x4000) {
            // ppu register 0x2008-0x3fff
        } else if (addr < 0x4020) {
            // register 0x4000-0x401f
        } else if (addr < 0x6000) {
            // expamsion rom 0x4020-0x5fff
        } else if (addr < 0x8000) {
            // save ram 0x6000-0x7fff
        } else if (addr < 0xc000) {
            // prg-rom 0x8000-0xbfff
            // read only!
            throw(`ReadOnlyError: address ${addr} is read only.`)
        } else {
            // prg-rom 0xc000-0xffff
            // read only!
            throw(`ReadOnlyError: address ${addr} is read only.`)
        }

    }
}

class PPUAddrSpace extends AddrSpace {
    constructor() {
        super()
        this.rom 
    }  // constructor

    loadRom(rom) {
        this.rom = rom
    }

    read(addr) {
        addr &= 0x3fff  // mirror 4000-7fff to 0x0000-0x3fff
        if (addr < 0x1000) {
            // pattern table 0 0x0000-0x0fff
        } else if (addr < 0x2000) {
            // pattern table 1 0x1000-0x1fff
        } else if (addr < 0x3f00) {
            addr &= 0x2fff  // mirror 0x3000-3eff to 0x2000-2eff
            if (addr < 0x23c0) {
                // name table 0 0x2000-0x23bf
            } else if (addr < 0x2400) {
                // attribute table 0 0x23c0-0x23ff
            } else if (addr < 0x27c0) {
                // name table 1 0x2400-0x27bf
            } else if (addr < 0x2800) {
                // addribute table 1 0x27c0-0x27ff
            } else if (addr < 0x2bc0) {
                // name table 2 0x2800-0x2bbf
            } else if (addr < 0x2c00) {
                // attribute table 2 0x2bc0-0x2bff
            } else if (addr < 0x2fc0) {
                // name table 3 0x2c00-0x2fbf
            } else if (addr < 0x2fc0) {
                // addribute table 3 0x2fc0-0x2fff
            }
        } else {
            addr &= 0x3f3f  // mirror 0x3f20-0x3fff to 0x03f00-0x3f1f
            if (addr < 0x3f10) {
                // background 0x3f00-0x3f0f
            } else if (addr < 0x3f20) {
                // sprite 0x3f10-0x3f1f
            }
        }
    }  // read
}

module.exports = {
    CPUAddrSpace: CPUAddrSpace,
    PPUAddrSpacePPU: PPUAddrSpace
}