# Cloud BBQ
A Bluetooth to MQTT bridge for the [Tenergy Solis Digital Meat Thermometer](https://www.amazon.com/Tenergy-Thermometer-Controlled-Bluetooth-Stainless/dp/B077821Z4C).

This code should run on MacOS or Linux.   Ideally you could run this on a Raspberry Pi to act as a small dedicated bridge device.

This code will also likely work with other similar Bluetooth probes that show up with the bluetooth device name "iBBQ", but may require a different pairing key.  See `autoPairKey` in `constHelper.js`.

## Using Cloud BBQ
* Note: Use Node 8 and not Node 10 due to compatibility with node-xpc-connection
* After cloning, run `npm install` or `yarn install`
* Edit `/config/default.json` with your MQTT information.
Tested with [Adafruit IO](https://io.adafruit.com) and local mqtt broker [Mosquitto](https://mosquitto.org/)
* Start with `node app.js`.  You may need to use `sudo` depending on your OS.
* Application will exit non-zero when there is an issue pairing with the device since it is easiest
to let the app die and restart to try to pair again.  You may want to use a process
manager like `forever` or as `systemctl` service to automatically restart the process.

### MacOS
Xcode is required for Noble's node-gyp compilation.

### Linux setup
See the [Noble Linux setup](https://github.com/noble/noble).

## Known Issues
Cloud BBQ depends on the noble library for Bluetooth LE which in turn depends on node-xpc-connection which currently doesn't work in NodeJS 10.  Cloud BBQ makes use of a PR branch of node-xpc-connection to add NodeJS 10 support, but this branch still only seems to work on MacOS.  For linux, using NodeJS 8 appears to be the only solution for now.

## Using with Adafruit IO
To setup to work with Adafruit IO, create a group, and then add 6 topics, then edit your default.json to look something like this:

```json
{
    "mqtt": {
        "username" : "USERNAME",
        "key":"KEY",
        "protocol":"mqtts",
        "url":"io.adafruit.com:8883",
        "topics":[
            "USERNAME/feeds/ibbq1",
            "USERNAME/feeds/ibbq2",
            "USERNAME/feeds/ibbq3",
            "USERNAME/feeds/ibbq4",
            "USERNAME/feeds/ibbq5",
            "USERNAME/feeds/ibbq6"
        ],
        "probeMessagePerPublish":12
    }
}
```

Note that Adafruit IO will only accept 30 messages per minute, and each message can only have 1 data point, so you need to dial down `probeMessagePerPublish` to keep under that limit.  The Solis sends one update per second, so you can set this to 2 if you have only one probe connected, or leave it at 12 if you have all 6 probes connected.

### Other MQTT Options
Cloud BBQ should be generally compatible with other MQTT services, however some like AWS IoT may require an additional library to make authentication easier.  Starting with Adafruit is recommended since it's both easy and has out of the box support for live updating graphs of temperature.
