var pkgInfo = require('./package.json');
var Service = require('webos-service');
var os = require('os');
var dgram = require('dgram');
var service = new Service(pkgInfo.name);

const broadcastPort = 42830;
const subscriptionPort = 42831;

const broadcastInterval = 1000; //ms

var modelName = "Name unavailable";
service.call("luna://com.webos.service.tv.systemproperty/getSystemInfo", {
    "keys": ["modelName"]
}, function (inResponse) {
    var isSucceeded = inResponse.returnValue;

    if (isSucceeded){
        modelName = inResponse.modelName;
    } else {
    }
});

function getMACAddress()
{
    let ifaces = os.networkInterfaces();
    for(let ifaceName of Object.keys(ifaces))
    {
        if(ifaceName.startsWith("wlan") || ifaceName.startsWith("eth") || ifaceName.startsWith("Ethernet"))
        {
            let iface = ifaces[ifaceName];
            for(let ifaceProps of iface)
            {
                if("mac" in ifaceProps && ifaceProps.mac != "00:00:00:00:00:00")
                {
                    return ifaceProps.mac;
                }
            }
        }
    }
    return null;
}

var unicastDataActive = false;
const clientTimeout = 3000;
const sendKeepaliveFrequency = 1000;
var unicastClient = null;
var unicastRInfo = null;
function startUnicastingData(client, rinfo, request)
{
	unicastDataActive = true;
    unicastClient = client;
    unicastRInfo = rinfo;

    // Settings
    let settings = {};
    
    if("updateFreq" in request) settings.updateFrequency = request.updateFreq;
    else settings.updateFrequency = 33;
    
    if("filter" in request) settings.filter = request.filter;
    else settings.filter = [
        "returnValue",
        "deviceId",
        "coordinate",
        "gyroscope",
        "acceleration",
        "quaternion"
    ];
    
    let clientKeepaliveTs = Date.now();
    client.on("message", function(msgBuf, rinfoKl){
        if(rinfo.address === rinfoKl.address && rinfo.port === rinfoKl.port)
        {
            clientKeepaliveTs = Date.now();
        }
        //TODO: parse any incoming msg
    });

    
    let serviceKeepaliveTs = Date.now();
    let sendKeepalive = function()
    {
        let msg = JSON.stringify({t:"keepalive"});
        client.send(msg, 0, msg.length, rinfo.port, rinfo.address);
        serviceKeepaliveTs = Date.now();
    }
    sendKeepalive();
    let ival = setInterval(function(){ 
        if(!unicastDataActive)
        {
            clearInterval(ival);
            return;
        }

        if(Date.now() - clientKeepaliveTs > clientTimeout){
            // client timed out
            //TODO: enable keepalive
            unicastDataActive = false;

            let waitTimer = setInterval(function(){
                if(client == null)
                {
                    clearInterval(waitTimer);
                    startBroadcastingAdvertisement();
                }
            }, 100);
        }
        else if(Date.now() - serviceKeepaliveTs > sendKeepaliveFrequency){
            sendKeepalive();
        }
    }, 1000);

    let options = {};
    options.callbackInterval = 1;
    options.subscribe = true;
    options.sleep = true;
    options.autoAlign = false;
    
    let lastUpdateTs = Date.now();

    let setupSensorSubscription = function()
    {
        let subscriptionHandle = service.subscribe("luna://com.webos.service.mrcu/sensor/getSensorData", options);
        subscriptionHandle.on("response", function (inResponse) {
            if(!unicastDataActive)
            {
                subscriptionHandle.cancel();
                client.close();
                client = null;
                return;
            }
            if(Date.now() - lastUpdateTs < 1000/settings.updateFrequency) 
            {
                return true;
            }
    
            let payloadData = "";
            try{
                payloadData = buildUpdatePayload(inResponse.payload, settings).toString("base64");
            }catch(ex){
                log += "buildUpdatePayload failed"
                return true;
            }
    
            let msg = {
                t: "remote_update",
                payload: payloadData
            };
            let msgStr = JSON.stringify(msg);
            client.send(msgStr, 0, msgStr.length, rinfo.port, rinfo.address);
            lastUpdateTs = Date.now();
            return true;
        });
        subscriptionHandle.on("cancel", function(msg){
            if(!unicastDataActive)
            {
                return;
            }
            setupSensorSubscription();
        });
    };
    setupSensorSubscription();
}

function onInput(parameters)
{
    let msg = JSON.stringify({
        t:"input",
        parameters: parameters
    });
    unicastClient.send(msg, 0, msg.length, unicastRInfo.port, unicastRInfo.address);
}

