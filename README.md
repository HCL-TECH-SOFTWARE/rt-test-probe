# rt-test-probe
JavaScript implementation of a test probe for testing real-time applications created with [HCL RTist](https://www.hcltechsw.com/products/rtist).

This repo contains a few JavaScript utilities (in the file `testProbe.js`) which let you send and invoke events to a real-time application that uses the [TcpServer](https://github.com/hcl-pnp-rtist/lib-tcp-server) library. It also allows you intercept outgoing events sent or invoked by the real-time application.

Although this can be used as a means for general interaction with a real-time application from a JavaScript application, the main intended use case is to support testing of a real-time application. You can for example use the popular Mocha testing framework to write test cases for your real-time applications.

In the `models` folder you will find a few sample RTist models which all are variants of the [traffic-light-web](https://github.com/hcl-pnp-rtist/traffic-light-web) sample application. In the `test` folder there are some Mocha tests for testing those models (both module testing, and unit testing of individual capsules).

Feel free to extend `testProbe.js` to cover your testing needs, whether you are using Mocha or another testing framework. Pull requests are welcome!