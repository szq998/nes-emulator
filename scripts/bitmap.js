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

class BitMap8Bit {
    constructor(width, height, colorPalette) {
        let colorCount
        if (colorPalette instanceof Uint8Array && colorPalette.length % 4 !== 0) {
            colorCount = colorPalette.length / 4
        } else if (colorPalette instanceof Uint32Array) {
            colorCount = colorPalette.length
        } else {
            throw "Illegal color palette."
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
        const bfOffBits = headerSize + colorCount * 4
        this.imgStart = bfOffBits
        const bfSize = bfOffBits + biSizeImage

        this.data = new Uint8Array(bfSize)
        this.dataView = new DataView(this.data.buffer)
        // set Header 
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
        this.setHeaderValue(colorCount, ...header.biClrUsed)
        this.setHeaderValue(colorCount, ...header.biClrImportant)
        // set color palette
        if (colorPalette instanceof Uint32Array) {
            let uint8Pal = new Uint8Array(colorPalette.buffer)
            this.data.set(uint8Pal, headerSize)
        } else if (colorPalette instanceof Uint8Array) {
            this.data.set(colorPalette, headerSize)
        }
    }

    setHeaderValue(val, offset, size, signed = false) {
        // header value is 2 or 4 bytes
        let setterName = "set"
        setterName += (signed ? "Int" : "Uint")
        setterName += (size < 4 ? "16" : "32")
        this.dataView[setterName](offset, val, true)
    }

    get bmp() { return this.data }

    setPixelBlock(row, colomn, blkRowSize, blkColomnSize, blkPixels) {
        for (let i = 0; i < blkColomnSize; i++) {
            const sliceStart = i * blkRowSize
            const sliced = blkPixels.slice(sliceStart, sliceStart + blkRowSize)

            this.data.set(sliced, this.imgStart + this.widthWithPad * (i + row) + colomn)
        }
    }
}


module.exports = BitMap8Bit