const { resolve } = require('path');

/**
 * Utilities for testing RT applications that use the TcpServer library
 * @param {string} host Name of host where the RT application runs
 * @param {number} port Port where the RT application runs
 */
module.exports = function(host, port) {  
    const net = require('net');
    
    let module = {};  
    
    let loggingEnabled = false;
    let server = null; // TCP server for messages received from the RT application
    let expected = []; // Array of messages expected to be received from the RT application (in order)
    let awaited = []; // Array of messages awaited to be received from the RT application (in order)

    // Log the message to the console if logging is enabled
    function log(msg) {
        if (loggingEnabled)
            console.log(msg);
    }

    // Called if a message is received from the RT application
    function msgReceived(conn) {
        let remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
        log('message received from RT application running at %s', remoteAddress);

        conn.on('data', (d) => {            
            log('connection data from %s: %s', remoteAddress, d.toString());  
            let received;
            try {
                received = JSON.parse(d.toString());
            } 
            catch (e) {
                // Received something that was not parseable as JSON - skip it
                log('ERROR: Not parseable as JSON');
                conn.end();
                return;
            }

            if (received.command == 'invokeEvent') {                
                // If the received event was invoked, the test driver needs to make a proper
                // reply (using the sendReply() function below).
                // Store the connection in the "received" event object so that it can do that.
                received.conn = conn;
            }

            if (awaited.length > 0) {
                // Check if the received event was awaited or not
                let e = awaited[0];
                if (e.event.event != '*' && received.event != e.event.event) {
                    e.callback(new Error('Received event "' + received.event + '" but expected "' + e.event.event + '"'));
                }
                else if (e.event.hasOwnProperty('port') && received.port != e.event.port) {
                    e.callback(new Error('Received event "' + received.event + '" on port ' + received.port + ' but expected it on port "' + e.event.port + '"'));
                }

                e.callback(received);  
                awaited.shift();
            }

            if (expected.length > 0) {
                // Check if the received event was expected or not                
                let e = expected[0];
                if (e.event.event != '*' && received.event != e.event.event) {
                    e.callback(new Error('Received event "' + received.event + '" but expected "' + e.event.event + '"'));
                }
                else if (e.event.hasOwnProperty('port') && received.port != e.event.port) {
                    e.callback(new Error('Received event "' + received.event + '" on port ' + received.port + ' but expected it on port "' + e.event.port + '"'));
                }

                e.callback(received);  
                expected.shift();
            } 

            if (received.command == 'sendEvent') {                
                // For sendEvent we just need to ack the received message to let the RT application proceeed
                conn.write('{}'); 
                conn.end();
            }
        });  
        conn.once('close', () => {
            log('connection from %s closed', remoteAddress);
        });  
        conn.on('error', (err) => {
            log('Connection %s error: %s', remoteAddress, err.message);
        });

    }

    /**
     * Enable or disable logging to the console. Logging is by default disabled.
     * @param {boolean} enabled 
     */
    module.enableLogging = function(enabled) {
        loggingEnabled = enabled;
    }

    /**
     * Start listening for messages from the RT application by launching a TCP server 
     * on the specified port.
     * @param {number} receivePort Port to listen to
     */    
    module.startListenForEvents = function(receivePort) {
        return new Promise((resolve, reject) => {
            // Create a TCP server listening on receivePort to capture messages sent out from the RT application
            server = net.createServer();
            server.on('connection', msgReceived);
            
            server.listen(receivePort, '127.0.0.1', () => {
                resolve();
            });        
            server.on('error', (err) => {
                reject(err)
            });
        });
    }

    /**
     * Stop listening for messages from the RT application. Don't forget to call this
     * function when testing is completed to ensure the test script will terminate.
     */    
    module.stopListenForEvents = function() {
        if (server != null)
            server.close();
    }

    // Attempt to connect the socket
    function connect(socket) {
        return new Promise((resolve, reject) => {
            let socket = new net.Socket();
            socket.connect({ port: port, host: host });
            socket.on('connect', function() {        
                log('TCP connection established with the RT application at ' + host + ':' + port);    
                resolve(socket);
            });
            socket.on('error', function(err) {        
                log('TCP connection failed with the RT application at ' + host + ':' + port);    
                reject(err);
            });
        });            
    }
    
    /**
     * Send an event to the RT application. Returns a promise which will be resolved with
     * a status message (saying something like "OK") if the event was successfully sent,
     * or rejected with an Error object in case the event failed to be sent.
     * @param {string} rtEventName Name of event to send
     * @param {string} rtPort Name of port (on the test probe capsule) where to send the event
     * @param {string} [rtData] String encoding of the data to send with the event
     * @param {number} [rtPortIndex=0] Port index where to send the event
     */
    module.sendEvent = function(rtEventName, rtPort, rtData, rtPortIndex) {
        return new Promise((resolve, reject) => {            
            return connect()
            .then((socket) => {
                let json = '{ "event" : "' + rtEventName + '" , "command" : "sendEvent", "priority" : "General", "port" : "' + rtPort + '"';
                if (rtData) {
                    json += ', "data" : "' + rtData + '"';
                }
                if (rtPortIndex) {
                    json += ', "portIndex" : ' + rtPortIndex;
                }
                json += '}';
                socket.write(json);
    
                socket.on('data', (data) => {
                    // Check if the sending was successful or not
                    try {
                        let reply = JSON.parse(data);
                        if (reply.status == 'error') 
                            reject(new Error(reply.msg));
                        else
                            resolve(reply.msg);
                    }
                    catch (e) {
                        // Ignore JSON parse errors - could happen if extra data is read from the socket like a trailing newline
                    }
                    socket.end();                
                });
                socket.on('error', function(err) {        
                    console.log('Failed to send to server : ' + json);                
                    reject(err);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Send a JSON command to the RT application. Returns a promise which will be resolved with
     * a status message if the command was successfully sent,
     * or rejected with an Error object in case the command failed to be sent.
     * @param {string} json JSON to send
     */
    module.sendJSON = function(json) {
        return new Promise((resolve, reject) => {            
            return connect()
            .then((socket) => {            
                socket.write(json);
    
                socket.on('data', (data) => {
                    // Check if the sending was successful or not
                    try {
                        let reply = JSON.parse(data);
                        if (reply.status == 'error') 
                            reject(new Error(reply.msg));
                        else {
                            resolve(reply.msg);
                            console.log('Reply: ' + reply.result);
                        }
                    }
                    catch (e) {
                        // Ignore JSON parse errors - could happen if extra data is read from the socket like a trailing newline
                    }
                    socket.end();                
                });
                socket.on('error', function(err) {        
                    console.log('Failed to send to server : ' + json);                
                    reject(err);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Invoke an event to the RT application. Returns a promise which will be resolved with
     * the result of invoking the event, which is an object which a.o.t contains the reply messages
     * received. If invoking the event fails, the promise is rejected with an Error object.
     * @param {string} rtEventName Name of event to invoke
     * @param {string} rtPort Name of port (on the test probe capsule) where to invoke the event
     * @param {string} [rtData] String encoding of the data to send with the event
     * @param {number} [rtPortIndex=0] Port index where to invoke the event
     */
    module.invokeEvent = function(rtEventName, rtPort, rtData, rtPortIndex) {
        return new Promise((resolve, reject) => {
            return connect()
            .then((socket) => {
                let json = '{ "event" : "' + rtEventName + '" , "command" : "invokeEvent", "port" : "' + rtPort + '"';
                if (rtData) {
                    json += ', "data" : "' + rtData + '"';
                }
                if (rtPortIndex) {
                    json += ', "portIndex" : ' + rtPortIndex;
                }
                json += '}';
                socket.write(json);

                socket.on('data', (data) => {
                    try {
                        let reply = JSON.parse(data);
                        if (reply.status == 'error') 
                            reject(new Error(reply.msg));
                        else
                            resolve(reply);                        
                    }
                    catch (e) {
                        // Failed to parse response JSON
                        reject(e);
                    }
                    socket.end();                
                });
                socket.on('error', function(err) {        
                    console.log('Failed to invoke to server : ' + json);                
                    reject(err);
                })
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Reply an event to the RT application as a response to an event that the RT application invoked. 
     * The reply is sent on the same port as where the invoked event was received.
     * Returns a promise which will be resolved with a status string (usually just saying "OK") if 
     * the reply event was successfully sent, or rejected with an Error object in case the reply 
     * event failed to be sent.
     * @param {object} rtInvokedEvent An object representing the invoked event to which the reply event should be sent.
     * @param {string} rtEventName Name of reply event to send     
     * @param {string} [rtData] String encoding of the data to send with the reply event
     */
    module.replyEvent = function(rtInvokedEvent, rtEventName, rtPort, rtData) {
        return new Promise((resolve, reject) => {
            if (!rtInvokedEvent.hasOwnProperty('conn')) {
                reject(new Error('Attempted to reply to an event that was not invoked.'));
            }
            else {
                let json = '{ "event" : "' + rtEventName + '" , "command" : "reply", "port" : "' + rtInvokedEvent.port + '"';
                if (rtData) {
                    json += ', "data" : "' + rtData + '"';
                }
                json += '}';
                rtInvokedEvent.conn.write(json); 
                rtInvokedEvent.conn.end();

                resolve('OK - successful reply');
            }
        });
    }

    /**
     * Return a promise that will be resolved if the expected event(s) is received from the RT application.
     * The promise will be resolved with an array containing the received event(s) which 
     * matched the expected event(s). Or the promise will be rejected with an Error describing 
     * how the expectation failed.
     * @param {Object} rtEvent An object describing the event that is expected to be received.
     * @param {string} rtEvent.event Name of event to be received (use '*' for any event)
     * @param {string} [rtEvent.port] Name of port on which the event should be received
     *
     * @param {number} [count=1] The number of times the event is expected to arrive
     * @param {string} [msg] Optional message to print in case the expected event(s) fail to arrive
     */
    module.expectEvent = function(rtEvent, count = 1, msg) {
        let promises = [];
        for (let i=0; i < count; i++) {
            promises.push(new Promise((resolve, reject) => {
            
                expected.push({
                    event : rtEvent,
                    callback : function (obj) {
                        if (obj instanceof Error) {
                            if (msg)
                                obj.message += '(' + msg + ')';
                            reject(obj);
                        }
                        else    
                            resolve(obj);
                    }
                }); 
            }));
        }
        return Promise.all(promises);    
    };

    /**
     * Return a promise that will be resolved when certain event(s) is received from the RT application.
     * The promise will be resolved with the received event(s) which matched the provided event(s).
     * The promise will never fail.
     * This function can be used to wait until the tested system is in a certain state before
     * a test case is run.
     * @param {Object} rtEvent An object describing the event that should be received.
     * @param {string} rtEvent.event Name of event to be received (use '*' for any event)
     * @param {string} [rtEvent.port] Name of port on which the event should be received     
     *
     * @param {number} [count=1] The number of times the event should be received.
     */
    module.awaitEvent = function(rtEvent, count = 1) {
        let promises = [];
        for (let i=0; i < count; i++) {
            promises.push(new Promise((resolve, reject) => {        
                awaited.push({
                    event : rtEvent,
                    callback : function (obj) {                        
                        resolve(obj);
                    }
                }); 
            }));
        }
        return Promise.all(promises);          
    };

    return module;
}
