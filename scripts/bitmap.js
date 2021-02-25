// 位图头信息结构
const header =
{
    bfType: [0, 2],// 总是BM
    bfSize: [2, 4],// BMP图像文件的大小
    bfReserved: [6, 4],// 总为0，本该是bfReserved1和bfReserved2
    bfOffBits: [10, 4],// BMP图像数据的地址

    biSize: [14, 4],// 本结构的大小，根据不同的操作系统而不同，在Windows中，此字段的值总为28h字节=40字节
    biWidth: [18, 4, true],// BMP图像的宽度，单位像素，有符号
    biHeight: [22, 4, true],// BMP图像的高度，单位像素，有符号
    biPlanes: [26, 2],// 总为1
    biBitCount: [28, 2],// BMP图像的色深，即一个像素用多少位表示，常见有1、4、8、16、24和32，分别对应单色、16色、256色、16位高彩色、24位真彩色和32位增强型真彩色
    biCompression: [30, 4],// 压缩方式，0表示不压缩，1表示RLE8压缩，2表示RLE4压缩，3表示每个像素值由指定的掩码决定
    biSizeImage: [34, 4],// BMP图像数据大小，必须是4的倍数，图像数据大小不是4的倍数时用0填充补足
    biXPelsPerMeter: [38, 4, true],// 水平分辨率，单位像素/m，有符号
    biYPelsPerMeter: [42, 4, true],// 垂直分辨率，单位像素/m，有符号
    biClrUsed: [46, 4],// BMP图像使用的颜色，0表示使用全部颜色，对于256色位图来说，此值为100h=256
    biClrImportant: [50, 4]// 重要的颜色数，此值为0时所有颜色都重要，对于使用调色板的BMP图像来说，当显卡不能够显示所有颜色时，此值将辅助驱动程序显示颜色
};

// Todo: combine fc palette and bmp palette
class BitMap8Bit {
    constructor(width, height, paletteLen) {
        if (paletteLen > 0xff) {
            throw `Palette of length ${paletteLen} is too large for 8 bit bmp.`
        }

        const bytesPadedPerRow = width % 4 ? 4 - width % 4 : 0
        this.width = width
        this.widthWithPad = width + bytesPadedPerRow
        this.height = height
        // size with pad
        const biSizeImage = (width + bytesPadedPerRow) * height

        const bfHeaderSize = 14
        const biHeaderSize = 40
        const headerSize = bfHeaderSize + biHeaderSize
        const bfOffBits = headerSize + paletteLen * 4
        const bfSize = bfOffBits + biSizeImage
        // 4 byte align for uint32 write of palette
        this.dataAligned = new Uint8Array(bfSize + 2)
        this.alignOffset = 2
        this.data = new Uint8Array(this.dataAligned.buffer, this.alignOffset)
        this.pixels = new Uint8Array(this.data.buffer, bfOffBits + this.alignOffset)
        this.dataView = new DataView(this.data.buffer)
        this.palette = new Uint32Array(this.dataAligned.buffer, headerSize + this.alignOffset, paletteLen)
        // set Header 
        for (const p in header) {
            header[p][0] += this.alignOffset
        }
        this.setHeaderValue(0x4d42, ...header.bfType)
        this.setHeaderValue(bfSize, ...header.bfSize)
        this.setHeaderValue(0, ...header.bfReserved)
        this.setHeaderValue(bfOffBits, ...header.bfOffBits)

        this.setHeaderValue(biHeaderSize, ...header.biSize)
        this.setHeaderValue(width, ...header.biWidth)
        this.setHeaderValue(-height, ...header.biHeight)
        this.setHeaderValue(1, ...header.biPlanes)
        this.setHeaderValue(8, ...header.biBitCount)
        this.setHeaderValue(0, ...header.biCompression)
        this.setHeaderValue(biSizeImage, ...header.biSizeImage)
        this.setHeaderValue(0, ...header.biXPelsPerMeter)
        this.setHeaderValue(0, ...header.biYPelsPerMeter)
        this.setHeaderValue(paletteLen, ...header.biClrUsed)
        this.setHeaderValue(paletteLen, ...header.biClrImportant)
    }

    setHeaderValue(val, offset, size, signed = false) {
        // header value is 2 or 4 bytes
        let setterName = "set"
        setterName += (signed ? "Int" : "Uint")
        setterName += (size < 4 ? "16" : "32")
        this.dataView[setterName](offset, val, true)
    }

    get bmp() { return this.data }

    getIdxByRowColomn(row, colomn) {
        if (row < this.height && colomn < this.width) return row * this.widthWithPad + colomn
        else return -1
    }

    setPixelBlock(row, colomn, blkRowSize, blkColomnSize, blkPixels) {
        const sliceLen = Math.min(blkRowSize, this.widthWithPad - colomn)
        for (let i = 0; i < blkColomnSize; i++) {
            // const sliceStart = i * blkRowSize
            // const sliced = blkPixels.slice(sliceStart, sliceStart + blkRowSize)
            const offset = this.getIdxByRowColomn(row + i, colomn)
            if (offset < 0) return
            const sliced = new Uint8Array(blkPixels.buffer, i * blkRowSize, sliceLen)  // bypass memory copy
            this.pixels.set(sliced, offset)
        }
    }
}


module.exports = BitMap8Bit