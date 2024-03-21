# rt-test-probe
JavaScript implementation of a test probe for testing real-time applications created with [DevOps Model RealTime](https://www.hcl-software.com/devops-model-realtime).

This repo contains a few JavaScript utilities (in the file `testProbe.js`) which let you send and invoke events to a real-time application that uses the [TcpServer](https://github.com/HCL-TECH-SOFTWARE/lib-tcp-server) library. It also allows you intercept outgoing events sent or invoked by the real-time application.

Although this can be used as a means for general interaction with a real-time application from a JavaScript application, the main intended use case is to support testing of a real-time application. You can for example use the popular [Mocha](https://mochajs.org/) testing framework to write test cases for your real-time applications.

In the `models` folder you will find a few sample models, created with Model RealTime, which all are variants of the [traffic-light-web](https://github.com/HCL-TECH-SOFTWARE/traffic-light-web) sample application. In the `test` folder there are some Mocha tests for testing those models (both module testing, and unit testing of individual capsules).

Feel free to extend `testProbe.js` to cover your testing needs, whether you are using Mocha or another testing framework. Pull requests are welcome!

## Steps for running a Mocha capsule unit test
1. Start Model RealTime and import the "TrafficLight" project (located in the [trafficlight-demo](https://github.com/HCL-TECH-SOFTWARE/rt-test-probe/tree/main/models/trafficlight-demo) folder).
2. Build the TC it contains (`app.tcjs`). Note that it's set-up to build the application using Visual Studio and links with the prebuilt version of the TcpServer library that is part of Model RealTime. You need to update the TC if you want to use another target configuration.
3. Launch the built executable from Model RealTime or from the command-line. If you run it from the command-line start it like this:
```plaintext
executable.EXE -URTS_DEBUG=quit
```
4. You will see a printout similar to this:
```plaintext
RT C++ Target Run Time System - Release 8.0.02

targetRTS: observability listening not enabled
  Task 0 detached
TrafficLight starts up
Out message: { "event" : "lightChanged" , "type" : "RTString" , "data" : "RTString\"Red\"", "command" : "sendEvent", "priority" : "General", "port" : "trafficLight_control", "portIndex" : 0}
Error: Failed to write to socket for 127.0.0.1@2234: Connection refused: 127.0.0.1:2234
```
This just shows that the application sent the "lightChanged" event but failed to deliver it to the test application since it's not yet running.

5. Before you can start the test application you need to go to the `rt-test-probe` folder and run the command
```plaintext
npm install
```
This requires that you have Node.js installed.

6. Now you can run some unit tests for the TrafficLight capsule of the RT application that you launched. From the command-line you can do this:
```plaintext
D:\github\HCL-TECH-SOFTWARE\rt-test-probe>npm test test/TrafficLight_unit2.js

> rt-test-probe@0.0.1 test D:\github\HCL-TECH-SOFTWARE\rt-test-probe
> mocha "test/TrafficLight_unit2.js"



  TrafficLight
    √ should initially be in the Red state
    √ should be in the Green state after we have sent the Green event
    √ should ask for the duration of inactivity when we send the "deactivateLight" event, be inactive for the returned duration, and finally go back to the Green state (5026ms)


  3 passing (5s)
```
You can also try with the test in `TrafficLight_unit3.js`.
If you are a Visual Studio Code user there is a `launch.json` file [here](https://github.com/HCL-TECH-SOFTWARE/rt-test-probe/blob/main/.vscode/launch.json) which lets you debug the Mocha tests from within Visual Studio Code.


