class AddrSpace {
    constructor(logger = null) {
        this.logger = logger
    }
    loadRom(rom) { }
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
        this.innerBytes = [0, 0, 0, 0, 0, 0, 0, 0]
        this.regReadCallbacks = []
        this.regWritedCallbacks = []
    }

    // called by cpu
    get 0() { throw "WriteOnlyError" }
    set 0(byte) {
        this.innerBytes[0] = byte
        this.regWritedCallbacks[0] && this.regWritedCallbacks[0](byte)
    }

    get 1() { throw "WriteOnlyError" }
    set 1(byte) {
        this.innerBytes[1] = byte
        this.regWritedCallbacks[1] && this.regWritedCallbacks[1](byte)
    }

    get 2() {
        const byte = this.innerBytes[2]
        this.regReadCallbacks[2] && this.regReadCallbacks[2](byte)
        return byte
    }
    set 2(byte) { throw "ReadOnlyError" }

    get 3() { throw "WriteOnlyError" }
    set 3(byte) {
        this.innerBytes[3] = byte
        this.regWritedCallbacks[3] && this.regWritedCallbacks[3](byte)
    }

    get 4() {
        const byte = this.innerBytes[4]
        this.regReadCallbacks[4] && this.regReadCallbacks[4](byte)
        return byte
    }
    set 4(byte) {
        this.innerBytes[4] = byte
        this.regWritedCallbacks[4] && this.regWritedCallbacks[4](byte)
    }

    get 5() { throw "WriteOnlyError" }
    set 5(byte) {
        this.innerBytes[5] = byte
        this.regWritedCallbacks[5] && this.regWritedCallbacks[5](byte)
    }

    get 6() { throw "WriteOnlyError" }
    set 6(byte) {
        this.innerBytes[6] = byte
        this.regWritedCallbacks[6] && this.regWritedCallbacks[6](byte)
    }

    get 7() {
        const byte = this.innerBytes[7]
        this.regReadCallbacks[7] && this.regReadCallbacks[7](byte)
        return byte
    }
    set 7(byte) {
        this.innerBytes[7] = byte
        this.regWritedCallbacks[7] && this.regWritedCallbacks[7](byte)
    }
}

class CPUAddrSpace extends AddrSpace {
    constructor(logger = null) {
        super(logger)
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
            throw "Illegal PRG-ROM length."
        }
    }

    addressing(addr) {
        if (!isValidAddress(addr)) {
            throw `InvalidAddressError: ${addr} is't a valid address.`
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
            // console.log(`ppuReg ${addr & 0x0007} accessed`)
            return [this.ppuReg, addr & 0x0007]
        } else if (addr < 0x4020) {
            // register 0x4000-0x401f
            return [[0], 0]
        } else if (addr < 0x6000) {
            // expansion rom 0x4020-0x5fff
            return [[0], 0]
        } else if (addr < 0x8000) {
            // save ram 0x6000-0x7fff
            return [[0], 0]
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
        const byte = asPart[idx]

        // if (!isByte(byte)) throw `NotByteError: read CPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte}`
        const logedByte = typeof(byte) === "undefined" ? -1 : byte
        this.logger && this.logger.push(`read CPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${logedByte.toString(16).padStart(2, "0")}`)

        return typeof(byte) === "undefined" ? 0 : byte

        // return asPart[idx]
    }

    write(addr, byte) {
        if (!isByte(byte)) {
            throw `NotByteError: attempt to write ${byte} to CPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }
        this.logger && this.logger.push(`write CPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)

        const [asPart, idx] = this.addressing(addr)
        if (asPart === this.roms[0] || asPart === this.roms[1]) {
            throw `ReadOnlyError: attempt to write ${byte.toString(16).padStart(2, "0")} to CPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }

        asPart[idx] = byte
    }
}

class PPUAddrSpace extends AddrSpace {
    constructor(logger = null) {
        super(logger)
        this.patternTables = Array(2)
        this.nameTable = Array(0x1000)
        this.palette = Array(0x0020)

        this.isFourScreen = false
    }  // constructor

    loadRom(rom) {
        if (rom.length === 0x2000) {
            this.patternTables[0] = rom.slice(0, 0x1000)
            this.patternTables[1] = rom.slice(0x1000, 0x2000)
        } else {
            throw "Illegal CHR-ROM length."
        }
    }

    addressing(addr) {
        if (!isValidAddress(addr)) {
            throw `InvalidAddressError: ${addr} is't a valid address.`
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
            return [this.nameTable, addr & (this.isFourScreen ? 0x0fff : 0x07ff)]
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

            // mirror 3f10 3f14 3f18 3f1c
            //     to 3f00 3f04 3f08 3f0c
            if ((addr & 0x0010) && !(addr & 0x0003)) {
                addr &= 0xffef
            }
            return [this.palette, addr & 0x01f]
            // if (addr < 0x3f10) {
            //     // background 0x3f00-0x3f0f
            // } else if (addr < 0x3f20) {
            //     // sprite 0x3f10-0x3f1f
            // }
        }
    }

    read(addr, preventUndefined = true) {
        const [asPart, idx] = this.addressing(addr)
        const byte = asPart[idx]

        if (preventUndefined) {
            if (!isByte(byte)) throw `NotByteError: read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte}`
            this.logger && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)
        } else {
            if (typeof (byte) === "undefined") {
                this.logger && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of undefined`)
            } else {
                this.logger && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)
            }
        }

        return byte

        // return asPart[idx]
    }  // read

    write(addr, byte) {
        if (!isByte(byte)) {
            throw `NotByteError: attempt to write ${byte} to PPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }
        this.logger && this.logger.push(`write PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)

        const [asPart, idx] = this.addressing(addr)
        if (asPart === this.patternTables[0] || asPart === this.patternTables[1]) {
            throw `ReadOnlyError: attempt to write ${byte.toString(16).padStart(2, "0")} to PPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }

        asPart[idx] = byte
    }  // write 
}




module.exports = {
    CPUAddrSpace: CPUAddrSpace,
    PPUAddrSpace: PPUAddrSpace
}