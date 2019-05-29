let fs = require("fs");

let path = "./data/udp-192.168.43.56-49153-2019-05-29T12-49-09.175Z";
let readPath = path + ".bin";
let writePath = path + ".csv";
let rStream = fs.createReadStream(readPath);
let wStream = fs.createWriteStream(writePath);

rStream.on("readable", ()=>{
    while(1){ // while(1) is required or it will read only first chunk
        let s = "";
        let B = rStream.read(20);
        if(B){
            if(B.length == 20){
                let off = 0;
                s+= B.slice(off, off+4).readUInt32LE() + ","; off+=4;
                for (let i = 0; i < 6; i++) {
                    let num = B.slice(off, off+2).readInt16LE(); off+=2;
                    if(i < 3){
                        num = num / 16384.0;
                    }
                    else{
                        num = num/131.0;
                    }
    
                    s+= num.toFixed(6) + ",";
                }
                s+= B.slice(off, off+4).readFloatLE().toFixed(6);
                wStream.write(s + "\n");
            }
            else{
                console.log("B.len=" + B.length);
            }
        }
        else{
            break;
        }
    }
});

rStream.on("end", ()=>{
    wStream.end();
    console.log("DONE");
})
