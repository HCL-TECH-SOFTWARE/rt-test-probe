var assert = require('assert');

// Unit tests for the TrafficLight capsule
// Model: models\TrafficLights_UnitTesting
// Preparations: Clone https://github.com/hcl-pnp-rtist/traffic-light-web and start the web application on port 4000
//               Open a shell and run the command
//               set PATH=D:\github\poco\bin64;%PATH%
// Launch: models\TrafficLightsUnitTesting_target\default>executable.EXE -webhost=localhost -webport=4000 -URTS_DEBUG=quit
describe('TrafficLight', function() {

    it('should get the "red", "green" and "yellow" events in that order', function() {
        this.timeout(7000); // Enough time for one full cycle of the traffic light

        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)
        .then((data) => {
            return testProbe.expectEvent({event : '*', port : 'trafficLight_server'}, 3)
            .then((receivedEvents) => {
                // Any of the 3 colors can come first                
                if (receivedEvents[0].event == 'red') {
                    assert.ok(receivedEvents[1].event == 'green');
                    assert.ok(receivedEvents[2].event == 'yellow');
                }
                else if (receivedEvents[0].event == 'green') {
                    assert.ok(receivedEvents[1].event == 'yellow');
                    assert.ok(receivedEvents[2].event == 'red');
                }
                else if (receivedEvents[0].event == 'yellow') {
                    assert.ok(receivedEvents[1].event == 'red');
                    assert.ok(receivedEvents[2].event == 'green');
                }
                else {
                    assert.fail('Unexpected event: ' + receivedEvents[0].event);
                }                
            });
        })                        
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });

    it('should show Red while a pedestrian is crossing the street, and then Green again', function() {
        this.timeout(15000); // Enough time for a pedestrian to cross the street
        //this.timeout(0);

        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)
        .then((data) => {
            // Wait until the traffic light is green before doing the test
            return testProbe.awaitEvent({event : 'green', port : 'trafficLight_server'});            
        })   
        .then((data) => {
            return Promise.all([ 
                // TODO: This can fail if the app has time to send the "yellow" event BEFORE
                // the "pedestrian" event is received!!!
                testProbe.expectEvent({event : 'red', port : 'trafficLight_server'}, 1, 'red 1'),
                testProbe.expectEvent({event : 'walk', port : 'trafficLight_pedLightControl'}, 1, 'WALK'),
                testProbe.expectEvent({event : 'stop', port : 'trafficLight_pedLightControl'}, 1, 'STOP'),
                testProbe.expectEvent({event : 'red', port : 'trafficLight_server'}, 1, 'red 2'),
                testProbe.expectEvent({event : 'green', port : 'trafficLight_server'}, 1, 'green 1'),
                testProbe.sendEvent('pedestrian', 'trafficLight_control')        
            ]);
        })  
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });
});