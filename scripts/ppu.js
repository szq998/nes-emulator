
// const plaColor2RGBAColor = [
//     [0x7F, 0x7F, 0x7F, 0xFF], [0x20, 0x00, 0xB0, 0xFF], [0x28, 0x00, 0xB8, 0xFF], [0x60, 0x10, 0xA0, 0xFF],
//     [0x98, 0x20, 0x78, 0xFF], [0xB0, 0x10, 0x30, 0xFF], [0xA0, 0x30, 0x00, 0xFF], [0x78, 0x40, 0x00, 0xFF],
//     [0x48, 0x58, 0x00, 0xFF], [0x38, 0x68, 0x00, 0xFF], [0x38, 0x6C, 0x00, 0xFF], [0x30, 0x60, 0x40, 0xFF],
//     [0x30, 0x50, 0x80, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF],

//     [0xBC, 0xBC, 0xBC, 0xFF], [0x40, 0x60, 0xF8, 0xFF], [0x40, 0x40, 0xFF, 0xFF], [0x90, 0x40, 0xF0, 0xFF],
//     [0xD8, 0x40, 0xC0, 0xFF], [0xD8, 0x40, 0x60, 0xFF], [0xE0, 0x50, 0x00, 0xFF], [0xC0, 0x70, 0x00, 0xFF],
//     [0x88, 0x88, 0x00, 0xFF], [0x50, 0xA0, 0x00, 0xFF], [0x48, 0xA8, 0x10, 0xFF], [0x48, 0xA0, 0x68, 0xFF],
//     [0x40, 0x90, 0xC0, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF],

//     [0xFF, 0xFF, 0xFF, 0xFF], [0x60, 0xA0, 0xFF, 0xFF], [0x50, 0x80, 0xFF, 0xFF], [0xA0, 0x70, 0xFF, 0xFF],
//     [0xF0, 0x60, 0xFF, 0xFF], [0xFF, 0x60, 0xB0, 0xFF], [0xFF, 0x78, 0x30, 0xFF], [0xFF, 0xA0, 0x00, 0xFF],
//     [0xE8, 0xD0, 0x20, 0xFF], [0x98, 0xE8, 0x00, 0xFF], [0x70, 0xF0, 0x40, 0xFF], [0x70, 0xE0, 0x90, 0xFF],
//     [0x60, 0xD0, 0xE0, 0xFF], [0x60, 0x60, 0x60, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF],

//     [0xFF, 0xFF, 0xFF, 0xFF], [0x90, 0xD0, 0xFF, 0xFF], [0xA0, 0xB8, 0xFF, 0xFF], [0xC0, 0xB0, 0xFF, 0xFF],
//     [0xE0, 0xB0, 0xFF, 0xFF], [0xFF, 0xB8, 0xE8, 0xFF], [0xFF, 0xC8, 0xB8, 0xFF], [0xFF, 0xD8, 0xA0, 0xFF],
//     [0xFF, 0xF0, 0x90, 0xFF], [0xC8, 0xF0, 0x80, 0xFF], [0xA0, 0xF0, 0xA0, 0xFF], [0xA0, 0xFF, 0xC8, 0xFF],
//     [0xA0, 0xFF, 0xF0, 0xFF], [0xA0, 0xA0, 0xA0, 0xFF], [0x00, 0x00, 0x00, 0xFF], [0x00, 0x00, 0x00, 0xFF]
// ]


