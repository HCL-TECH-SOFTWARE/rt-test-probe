# rt-tcp-utils
Utilities for communicating between a JavaScript application and a C++ real-time application created with [DevOps Model RealTime](https://www.hcl-software.com/devops-model-realtime) or [DevOps Code RealTime](https://secure-dev-ops.github.io/code-realtime/). 

Feel free to extend `tcp-server.js` to cover your needs. Pull requests are welcome!

## Usage
Assuming that the real-time application you want to communicate with runs on `localhost` on port `9911` you define a TCP server like this:

```js
const tcpServer = require('./tcp-server')('localhost', 9911);
```

To also be able to receive events sent by the application register a callback function and start listen to events on a port (2234 is the default but can of course be replaced):

```js
tcpServer.setEventReceivedCallback(msgReceived);
tcpServer.startListenForEvents(2234) // Receive TCP requests from RT app on port 2234
.then((data) => {
    console.log("Ready to receive TCP requests");    
});
```

The callback function `msgReceived` will be called whenever the real-time application sends out an event. It has an object as argument that contains properties according to the [TCPServer documentation](https://github.com/HCL-TECH-SOFTWARE/lib-tcp-server). For example:

```js
if (msg.port == "trafficLight") {
	if (msg.event == "red") {
		// Event "red" received on the "trafficLight" port
		// ...
	}
}
```

To send an event call a function on the `tcpServer` object. For example:

```js
tcpServer.sendEvent('pedestrian', 'trafficLight'); // Send event "pedestrian" on the "trafficLight" port
```

## Example
This [Code RealTime application](https://github.com/secure-dev-ops/code-realtime/tree/main/art-samples/TrafficLightWeb) uses rt-tcp-utils.