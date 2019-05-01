var udp = require('dgram');
const fs = require('fs');
// --------------------creating a udp server --------------------

// creating a udp server
var server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error',function(error){
  console.log('Error: ' + error);
  server.close();
});



// make a dir at parent
const KV_ACC_LOG_DIR = '../kv_acc_log';
if (!fs.existsSync(KV_ACC_LOG_DIR)){
    fs.mkdirSync(KV_ACC_LOG_DIR);
}


let writeStreams = {}; // each one for each device
let addr_to_espid = {};

// emits on new datagram msg
server.on('message',function(msg,info){
    let addr = `udp:${info.address}:${info.port}`;
    
    if(msg.length == 28){
        let s = String(msg.slice(0,4).readInt32LE() + ",").padEnd(10);
        for(let i = 1; i <= 6; i++){
            if(i == 6){
                s+= msg.slice(i*4,i*4+4).readFloatLE().toFixed(6) + "\n";
            }
            else{
                s+= String(msg.slice(i*4,i*4+4).readFloatLE().toFixed(6) + ",").padEnd(12);
            }
            if(i == 3) s+= "    ";
        }


        let espid = addr_to_espid[addr];
        if(espid && writeStreams[espid]){
            writeStreams[espid].write(s);

            if(writeStreams[espid].kvMsgCount) writeStreams[espid].kvMsgCount++;
            else writeStreams[espid].kvMsgCount = 1;
            process.stdout.write(`${espid}: ${String(writeStreams[espid].kvMsgCount)}`.padEnd(50) + "\r");
        }
        else{
            // console.log(s);
        }
    }
    else{
        let utf_msg = msg.toString();
        console.log(utf_msg);
        if(utf_msg.startsWith("start:")){
            let m = utf_msg.match(/start:espid:([a-f0-9]{12})/);
            if(m){
                let espid = m[1];
                addr_to_espid[addr] = espid;

                if(writeStreams[espid]){
                    writeStreams[espid].end();
                }
                
                let path = KV_ACC_LOG_DIR + `/${espid}-${new Date().toISOString()}.csv`;
                writeStreams[espid] = fs.createWriteStream(path);

            }
            else{
                console.log(utf_msg);
            }
        }
        else if(utf_msg.startsWith("stop:")){
            let m = utf_msg.match(/stop:espid:([a-f0-9]{12})/);
            if(m){
                let espid = m[1];
                
                if(writeStreams[espid]){
                    writeStreams[espid].end();
                }
                
                delete addr_to_espid[addr]; // because it will stop, the ip will be given to another dev
            }
            else{
                console.log(utf_msg);
            }
        }
        else{
            console.log(utf_msg);
        }
        // invalid message
    }

});

//emits when socket is ready and listening for datagram msgs
server.on('listening',function(){
  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log('Server is listening at port' + port);
  console.log('Server ip :' + ipaddr);
  console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
server.on('close',function(){
  console.log('Socket is closed !');
});

server.bind(5555, "0.0.0.0");

setTimeout(function(){
    server.close();
},24 * 60 * 60 * 1000); // 1 day