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

const isValidAddress = (mayAddr, maxBits = 16) => {
    return Number.isInteger(mayAddr) && !(mayAddr >> maxBits)
}

class PPUReg {
    constructor() {
        this.innerBytes = [0, 0, 0, 0, 0, 0, 0, 0, 0]
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

    get 14() { throw "WriteOnlyError" }
    set 14(byte) {
        this.innerBytes[8] = byte
        this.regWritedCallbacks[8] && this.regWritedCallbacks[8](byte)
    }
}

class Controller {
    constructor() {
        this.strobed = false
        this.buttons = Array(16)
        this.buttonIdx = [0, 0]
    }

    get 0() {
        if (!this.strobed) return 
        const v = this.buttons[this.buttonIdx[0]]
        this.buttonIdx[0]++
        this.buttonIdx[0] = this.buttonIdx[0] & 0x7
        return v
    }

    set 0(byte) {
        if (byte & 1) {
            // reset
            this.buttonIdx = [0, 0]
            this.strobed = false
        } else {
            this.strobed = 1
        }
    }

    get 1() {
        if (!this.strobed) return
        const v = this.buttons[this.buttonIdx[1] + 8]
        this.buttonIdx[1]++
        this.buttonIdx[1] = this.buttonIdx[1] & 0x7
        return v
    }

    set 1(byte) {
        console.log("write 4017")
    }

    controllerPressed(controller, key) {
        const offset = controller === 0 ? 0 : 8
        switch(key) {
            case "a": 
                this.buttons[0 + offset] = 1
                break
            case "b": 
                this.buttons[1 + offset] = 1
                break
            case "select": 
                this.buttons[2 + offset] = 1
                break
            case "start": 
                this.buttons[3 + offset] = 1
                break
            case "up": 
                this.buttons[4 + offset] = 1
                break
            case "down": 
                this.buttons[5 + offset] = 1
                break
            case "left": 
                this.buttons[6 + offset] = 1
                break
            case "right": 
                this.buttons[7 + offset] = 1
                break
            default:
                throw `attempt to press unknown controller key ${key}`
        }
    }

    controllerReleased(controller, key) {
        const offset = controller === 0 ? 0 : 8
        switch(key) {
            case "a": 
                this.buttons[0 + offset] = 0
                break
            case "b": 
                this.buttons[1 + offset] = 0
                break
            case "select": 
                this.buttons[2 + offset] = 0
                break
            case "start": 
                this.buttons[3 + offset] = 0
                break
            case "up": 
                this.buttons[4 + offset] = 0
                break
            case "down": 
                this.buttons[5 + offset] = 0
                break
            case "left": 
                this.buttons[6 + offset] = 0
                break
            case "right": 
                this.buttons[7 + offset] = 0
                break
            default:
                throw `attempt to release unknown controller key ${key}`
        }
    }
}

class CPUAddrSpace extends AddrSpace {
    constructor(logger = null) {
        super(logger)
        this.ram = Array(0x07ff)
        this.ppuReg = new PPUReg()
        this.controller = new Controller()
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
            throw `Illegal PRG-ROM length ${rom.length.toString(16)}.`
        }
    }

    get DMAPort() { return this.DMA.bind(this) }

