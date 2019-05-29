const fs = require('fs');

let path = "./20";
let writePath = path + ".csv";
let wStream = fs.createWriteStream(writePath);


let buffer = fs.readFileSync(path);
for(let j = 0; j < buffer.length; j+=16){

    let msg = buffer.slice(j, j + 16);
    let s = String(msg.slice(0, 4).readUInt32LE() + ",").padEnd(10);
    for (let i = 0; i < 6; i++) {

        let num = msg.slice(4 + i * 2, 4 + i * 2 + 2).readInt16LE();
        if(i < 3){
            num = num / 16384;
        }
        else{
            num = num/131;
        }

        if (i == 5) {
            s += num.toFixed(6) + "\n";
        }
        else {
            s += String(num.toFixed(6) + ",").padEnd(12);
        }
        if (i == 2) s += "    ";
    }

    wStream.write(s);
    process.stdout.write(String(j).padEnd(4) + "\r");
    // console.log(s);

}
wStream.end();
console.log("\nDONE");

// fs.readFile(path, (err, msg)=>{
//     if(err) return console.log(err);
// })
