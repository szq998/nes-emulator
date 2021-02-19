class AddrSpace {
    read(addr) { }
    write(addr, byte) { }
    addressing(addr) { }
}

const isByte = mayByte => {
    return Number.isInteger(mayByte) && !(mayByte >> 8)
}

const isValidAddress = mayAddr => {
    return Number.isInteger(mayAddr) && !(mayAddr >> 16)
}

class PPUReg {
    constructor() {
        this.innerBytes = Array(8)
        this.regChangedCallbacks
    }

    set regChangedCallbacks(v) { this.regChangedCallbacks = v }

    // called by cpu
    get 0() { throw("WriteOnlyError") }
    set 0(byte) { 
        this.innerBytes[0] = byte
        this.regChangedCallbacks[0] && this.regChangedCallbacks[0](byte)
    }

    get 1() { throw("WriteOnlyError") }
    set 1(byte) {
        this.innerBytes[1] = byte
        this.regChangedCallbacks[1] && this.regChangedCallbacks[1](byte)
     }

    get 2() { 
        return this.innerBytes[2]
    }
    set 2(byte) { throw("ReadOnlyError") }

    get 3() { throw("WriteOnlyError") }
    set 3(byte) {
        this.innerBytes[3] = byte
        this.regChangedCallbacks[3] && this.regChangedCallbacks[3](byte)
     }

    get 4() {
        return this.innerBytes[4]
     }
    set 4(byte) {
        this.innerBytes[4] = byte
        this.regChangedCallbacks[4] && this.regChangedCallbacks[4](byte)
     }

    get 5() { throw("WriteOnlyError") }
    set 5(byte) { 
        this.innerBytes[5] = byte
        this.regChangedCallbacks[5] && this.regChangedCallbacks[5](byte)
    }

    get 6() { throw("WriteOnlyError") }
    set 6(byte) {
        this.innerBytes[6] = byte
        this.regChangedCallbacks[6] && this.regChangedCallbacks[6](byte)
     }

    get 7() {
        return this.innerBytes[7]
     }
    set 7(byte) {
        this.innerBytes[7] = byte
        this.regChangedCallbacks[7] && this.regChangedCallbacks[7](byte)
     }
}

class CPUAddrSpace extends AddrSpace {
    constructor() {
        super()
        this.ram = Array(0x07ff)
        this.ppuReg = new PPUReg()
        this.roms = Array(2) 
    }

    loadRom(rom) {
        if (rom.length === 0x4000) {
            this.roms[0] = rom
            this.roms[1] = rom
        } else if (rom.length === 0x8000) {
            this.roms[0] = rom.slice(0, 0x4000)
            this.roms[1] = rom.slice(0x4000, 0x8000)
        } else {
            throw("Illegal PRG-ROM length.")
        }
    }

    addressing(addr) {
        if (!isValidAddress(addr)) {
            throw(`InvalidAddressError: ${addr} is't a valid address.`)
        }

        addr &= 0xffff
        if (addr < 0x2000) {
            // ram 0x0000-0x07ff
            // ram mirror  0x0800-0x0fff  
            //             0x1000-0x17ff
            //             0x1800-0x1fff 
            return [this.ram, addr & 0x07ff]
        } else if (addr < 0x4000) {
            // ppu register 0x2008-0x3fff
            return [this.ppuReg, addr & 0x0007]
        } else if (addr < 0x4020) {
            // register 0x4000-0x401f
        } else if (addr < 0x6000) {
            // expansion rom 0x4020-0x5fff
        } else if (addr < 0x8000) {
            // save ram 0x6000-0x7fff
        } else if (addr < 0xc000) {
            // prg-rom 0x8000-0xbfff
            return [this.roms[0], addr & 0x3fff]
        } else {
            // prg-rom 0xc000-0xffff
            return [this.roms[1], addr & 0x3fff]
        }
    }

    read(addr) {
        const [asPart, idx] = this.addressing(addr)
        return asPart[idx]
    }

    write(addr, byte) {
        if (!isByte(byte)) {
            throw(`NotByteError: value ${byte} is't a byte.`)
        }

        const [asPart, idx] = this.addressing(addr)
        if (asPart === this.roms[0] || asPart === this.roms[1]) {
            throw(`ReadOnlyError: address ${addr} of CPU is read only.`)
        }

        asPart[idx] = byte
    }
}

class PPUAddrSpace extends AddrSpace {
    constructor() {
        super()
        this.patternTables = Array(2) 
        this.nameTable = Array(0x1000)
        // for (let i = 0; i < 4; i++) {
        //     this.nameTables[0] = {
        //         nameTable: Array(960),
        //         attributeTable: Array(64)
        //     }
        // }

        this.palette = Array(0x0020)
    }  // constructor

    loadRom(rom) {
        if (rom.length === 0x2000) {
            this.patternTables[0] = rom.slice(0, 0x1000)
            this.patternTables[1] = rom.slice(0x1000, 0x2000)
        } else {
            throw("Illegal CHR-ROM length.")
        }
    }

    addressing(addr) {
        if (!isValidAddress(addr)) {
            throw(`InvalidAddressError: ${addr} is't a valid address.`)
        }

        addr &= 0x3fff  // mirror 4000-7fff to 0x0000-0x3fff
        if (addr < 0x1000) {
            // pattern table 0 0x0000-0x0fff
            return [this.patternTables[0], addr & 0x0fff]
        } else if (addr < 0x2000) {
            // pattern table 1 0x1000-0x1fff
            return [this.patternTables[1], addr & 0x0fff]
        } else if (addr < 0x3f00) {
            // addr &= 0x2fff  // mirror 0x3000-3eff to 0x2000-2eff
            return [this.nameTable, addr & 0x0fff]
            // if (addr < 0x23c0) {
            //     // name table 0 0x2000-0x23bf
            // } else if (addr < 0x2400) {
            //     // attribute table 0 0x23c0-0x23ff
            // } else if (addr < 0x27c0) {
            //     // name table 1 0x2400-0x27bf
            // } else if (addr < 0x2800) {
            //     // addribute table 1 0x27c0-0x27ff
            // } else if (addr < 0x2bc0) {
            //     // name table 2 0x2800-0x2bbf
            // } else if (addr < 0x2c00) {
            //     // attribute table 2 0x2bc0-0x2bff
            // } else if (addr < 0x2fc0) {
            //     // name table 3 0x2c00-0x2fbf
            // } else if (addr < 0x2fc0) {
            //     // addribute table 3 0x2fc0-0x2fff
            // }
        } else {
            // addr &= 0x3f1f  // mirror 0x3f20-0x3fff to 0x03f00-0x3f1f
            return [this.palette, addr & 0x01f]
            // if (addr < 0x3f10) {
            //     // background 0x3f00-0x3f0f
            // } else if (addr < 0x3f20) {
            //     // sprite 0x3f10-0x3f1f
            // }
        }
    }

    read(addr) {
        const [asPart, idx] = this.addressing(addr)
        return asPart[idx]
    }  // read

    write(addr, byte) {
        if (!isByte(byte)) {
            throw(`NotByteError: value ${byte} is't a byte.`)
        }

        const [asPart, idx] = this.addressing(addr)
        if (asPart === this.patternTables[0] || asPart === this.patternTables[1]) {
            throw(`ReadOnlyError: address ${addr} of PPU is read only.`)
        }

        asPart[idx] = byte
    }  // write 
}




module.exports = {
    CPUAddrSpace: CPUAddrSpace,
    PPUAddrSpace: PPUAddrSpace
}