var assert = require('assert');
const { performance } = require('perf_hooks');

// Test the interaction between the TrafficLight and PedLight capsules
// Model: D:\eclipse-workspace\CapsuleTesting\TrafficLightsTesting
// Prep 1: set PATH=D:\github\poco\bin64;%PATH%
// Prep 2: D:\github\hcl-pnp-rtist\traffic-light-web\webapp>node app.js
// Launch: D:\eclipse-workspace\CapsuleTesting\TrafficLightsTesting_target\default>executable.EXE -webhost=localhost -webport=4001 -URTS_DEBUG=quit
describe('TrafficLight + PedLight', function() {

    describe('send pedestrian event', function() {

        it('should get the "walk" event and then the "stop" event', function() {
            this.timeout(15000); // It will take some time 

            const testProbe = require ('../testProbe')('localhost', 9911);

            return testProbe.startListenForEvents(2234)
            .then((data) => {
                return Promise.all([
                    testProbe.expectEvent({event : 'walk', port : 'pedLight_server'}),
                    testProbe.expectEvent({event : 'stop', port : 'pedLight_server'}),
                    testProbe.sendEvent('pedestrian', 'trafficLight_control')        
                ]);
            })  
            .then(() => {
                // Wait a little until running next test so traffic light starts to cycle again
                return new Promise(resolve => setTimeout(() => resolve(), 7000));
            })
            .finally(() => {
                testProbe.stopListenForEvents();
            });
        });

        it('should take 4 seconds between the "walk" and "stop" events', function() {
            this.timeout(15000); // It will take some time 

            let start;
            const testProbe = require ('../testProbe')('localhost', 9911);

            return testProbe.startListenForEvents(2234)
            .then((data) => {
                return Promise.all([
                    testProbe.expectEvent({event : 'walk', port : 'pedLight_server'}).then(() => {
                        start = performance.now();
                    }),
                    testProbe.expectEvent({event : 'stop', port : 'pedLight_server'}).then(() => {
                        let duration = Math.round((performance.now() - start) / 1000); 
                        assert.strictEqual(duration, 4, 'took ' + duration + ' seconds');
                    }),
                    testProbe.sendEvent('pedestrian', 'trafficLight_control')        
                ]);
            })                        
            .finally(() => {
                testProbe.stopListenForEvents();
            });
        });
    });
});