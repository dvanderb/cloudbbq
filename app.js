const noble = require('noble')
const constHelper = require('./constHelper')
const tempHelper = require('./tempHelper')
const mqtt = require('mqtt')
const config = require('config')
const program = require('commander')

const mqttConfig = config.get('mqtt')

let mqttConnected = false
let msgCount = 0

program
    .version('1.1.0')
    .option('-p1, --probe1 <n>','Probe 1 Target Temperature(F)',parseInt)
    .option('-p2, --probe2 <n>','Probe 2 Target Temperature(F)',parseInt)
    .option('-p3, --probe3 <n>','Probe 3 Target Temperature(F)',parseInt)
    .option('-p4, --probe4 <n>','Probe 4 Target Temperature(F)',parseInt)
    .option('-p6, --probe5 <n>','Probe 5 Target Temperature(F)',parseInt)
    .option('-p7, --probe6 <n>','Probe 6 Target Temperature(F)',parseInt)
    .parse(process.argv)

const authString = mqttConfig.username !== '' ? `${mqttConfig.username}:${mqttConfig.key}@` : '';
const mqttConnString = `${mqttConfig.protocol}://${authString}${mqttConfig.url}`
const client = mqtt.connect(mqttConnString)

client.on('connect',()=>{
    mqttConnected = true
})

noble.startScanning()

let pairCharacteristic, tempCharacteristic, commandCharacteristic
let foundPeripheral;
noble.on('discover',(peripheral)=>{
    foundPeripheral = peripheral;
    // Check out this sample code: https://github.com/noble/noble/issues/179
    if (peripheral.advertisement.localName === 'iBBQ'){
        console.log('iBBQ Discovered')
        noble.stopScanning()

        peripheral.on('disconnect', () => {
            console.log('Lost connection to device.')

            if (mqttConnected) {
                for (let j = 0; j < 6; j++){
                    client.publish(mqttConfig.topics[j],JSON.stringify({
                        value:0, last_updated: Math.floor(Date.now() / 1000)
                    }));
                }
            }

            noble.startScanning()
        })

        peripheral.connect((error)=>{
            if (error){
                console.error(error)
            }
            else {
                connectToIBBQ(peripheral)
            }
        })
    }
})



function connectToIBBQ(peripheral) {
    console.log(`Connecting to device`)
    peripheral.discoverAllServicesAndCharacteristics((error,services,characteristics)=>{
        if(error){
            console.error(error)
        }
        else{
            console.log(`Got ${characteristics.length} charateristics..`);
            for (let characteristic of characteristics){
                switch(characteristic.uuid){
                case 'fff2':
                    pairCharacteristic = characteristic
                    break
                case 'fff4':
                    tempCharacteristic = characteristic
                    break
                case 'fff5':
                    commandCharacteristic = characteristic
                    break
                }
            }

            pairToDevice()
        }
    })
}

function pairToDevice() {
    console.log(`Pairing to device`);
    let connected = false;
    setTimeout(() => {
        if (! connected && foundPeripheral) {
            console.log(`Pairing timed out`);
            process.exit(1);
        }
    }, 5000);
    pairCharacteristic.write(constHelper.autoPairKey(),true, (error)=>{
        if (error){
            console.error(error)
        }
        else {
            connected = true;
            console.log('paired')
            subscribeToEvents()
        }
    })
}

function subscribeToEvents() {
    console.log(`Subscribing to events`)
    tempCharacteristic.subscribe((error)=>{
        if (error) {
            console.error(error)
        }
    })
    tempCharacteristic.on('data',(data) => handleTempEvent(data))

    console.log('setting units')
    commandCharacteristic.write(constHelper.setUnitsFKey(),false)
    console.log('sending start temp events')
    commandCharacteristic.write(constHelper.startTempUpdates(),false)

}

function handleTempEvent(data) {
    if (data && data.length == 12){
        const probeTemps = []
        for (let i = 0; i< 6; i++) {
            const rawTemp = data.readInt16LE(i*2)
            if (rawTemp != -10) {
                probeTemps.push(tempHelper.cToF(rawTemp/10))
            }
            else {
                probeTemps.push(0)
            }

        }
        console.log(`Probes 1: ${probeTemps[0]}F 2: ${probeTemps[1]}F 3: ${probeTemps[2]}F `+
            `4: ${probeTemps[3]}F 5: ${probeTemps[4]}F 5: ${probeTemps[5]}F`)
        if (mqttConnected){
            msgCount++
            for (let j = 0; j < 6; j++){
                if(msgCount % mqttConfig.probeMessagePerPublish == 0 && probeTemps[j] != null) {
                    client.publish(mqttConfig.topics[j],JSON.stringify({
                        value: probeTemps[j],
                        last_updated: Math.floor(Date.now() / 1000),
                    }));
                }
            }
        }
    }
    else {
        console.error('wierd empty or wrong size buffer')
    }
}