function buildUpdatePayload(data, settings)
{
    let size = 0;
    for(let entry of settings.filter)
    {
        switch(entry)
        {
            case "returnValue": size += 1; break;
            case "deviceId": size += 1; break;
            case "coordinate": size += 4*2; break;
            case "gyroscope": size += 4*3; break;
            case "acceleration": size += 4*3; break;
            case "quaternion": size += 4*4; break;
        }
    }

    let buffer = Buffer.alloc(size);
    let offset = 0;
    for(let entry of settings.filter)
    {
        switch(entry)
        {
            case "returnValue": buffer.writeUInt8(data.returnValue ? 1 : 0, offset++); break;
            case "deviceId": buffer.writeUInt8(data.deviceId, offset++); break;
            case "coordinate": {
                buffer.writeInt32LE(data.coordinate.x, offset); offset += 4;
                buffer.writeInt32LE(data.coordinate.y, offset); offset += 4;
            } break;
            case "gyroscope": {
                buffer.writeFloatLE(data.gyroscope.x, offset); offset += 4;
                buffer.writeFloatLE(data.gyroscope.y, offset); offset += 4;
                buffer.writeFloatLE(data.gyroscope.z, offset); offset += 4;
            } break;
            case "acceleration": {
                buffer.writeFloatLE(data.acceleration.x, offset); offset += 4;
                buffer.writeFloatLE(data.acceleration.y, offset); offset += 4;
                buffer.writeFloatLE(data.acceleration.z, offset); offset += 4;
            } break;
            case "quaternion": {
                buffer.writeFloatLE(data.quaternion.q0, offset); offset += 4;
                buffer.writeFloatLE(data.quaternion.q1, offset); offset += 4;
                buffer.writeFloatLE(data.quaternion.q2, offset); offset += 4;
                buffer.writeFloatLE(data.quaternion.q3, offset); offset += 4;
            } break;
        }
    }
    return buffer;
}

var log = ""

var broadcastAdsActive = false;
function startBroadcastingAdvertisement()
{
    broadcastAdsActive = true;

    let subscriptionClient = dgram.createSocket('udp4');
    let subscribeMsgHandler = function(msgBuf, rinfo){
        try{
            let msg = JSON.parse(msgBuf.toString('utf8'));
            if("t" in msg && msg.t == "sub_sensor")
            {
                //todo: parse msg [Buffer] (pkt id, any config options)
                //subscriptionClient.off("message", subscribeMsgHandler);
                broadcastAdsActive = false;
                startUnicastingData(subscriptionClient, rinfo, msg);
            }
        }catch(ex){}
    };
    subscriptionClient.on("message", subscribeMsgHandler);

    subscriptionClient.bind(subscriptionPort, undefined, function()
    {
        let broadcastClient = dgram.createSocket('udp4');
        broadcastClient.bind(broadcastPort, undefined, function() 
        {
            broadcastClient.setBroadcast(true);
    
            let ival = setInterval(function()
            {
                if(broadcastAdsActive)
                {
                    let msg = JSON.stringify({
                        t:"magic4pc_ad",
                        version: 1,
                        model: modelName,
                        port: subscriptionPort,
                        mac: getMACAddress()
                        //todo: mac addr or uuid, (modelname)
                        //todo: ip addr+port
                    });
                    broadcastClient.send(msg, 0, msg.length, broadcastPort, "255.255.255.255");
                }
                else
                {
                    broadcastClient.close();
                    clearInterval(ival);
                }
            }, broadcastInterval);
        });
    });
}

var serviceActive = false;
var keepAliveActivity = null;
service.register("start", function(message) {
    if(serviceActive)
    {
        message.respond({
			//TODO
        });
        return;
    }

    serviceActive = true;
    service.activityManager.create("keepAlive", function(activity) {
        keepAliveActivity = activity;
    });
    startBroadcastingAdvertisement();
    message.respond({
        //TODO
    });
});

service.register("onInput", function(message) {
    if(unicastDataActive)
    {
        onInput(message.payload);
    }
    message.respond({
        //TODO
    });
});

service.register("stop", function(message) {
    if(!serviceActive)
    {
        message.respond({
			//TODO
        });
        return;
    }

    serviceActive = false;
    service.activityManager.complete(keepAliveActivity, function(activity) {});
    keepAliveActivity = null;
    broadcastAdsActive = false;
	unicastDataActive = false;
    message.respond({
        //TODO
    });
});

service.register("query", function(message) {
    message.respond({
        status: log, //TODO: is broadcasting/unicasting? connection info? magic remote sub info?
        serviceActive: serviceActive,
        broadcastAdsActive: broadcastAdsActive,
        isConnected: unicastDataActive,
        unicastRInfo: unicastDataActive ? unicastRInfo : null
    });
});