class PPU {
    constructor(addrSpace, oamAddrSpace, ppuReg, drawCallback) {
        this.addrSpace = addrSpace // a.k.a vram
        this.oamAddrSpace = oamAddrSpace
        this.ppuReg = ppuReg
        this.ppuReg.regReadCallbacks = [null, null, this.ppuStatusRead.bind(this), null, this.oamDataRead.bind(this), null, null, this.ppuDataRead.bind(this)]
        this.ppuReg.regWritedCallbacks = [null, null, null, this.oamAddrWrited.bind(this), this.oamDataWrited.bind(this), null, this.ppuAddrWrited.bind(this), this.ppuDataWrited.bind(this), this.oamDMAWrited.bind(this)]

        this.drawCallback = drawCallback

        // pointer from oamAddr
        this.oamPointer = 0  // Todo: is the initial value right?
        // pointer from ppuAddr
        this.vramPointer
        this.ppuAddrStep = 0

        this.bufferedByte
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

    oamDataRead(byte) {
        // increase oamAddr
        this.oamPointer = (this.oamPointer + 1) & 0xff
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

    getBgPixelsByBlk(rowOfBlk, colomnOfBlk, nTbNo) {
        const nameTableStartAddr = 0x2000 + nTbNo * 0x400
        // 获取属性
        // 当前8x8像素块的行列号
        // const rowOfBlk = blkNo >> 5  // integerly minus 32
        // const colomnOfBlk = blkNo % 32
        // 当前8x8像素块所在的32x32像素块的行列号, AttrBlk即为32x32像素块
        const rowOfAttrBlk = rowOfBlk >> 3
        const colomnOfAttrBlk = colomnOfBlk % 8
        // 获取属性表对应字节 
        const attributeIdx = rowOfAttrBlk * 8 + colomnOfAttrBlk
        const attributeStartAddr = nameTableStartAddr + 960
        // Todo:// 直接访问VRAM，不通过read方法
        const attribute = this.addrSpace.read(attributeStartAddr + attributeIdx)
        // 获取属性表对应字节对应两位
        const firstBlkRowOfAttrBlk = rowOfAttrBlk * 4
        const firstBlkColomnOfAttrBlk = colomnOfAttrBlk * 4
        // 调色盘索引的高两位
        let paletteIdxFromAttr = attribute
        paletteIdxFromAttr >>= rowOfBlk - firstBlkRowOfAttrBlk < 2 ? 0 : 4
        paletteIdxFromAttr >>= colomnOfBlk - firstBlkColomnOfAttrBlk < 2 ? 0 : 2
        paletteIdxFromAttr = (paletteIdxFromAttr & 0x3) << 2

        // 获取图案
        const blkNo = rowOfBlk * 32 + colomnOfBlk
        const patternTableStartAddr = this.ppuCtrl & PPU.BG_PATTERN_TABLE ? 0x1000 : 0x0000
        const patternIdx = this.addrSpace.read(nameTableStartAddr + blkNo)
        // low 2 bits of palette idx
        const patternLowStartAddr = patternTableStartAddr + 16 * patternIdx
        const patternHighStartAddr = patternLowStartAddr + 8

        // 获取调色盘中的颜色
        const bgPaletteStartAddr = 0x3f00
        const pixels = new Uint8Array(8 * 8)
        let pixelIdx = 0
        for (let row = 0; row < 8; row++) {
            const lowPatternByte = this.addrSpace.read(patternLowStartAddr + row)
            const highPatternByte = this.addrSpace.read(patternHighStartAddr + row) << 1
            for (let colomn = 7; colomn >= 0; colomn--) {
                const idxBit0 = (lowPatternByte >> colomn) & 1
                const idxBit1 = (highPatternByte >> colomn) & 2
                const paletteIdxFromPatt = idxBit1 | idxBit0
                // whether universal background or not
                const paletteIdx = paletteIdxFromPatt ? (paletteIdxFromAttr | paletteIdxFromPatt) : 0

                pixels[pixelIdx++] = this.addrSpace.read(bgPaletteStartAddr + paletteIdx)
                // const rgbaColor = plaColor2RGBAColor[palColor]
                // pixels.push(rgbaColor)
            }  // for colomn
        }  // for row
        return pixels
    }

    getBgPixel(row, colomn) {
        // Todo: 
    }

    getSprite8Pixel(pIdx, palHigh, patternTableStartAddr, keepIntact) {
        // low 2 bits of palette idx
        const patternLowStartAddr = patternTableStartAddr + 16 * pIdx
        const patternHighStartAddr = patternLowStartAddr + 8

        const spPaletteStartAddr = 0x3f10
        const pixels = new Uint8Array(8 * 8)
        let pixelIdx = 0
        for (let row = 0; row < 8; row++) {
            const lowPatternByte = this.addrSpace.read(patternLowStartAddr + row)
            const highPatternByte = this.addrSpace.read(patternHighStartAddr + row) << 1
            for (let colomn = 7; colomn >= 0; colomn--) {
                const idxBit0 = (lowPatternByte >> colomn) & 1
                const idxBit1 = (highPatternByte >> colomn) & 2
                const palLow = idxBit1 | idxBit0
                // whether transprant or not
                if (palLow) {
                    const paletteIdx = palHigh | palLow
                    pixels[pixelIdx++] = this.addrSpace.read(spPaletteStartAddr + paletteIdx)
                } else {
                    const { startPoint, bmpWidth } = keepIntact
                    pixels[pixelIdx++] = keepIntact.pixels[startPoint + row * bmpWidth + (7 - colomn)]
                }
            }  // for colomn
        }  // for row
        return pixels
    }

    getSprite16Pixel(pIdx, palHigh, keepIntact) {
        // pattern table determined by bit0 of pIdx
        const patternTableStartAddr = pIdx & 1 ? 0x1000 : 0x0000
        // bit0 now become useless
        pIdx &= 0xfe
        // low 2 bits of palette idx
        const topSpriteLowBitsStartAddr = patternTableStartAddr + 16 * pIdx
        const topSpriteHighBitsStartAddr = topSpriteLowBitsStartAddr + 8
        const bottomSpriteLowBitsStartAddr = topSpriteHighBitsStartAddr + 8
        const bottomSpriteHighBitsStartAddr = bottomSpriteLowBitsStartAddr + 8

        const spPaletteStartAddr = 0x3f10
        const pixels = new Uint8Array(8 * 16)
        let pixelIdx = 0
        for (let part = 0; part < 2; part++) {
            const patternLowStartAddr = part === 0 ? topSpriteLowBitsStartAddr : bottomSpriteLowBitsStartAddr
            const patternHighStartAddr = part === 0 ? topSpriteHighBitsStartAddr : bottomSpriteHighBitsStartAddr
            for (let row = 0; row < 8; row++) {
                const lowPatternByte = this.addrSpace.read(patternLowStartAddr + row)
                const highPatternByte = this.addrSpace.read(patternHighStartAddr + row) << 1
                for (let colomn = 7; colomn >= 0; colomn--) {
                    const idxBit0 = (lowPatternByte >> colomn) & 1
                    const idxBit1 = (highPatternByte >> colomn) & 2
                    const palLow = idxBit1 | idxBit0
                    // whether transprant or not
                    if (palLow) {
                        const paletteIdx = palHigh | palLow
                        pixels[pixelIdx++] = this.addrSpace.read(spPaletteStartAddr + paletteIdx)
                    } else {
                        const { startPoint, bmpWidth } = keepIntact
                        pixels[pixelIdx++] = keepIntact.pixels[startPoint + (row + part * 8) * bmpWidth + (7 - colomn)]
                    }
                }  // for colomn
            }  // for row
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
                retur
            case 0: // none
                return
        }
    }

    render() {
        const currPPUMask = this.ppuMask | 0xff // Todo: enable ppuMask
        if (currPPUMask & PPU.SHOW_BG) {
            // draw background
            // 32x0 blocks, each block is made of 8x8 pixels
            for (let row = 0; row < 30; row++) {
                for (let colomn = 0; colomn < 32; colomn++) {
                    const pixels = this.getBgPixelsByBlk(row, colomn, 0)
                    // Todo: 更改渲染回调方式为直接写入位图
                    this.drawCallback.drawBgBlock(row * 8, colomn * 8, 8, 8, pixels)
                }
            }
        }
        if (currPPUMask & PPU.SHOW_SP) {
            // draw sprite
            // Todo: 
            const patternTableStartAddr = this.ppuCtrl & PPU.SP_PATTERN_TABLE ? 0x1000 : 0x0000
            const isHeight16 = this.ppuCtrl & PPU.SP_HEIGHT  // determine sprite's height
            const oam = this.oamAddrSpace.mem  // direct access or performance
            for (let i = 0xfc /* from back to front */; i >= 0; i -= 4) {
                // skip sprites out of boundary 
                if (oam[i + 0] >= 0xef) continue
                
                // Todo: under background sprite render
                // if (oam[i + 2] & 0x20) continue

                const flipped = oam[i + 2] & 0xc0 >> 6
                const pIdx = oam[i + 1]
                const palHigh = (oam[i + 2] & 0x03) << 2

                const row = oam[i + 0] + 1
                const colomn = oam[i + 3]

                // Todo: move this to outside of the loop
                const keepIntact = {
                    pixels: this.drawCallback.pixels,
                    bmpWidth: this.drawCallback.bmpWidth,
                    startPoint: row * this.drawCallback.bmpWidth + colomn
                }

                let pixels
                try {
                    if (!isHeight16) {
                        pixels = this.getSprite8Pixel(pIdx, palHigh, patternTableStartAddr, keepIntact)
                        flipped && this.spriteFlip(flipped, pixels, 8)
                        this.drawCallback.drawBgBlock(row, colomn, 8, 8, pixels)
                    } else {
                        pixels = this.getSprite16Pixel(pIdx, palHigh, keepIntact)
                        flipped && this.spriteFlip(flipped, pixels, 16)
                        this.drawCallback.drawBgBlock(row, colomn, 8, 16, pixels)
                    }
                } catch (e) {
                    // catch range error
                    console.log("error in sprite render")
                    throw e
                }
            }
        }
    }  // render
}  // ppu

// $2000
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