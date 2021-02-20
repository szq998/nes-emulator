class GameRom {
    constructor(romString) {
        this.romBytes = []
        // turn char to number
        for (let i = 0; i < romString.length; i++) {
            const byte = romString.charCodeAt(i)
            this.romBytes.push(byte)
        }

        const flag6 = this.romBytes[6]
        const flag7 = this.romBytes[7]
        this.header = {
            prgCount: this.romBytes[4] * 16 * 1024,
            chrCount: this.romBytes[5] * 8 * 1024,
            mapper: ((flag6 & 0xf0) >> 4) | (flag7 & 0xf0),
            fourScreen: !!(flag6 & 0x08),
            // trainer: !! (flag6 & 0x04),
            sRam: !!(flag6 & 0x02),
            vertMirror: !!(flag6 & 0x01),

            //playChoice10: !! (flag7 & 0x02),
            //vsUnisystem: !! (flag7 & 0x01)
        }
    }

    get prgRom() { return this.romBytes.slice(16, 16 + this.header.prgCount) }
    get chrRom() { return this.romBytes.slice(16 + this.header.prgCount, 16 + this.header.prgCount + this.header.chrCount) }
}

module.exports = GameRom