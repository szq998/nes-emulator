class PPU {
    constructor(addrSpace, oamAddrSpace, ppuReg, drawCallback) {
        this.addrSpace = addrSpace // a.k.a vram
        this.oamAddrSpace = oamAddrSpace
        this.ppuReg = ppuReg
        this.ppuReg.regReadCallbacks = [null, null, this.ppuStatusRead.bind(this), null, null/*this.oamDataRead.bind(this)*/, null, null, this.ppuDataRead.bind(this)]
        this.ppuReg.regWritedCallbacks = [null, null, null, this.oamAddrWrited.bind(this), this.oamDataWrited.bind(this), null, this.ppuAddrWrited.bind(this), this.ppuDataWrited.bind(this), this.oamDMAWrited.bind(this)]

        this.drawCallback = drawCallback

        // pointer from oamAddr
        this.oamPointer = 0  // Todo: is the initial value right?
        // pointer from ppuAddr
        this.vramPointer
        this.ppuAddrStep = 0

        this.bufferedByte
        // for fast vram fetch
        // Todo: support more cached name/attr tables instead of one
        this.cachedNames
        this.cachedPatternBytes
        this.cachedAttrs
    }

    // alias for ppuReg
    get ppuCtrl() { return this.ppuReg.innerBytes[0] }
    set ppuCtrl(byte) { this.ppuReg.innerBytes[0] = byte }

    get ppuMask() { return this.ppuReg.innerBytes[1] }
    set ppuMask(byte) { this.ppuReg.innerBytes[1] = byte }

    get ppuStatus() { return this.ppuReg.innerBytes[2] }
    set ppuStatus(byte) { this.ppuReg.innerBytes[2] = byte }

    get oamAddr() { return this.ppuReg.innerBytes[3] }
    set oamAddr(byte) { this.ppuReg.innerBytes[3] = byte }

    get oamData() { return this.ppuReg.innerBytes[4] }
    set oamData(byte) { this.ppuReg.innerBytes[4] = byte }

    get ppuScroll() { return this.ppuReg.innerBytes[5] }
    set ppuScroll(byte) { this.ppuReg.innerBytes[5] = byte }

    get ppuAddr() { return this.ppuReg.innerBytes[6] }
    set ppuAddr(byte) { this.ppuReg.innerBytes[6] = byte }

    get ppuData() { return this.ppuReg.innerBytes[7] }
    set ppuData(byte) { this.ppuReg.innerBytes[7] = byte }

    get oamDMA() { return this.ppuReg.innerBytes[8] }
    set oamDMA(byte) { this.ppuReg.innerBytes[8] = byte }

    // callbacks when ppuReg read
    ppuStatusRead(byte) {
        // clear vblank start bit
        this.clearVBlank()
    }

    ppuDataRead(byte) {
        // increase ppuAddr
        this.vramPointer += (this.ppuCtrl & PPU.VRAM_ADDR_INCR ? 32 : 1)
    }

    // callbacks when ppuReg writed
    oamAddrWrited(byte) {
        // write to oamAddrSpace
        this.oamPointer = byte
        // write to ppuReg
        const read = this.oamAddrSpace.read(byte)
        // a hadware bug(?) cause byte2 of sprite cannot be fully read 
        this.oamData = (byte & 0x0c === 0x02) ? read & 0xe3 : read
    }

    oamDataWrited(byte) {
        this.oamAddrSpace.write(this.oamPointer, byte)
        // increase oamAddr
        this.oamPointer = (this.oamPointer + 1) & 0xff
    }

    ppuAddrWrited(byte) {
        if (this.ppuAddrStep == 0) {
            // 6 higher bits
            this.vramPointer = (byte & 0x003f) << 8
            this.ppuAddrStep++
        } else {
            // 8 lower bits
            this.vramPointer |= byte
            this.ppuAddrStep = 0
            // write to ppuReg
            // buffer mechanism
            if (this.vramPointer < 0x3f00) {
                // only get last buffered data
                this.ppuData = /*typeof this.bufferedByte === "undefined" ? 0:*/ this.bufferedByte
                this.bufferedByte = this.addrSpace.read(this.vramPointer, false)
            } else {
                // immediate update for palette data
                this.bufferedByte = this.addrSpace.read(this.vramPointer, false)
                this.ppuData = this.bufferedByte
            }
        }
    }

    ppuDataWrited(byte) {
        // write to addrSpace
        this.addrSpace.write(this.vramPointer, byte)
        // increase ppuAddr
        this.vramPointer += (this.ppuCtrl & PPU.VRAM_ADDR_INCR ? 32 : 1)
    }

    oamDMAWrited(byte) {
        this.oamAddrSpace.DMA(byte)
    }

    // render methods
    // every 8x8 background pixels
    setVBlank(callBack) {
        this.ppuStatus |= PPU.VBLANK_START;
        (this.ppuCtrl & PPU.GEN_NMI_IN_VBLANK) && callBack && callBack()
    }

    clearVBlank() {
        this.ppuStatus &= ~PPU.VBLANK_START
    }

    getBgPixel(row, colomn, nameTableAddr, patternTableAddr) {
        // low 2 bits in from namet able
        const nameOffset = (row >> 3) * 32 + (colomn >> 3)
        const cachedName = this.cachedNames[nameOffset]
        const name = typeof cachedName === "undefined" ? this.cachedNames[nameOffset] = this.addrSpace.read(nameTableAddr + nameOffset) : cachedName

        // pattern byte for current row
        const patternByte0Addr = patternTableAddr + name * 16 + (row & 0x7)
        const patternByte1Addr = patternByte0Addr + 8

        const cachedPatternByte0 = this.cachedPatternBytes[patternByte0Addr]
        const cachedPatternByte1 = this.cachedPatternBytes[patternByte1Addr]
        const patternByte0 = typeof cachedPatternByte0 === "undefined" ? this.cachedPatternBytes[patternByte0Addr] = this.addrSpace.read(patternByte0Addr) : cachedPatternByte0
        const patternByte1 = typeof cachedPatternByte1 === "undefined" ? this.cachedPatternBytes[patternByte1Addr] = this.addrSpace.read(patternByte1Addr) : cachedPatternByte1
        const shift = ~colomn & 0x7
        const mask = 1 << shift
        const patternBit0 = (patternByte0 & mask) >> shift
        const patternBit1 = (patternByte1 & mask) >> shift << 1
        const paletteLow = patternBit1 | patternBit0

        if (!paletteLow) return paletteLow

        // high 2 bits from attribute table
        const attrTableAddr = nameTableAddr + 960
        const attrOffset = (row >> 5) * 8 + (colomn >> 5)
        const cachedAttr = this.cachedAttrs[attrOffset]
        const attr = typeof cachedAttr === "undefined" ? this.cachedAttrs[attrOffset] = this.addrSpace.read(attrTableAddr + attrOffset) : cachedAttr

        const offset = ((row & 0x10) >> 2) | ((colomn & 0x10) >> 3)
        const paletteHigh = (attr & (3 << offset)) >> offset << 2

        return paletteHigh | paletteLow
    }

    fillSpriteBlockPixels(pixels, pixelIdx, palHigh, patternLowStartAddr, patternHighStartAddr) {
        for (let row = 0; row < 8; row++) {
            const lowPatternByte = this.addrSpace.read(patternLowStartAddr + row)
            const highPatternByte = this.addrSpace.read(patternHighStartAddr + row) << 1
            for (let colomn = 7; colomn >= 0; colomn--) {
                const idxBit0 = (lowPatternByte >> colomn) & 1
                const idxBit1 = (highPatternByte >> colomn) & 2
                const palLow = idxBit1 | idxBit0
                // whether transprant or not
                if (palLow) {
                    const paletteIdx = 0x10 | palHigh | palLow
                    pixels[pixelIdx++] = paletteIdx
                } else {
                    pixels[pixelIdx++] = 0x20
                }
            }  // for colomn
        }  // for row
    }

    getSprite8Pixel(pIdx, palHigh, patternTableStartAddr) {
        // low 2 bits of palette idx
        const patternLowStartAddr = patternTableStartAddr + 16 * pIdx
        const patternHighStartAddr = patternLowStartAddr + 8

        const pixels = new Uint8Array(8 * 8)
        this.fillSpriteBlockPixels(pixels, 0, palHigh, patternLowStartAddr, patternHighStartAddr)
        return pixels
    }

    getSprite16Pixel(pIdx, palHigh) {
        // pattern table determined by bit0 of pIdx
        const patternTableStartAddr = pIdx & 1 ? 0x1000 : 0x0000
        // bit0 now become useless
        pIdx &= 0xfe
        // low 2 bits of palette idx
        const topSpriteLowBitsStartAddr = patternTableStartAddr + 16 * pIdx
        const topSpriteHighBitsStartAddr = topSpriteLowBitsStartAddr + 8
        const bottomSpriteLowBitsStartAddr = topSpriteHighBitsStartAddr + 8
        const bottomSpriteHighBitsStartAddr = bottomSpriteLowBitsStartAddr + 8

        const pixels = new Uint8Array(8 * 16)
        for (let part = 0; part < 2; part++) {
            const patternLowStartAddr = part === 0 ? topSpriteLowBitsStartAddr : bottomSpriteLowBitsStartAddr
            const patternHighStartAddr = part === 0 ? topSpriteHighBitsStartAddr : bottomSpriteHighBitsStartAddr
            this.fillSpriteBlockPixels(pixels, part * 64, palHigh, patternLowStartAddr, patternHighStartAddr)
        } // for part
        return pixels
    }

    spriteFlip(flipBits, pixels, height) {
        switch (flipBits) {
            case 3: // vertically & horizontally
                pixels.reverse()
                return
            case 2: // vertically
                pixels.reverse()
                for (let i = 0; i < height; ++i) {
                    const currRow = new Uint8Array(pixels.buffer, i * 8, 8)
                    currRow.reverse()
                }
                return
            case 1: // horizontally
                for (let i = 0; i < height; ++i) {
                    const currRow = new Uint8Array(pixels.buffer, i * 8, 8)
                    currRow.reverse()
                }
                return
            case 0: // none
                return
        }
    }

    makeTransparent(blkPixels, row, colomn, height, isSp0) {
        const { pixels } = this.drawCallback
        let bIdx = 0
        if (!isSp0) {
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < 8; c++, bIdx++) {
                    if (blkPixels[bIdx] < 0x20) continue
                    const pIdx = this.drawCallback.getIdxByRowColomn(row + r, colomn + c)
                    if (pIdx < 0) continue
                    blkPixels[bIdx] = pixels[pIdx]
                }
            }
            return false
        } else {
            let hit = false
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < 8; c++, bIdx++) {
                    const pIdx = this.drawCallback.getIdxByRowColomn(row + r, colomn + c)
                    if (pIdx < 0) continue
                    if (blkPixels[bIdx] < 0x20) {
                        if (!hit && pixels[pIdx]) { hit = true }
                        continue
                    }
                    blkPixels[bIdx] = pixels[pIdx]
                }
            }
            return hit
        }
    }

    makeUnderBg(blkPixels, row, colomn, height) {
        const { pixels } = this.drawCallback
        let bIdx = 0
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < 8; c++, bIdx++) {
                const pIdx = this.drawCallback.getIdxByRowColomn(row + r, colomn + c)
                if (pIdx < 0) continue
                if (pixels[pIdx] || blkPixels[bIdx] > 0x1f) {
                    blkPixels[bIdx] = pixels[pIdx]
                }
            }
        }
    }

    render() {
        const currPPUMask = this.ppuMask // | 0xff // Todo: enable ppuMask
        if (currPPUMask & PPU.SHOW_BG) {
            this.cachedNames = Array(960)
            this.cachedPatternBytes = Array(0x1000)
            this.cachedAttrs = Array(64)
            for (let row = 0; row < 240; row++) {
                const scanline = this.drawCallback.scanlines[row]
                const nameTableAddr = 0x2000 + ((this.ppuCtrl & PPU.BASE_NAME_TABLE) << 10)
                const patternTableAddr = (this.ppuCtrl & PPU.BG_PATTERN_TABLE) << 8
                for (let colomn = 0; colomn < 256; colomn++) {
                    scanline[colomn] = this.getBgPixel(row, colomn, nameTableAddr, patternTableAddr)
                }
            }
        }
        if (currPPUMask & PPU.SHOW_SP) {
            // draw sprite
            // Todo: 
            const patternTableStartAddr = this.ppuCtrl & PPU.SP_PATTERN_TABLE ? 0x1000 : 0x0000
            const height = this.ppuCtrl & PPU.SP_HEIGHT ? 16 : 8 // determine sprite's height
            const oam = this.oamAddrSpace.mem  // direct access for performance
            for (let i = 0xfc /* from back to front */; i >= 0; i -= 4) {
                // skip sprites out of boundary 
                if (oam[i + 0] >= 0xef) continue

                const underBg = oam[i + 2] & 0x20
                // if (oam[i + 2] & 0x20) continue

                const flipped = oam[i + 2] & 0xc0 >> 6
                const pIdx = oam[i + 1]
                const palHigh = (oam[i + 2] & 0x03) << 2

                const row = oam[i + 0] + 1
                const colomn = oam[i + 3]

                let pixels
                try {
                    if (height === 8) {
                        pixels = this.getSprite8Pixel(pIdx, palHigh, patternTableStartAddr)
                    } else {
                        pixels = this.getSprite16Pixel(pIdx, palHigh)
                    }
                    flipped && this.spriteFlip(flipped, pixels, height)
                    underBg ? this.makeUnderBg(pixels, row, colomn, height) : this.makeTransparent(pixels, row, colomn, height)
                    this.drawCallback.drawBgBlock(row, colomn, 8, height, pixels)
                } catch (e) {
                    // catch range error
                    // throw e
                    console.error("error in sprite render")
                }
            }
        }
    }  // render
}  // ppu

// $2000
PPU.BASE_NAME_TABLE = 0x03
PPU.VRAM_ADDR_INCR = 0x04
PPU.SP_PATTERN_TABLE = 0x08
PPU.BG_PATTERN_TABLE = 0x10
PPU.SP_HEIGHT = 0x20
PPU.GEN_NMI_IN_VBLANK = 0x80
// $2001
PPU.SHOW_BG = 0x08
PPU.SHOW_SP = 0x10
// $2002
PPU.VBLANK_START = 0x80

module.exports = PPU