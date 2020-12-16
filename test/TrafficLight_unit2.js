var assert = require('assert');
const { performance } = require('perf_hooks');

// Unit tests for the TrafficLight capsule (2nd version of TrafficLight demo application)
// Model: D:\eclipse-workspace\rtist_demo\trafficlight-demo (project TrafficLight)
// Launch: D:\eclipse-workspace\CapsuleTesting\TrafficLight_target\default>executable.EXE -URTS_DEBUG=quit
describe('TrafficLight', function() {

    it('should initially be in the Red state', function() {
        this.timeout(10000); 

        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)           
        .then((data) => {
            return testProbe.invokeEvent('getActiveLight', 'trafficLight_control')    
                .then((reply) => {
                    // Expect exactly one reply message which is the currently active light color
                    assert.strictEqual(reply.result.length, 1);
                    assert.strictEqual(reply.result[0].data, 'RTString"Red"');
                });
        })                        
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });

    it('should be in the Green state after we have sent the Green event', function() {
        this.timeout(10000); 

        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)           
        .then((data) => {
            return Promise.all([
                // The newly set light color should be acknowledged with the "lightChanged" event...
                testProbe.expectEvent({event : 'lightChanged', port : 'trafficLight_control'})
                .then((receivedEvent) => {
                    assert.strictEqual(receivedEvent[0].data, 'RTString"Green"');
                    // ...and then the active light should be Green
                    return testProbe.invokeEvent('getActiveLight', 'trafficLight_control')    
                    .then((reply) => {
                        assert.strictEqual(reply.result.length, 1);
                        assert.strictEqual(reply.result[0].data, 'RTString"Green"');
                    })
                }),
                testProbe.sendEvent('green', 'trafficLight_control')                
            ]);
        })                        
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });

    it('should ask for the duration of inactivity when we send the "deactivateLight" event, be inactive for the returned duration, and finally go back to the Green state', function() {
        this.timeout(10000); 

        let start;
        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)           
        .then((data) => {
            return Promise.all([
                // Expect the application to invoke the getDurationOfInactivity event                
                testProbe.expectEvent({event : 'getDurationOfInactivity', port : 'trafficLight_control'})
                .then((receivedEvent) => {
                    // Check so the received event was invoked and not sent
                    assert.strictEqual(receivedEvent[0].command, 'invokeEvent');
                    // Send the reply message for the invoked event (let the traffic light be inactive for 5 seconds)
                    return testProbe.replyEvent(receivedEvent[0], 'durationOfInactivityReply', 'trafficLight_control', 'int 5');
                }),
                testProbe.expectEvent({event : 'lightChanged', port : 'trafficLight_control'})
                .then((receivedEvent) => {
                    start = performance.now();
                    assert.strictEqual(receivedEvent[0].data, 'RTString"None"');
                }),
                testProbe.expectEvent({event : 'lightChanged', port : 'trafficLight_control'})
                .then((receivedEvent) => {
                    let duration = Math.round((performance.now() - start) / 1000); 
                    assert.strictEqual(duration, 5, 'took ' + duration + ' seconds');
                    assert.strictEqual(receivedEvent[0].data, 'RTString"Green"');
                }),
                testProbe.sendEvent('deactivateLight', 'trafficLight_control')                
            ]);
        })                        
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });
});