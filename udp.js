// GET IP

var os = require('os');
var ifaces = os.networkInterfaces();
let mobileIPAddress = [];
let finalMobileIPAddress = "";
Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            console.log(ifname + ':' + alias, iface.address);
        } else {
            // this interface has only one ipv4 adress
            console.log(ifname, iface.address);
            mobileIPAddress.push(iface.address); // assuming it happens to have only one IP address
        }
        ++alias;
    });
});

let ip192 = null;
for(let a of mobileIPAddress){
    if(a.startsWith("192.")){
        ip192 = a; 
    }
}

if(ip192){
    finalMobileIPAddress = ip192;
}
else{
    if(mobileIPAddress.length){
        finalMobileIPAddress = mobileIPAddress[0];
    }
}

// /*
let request = require('request');
request({
    url: "http://k.ai0.in/local-ip-discovery",
    method: 'POST',
    json: {
        ip: finalMobileIPAddress,
        server: true,
        client: false,
    }
}, function (error, response, body) {
    if (error) {
        console.warn("error", body);
    }
    if (body  && body.success) {
        console.log("SUCCESS: ", body.success);
    }
    else {
        console.log(body);
    }
});
// */


// --------------------creating a udp server --------------------
var udp = require('dgram');
const fs = require('fs');

// creating a udp server
var server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});



// make a dir at parent
const KV_ACC_LOG_DIR = '../kvacclog';
if (!fs.existsSync(KV_ACC_LOG_DIR)) {
    fs.mkdirSync(KV_ACC_LOG_DIR);
}


let writeStreams = {}; // each one for each device
let addr_to_espid = {};


// emits on new datagram msg
server.on('message', function (msg, info) {
    let addr = `udp:${info.address}:${info.port}`;

    if (msg.length == 20) {
        let espid = addr_to_espid[addr];
        if (espid && writeStreams[espid]) {
            writeStreams[espid].write(msg);
            
            if (writeStreams[espid].kvMsgCount) writeStreams[espid].kvMsgCount++;
            else writeStreams[espid].kvMsgCount = 1;


            let msgC = writeStreams[espid].kvMsgCount;
            if(msgC % 100 === 0){ // every 1 sec for 10 ms SR
                for(let eid of Object.keys(writeStreams)){
                    let C = writeStreams[eid].kvMsgCount;
                    process.stdout.write(`${eid.slice(0, 6)}(${C})  `);
                }
                process.stdout.write('\r');
            }
        }
        else {
            // start was not recognised
            // start it anyway with ip as espid
            let ip_espid = addr;
            addr_to_espid[addr] = ip_espid;

            if (writeStreams[ip_espid]) {
                writeStreams[ip_espid].end();
            }

            let path = KV_ACC_LOG_DIR + `/${ip_espid.replace(/:/g, "-")}-${new Date().toISOString().replace(/:/g, "-")}.bin`;
            writeStreams[ip_espid] = fs.createWriteStream(path);
        }
    }
    else {
        let utf_msg = msg.toString();
        console.log(utf_msg);
        if (utf_msg.startsWith("start:")) {
            let m = utf_msg.match(/start:espid:([a-f0-9]{12})/);
            if (m) {

                // SEND response
                server.send("STARTED", info.port, info.address, (err, bytes) => {
                    if (err) {
                        console.log("ERR SENDING RESPONSE: ", err);
                    }
                });

                

                let espid = m[1];
                addr_to_espid[addr] = espid;

                if (writeStreams[espid]) {
                    writeStreams[espid].end();
                }

                let path = KV_ACC_LOG_DIR + `/${espid}-${new Date().toISOString().replace(/:/g, "-")}.bin`;
                writeStreams[espid] = fs.createWriteStream(path);

            }
            else {
                console.log(utf_msg);
            }
        }
        else if (utf_msg.startsWith("stop:")) {
            let m = utf_msg.match(/stop:espid:([a-f0-9]{12})/);
            if (m) {
                let espid = m[1];

                if (writeStreams[espid]) {
                    writeStreams[espid].end();
                }

                delete addr_to_espid[addr]; // because it will stop, the ip will be given to another dev
            }
            else {
                console.log(utf_msg);
            }
        }
        else {
            console.log(" NOT recognised msg => ",utf_msg);
        }
        // invalid message
    }

});

//emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);

    console.log("<---- READY ---->\r\n");
});

//emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

server.bind(5555, "0.0.0.0");

setTimeout(function () {
    server.close();
}, 24 * 60 * 60 * 1000); // 1 day