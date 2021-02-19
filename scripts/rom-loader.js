let ROMPATH = "/assets/nestest.nes";
let romFile = $file.read(ROMPATH);
//console.log(romFile.toString().length)
//console.log(romFile.toString())
let romString = romFile.toString();
let romByte = [];
for (let i = 0; i < romString.length; ++i) {
  let c = romString.charCodeAt(i);
  romByte.push(c);
}

let  flag1 = romByte[6], flag2 = romByte[7];

//console.log(flag1, flag2)

let header = {
  prgCount: romByte[4] * 16 * 1024, // measured in byte
  chrCount: romByte[5] * 8 * 1024, // measured in byte
  mapper: (flag2 & 0xf0) | (flag1 & 0xf0) >> 4,
  
  fourScreen: !! (flag1 & 0x08),
  //trainer: new Boolean(flag1 & 0x04),
  sRam: !! (flag1 & 0x02),
  vertMirror: !! (flag1 & 0x01),
  
  //playChoice10: new Boolean(flag2 & 0x02),
  //vsUnisystem: new Boolean(flag2 & 0x01)
};

let rom = {
  prg: romByte.slice(16, 16 + header.prgCount),
  chr: romByte.slice(
    16 + header.prgCount,
    16 + header.prgCount + header.chrCount
  )
};

//console.log(header)
module.exports = {
  info: header,
  rom: rom
}