    DMA(addr) {
        if (addr < 0x1f) {
            // ram
            const start = (addr & 0x07) << 8
            const end = start + 0x0100
            return this.ram.slice(start, end)
        } else if (addr >= 0x41 && addr < 0x60) {
            // expansion rom
            throw "Unimplemented DMA address."
        } else if (addr < 0x80) {
            // save ram
            throw "Unimplemented DMA address."
        } else if (addr < 0xc0) {
            // rom 0
            const start = (addr & 0x3f) << 8
            const end = start + 0x0100
            this.roms[0].slice(start, end)
        } else if (addr < 0xff) {
            // rom 1
            const start = (addr & 0x3f) << 8
            const end = start + 0x0100
            this.roms[1].slice(start, end)
        } else {
            throw "Unsupported DMA address."
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
            return [this.ppuReg, addr & 0x0007]
        } else if (addr === 0x4014) {
            // special OAM DMA reg, combine to ppu reg addr 14 for simplicity
            return [this.ppuReg, 14]
        } else if (addr === 0x4016 || addr === 0x4017) {
            // controller 
            return [this.controller, addr & 1]
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
        const logedByte = isByte(byte) ? byte : -1
        this.logger.doLog && this.logger.push(`read CPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${logedByte.toString(16).padStart(2, "0")}`)

        return isByte(byte) ? byte : 0

        // return asPart[idx]
    }

    write(addr, byte) {
        if (!isByte(byte)) {
            throw `NotByteError: attempt to write ${byte} to CPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }
        this.logger.doLog && this.logger.push(`write CPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)

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
        this.patternTable
        this.nameTable = Array(0x1000)
        this.palette = Array(0x0020)

        this.isChrRam = false
        this.isFourScreen = false
    }  // constructor

    loadRom(rom) {
        if (rom.length === 0) {
            this.patternTable = Array(0x2000)
            this.isChrRam = true
        } else if (rom.length === 0x2000) {
            this.patternTable = rom.slice()
            this.isChrRam = false
        } else {
            throw `Illegal CHR-ROM length ${rom.length.toString(16)}.`
        }
    }

    addressing(addr) {
        if (!isValidAddress(addr)) {
            throw `InvalidAddressError: ${addr} is't a valid address.`
        }

        addr &= 0x3fff  // mirror 4000-7fff to 0x0000-0x3fff
        if (addr < 0x2000) {
            // pattern table 0 0x0000-0x1fff
            return [this.patternTable, addr & 0x1fff]
        } else if (addr < 0x3f00) {
            // addr &= 0x2fff  // mirror 0x3000-3eff to 0x2000-2eff
            return [this.nameTable, addr & (this.isFourScreen ? 0x0fff : 0x07ff)]
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
            this.logger.doLog && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)
        } else {
            if (isByte(byte)) {
                this.logger.doLog && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)
            } else {
                this.logger.doLog && this.logger.push(`read PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte}`)
            }
        }

        return byte

        // return asPart[idx]
    }  // read

    write(addr, byte) {
        if (!isByte(byte)) {
            throw `NotByteError: attempt to write ${byte} to PPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }
        this.logger.doLog && this.logger.push(`write PPUAddrSpace ${addr.toString(16).padStart(4, "0")} of ${byte.toString(16).padStart(2, "0")}`)

        const [asPart, idx] = this.addressing(addr)
        if (!this.isChrRam && asPart === this.patternTable) {
            throw `ReadOnlyError: attempt to write ${byte.toString(16).padStart(2, "0")} to PPUAddrSpace at ${addr.toString(16).padStart(4, "0")}.`
        }

        asPart[idx] = byte
    }  // write 
}

class OAMAddrSpace extends AddrSpace {
    constructor(DMAPort, logger = null) {
        super(logger)
        this.DMAPort = DMAPort
        this.mem = Array(256)
    }

    read(addr) {
        if (!isValidAddress(addr, 8)) {
            throw `InvalidAddressError: ${addr} is't a valid OAM read address.`
        }
        const byte = this.mem[addr]

        // if (!isByte(byte)) throw `NotByteError: read OAMAddrSpace ${addr.toString(16).padStart(2, "0")} of ${byte}`
        const logedByte = isByte(byte) ? byte : -1
        this.logger.doLog && this.logger.push(`read OAMAddrSpace ${addr.toString(16).padStart(2, "0")} of ${logedByte.toString(16).padStart(2, "0")}`)

        return isByte(byte) ? byte : 0
    }

    write(addr, byte) {
        if (!isValidAddress(addr, 8)) {
            throw `InvalidAddressError: ${addr} is't a valid OAM write address.`
        }

        if (!isByte(byte)) {
            throw `NotByteError: attempt to write ${byte} to OAMAddrSpace at ${addr.toString(16).padStart(2, "0")}.`
        }
        this.logger.doLog && this.logger.push(`write OAMAddrSpace ${addr.toString(16).padStart(2, "0")} of ${byte.toString(16).padStart(2, "0")}`)

        this.mem[addr] = byte
    }

    DMA(addr) {
        if (!isValidAddress(addr, 8)) {
            throw `InvalidAddressError: ${addr} is't a valid OAM DMA address.`
        }
        const DMABytes = this.DMAPort(addr)
        for (let i = 0; i < DMABytes.length; i++) {
            const byte = DMABytes[i]
            if (!isByte(DMABytes[i])) throw `NoByteError: get ${byte} at ${addr.toString(16).padStart(2, "0")}${i.toString(16).padStart(2, "0")} from DMA`
        }

        this.logger.doLog && this.logger.push(`DMA by OAMAddrSpace at ${addr.toString(16).padStart(2, "0")}`)

        this.mem = DMABytes
    }
}


module.exports = {
    CPUAddrSpace: CPUAddrSpace,
    PPUAddrSpace: PPUAddrSpace,
    OAMAddrSpace: OAMAddrSpace
}