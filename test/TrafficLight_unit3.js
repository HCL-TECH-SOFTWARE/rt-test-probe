var assert = require('assert');

// Unit tests for the TrafficLight capsule (2nd version of TrafficLight demo application)
// Model: models\trafficlight-demo (project TrafficLight)
// Launch: models\TrafficLight_target\default>executable.EXE -URTS_DEBUG=quit
describe('TrafficLight', function() {

    it('should handle the "pushData" event with data', function() {
        const testProbe = require ('../testProbe')('localhost', 9911);

        return testProbe.startListenForEvents(2234)        
        .then(() => {
            return Promise.all([
                testProbe.sendEvent('pushData', 'trafficLight_test', 'int 4', 3)
                .then(() => {
                    // First send, then invoke
                    return testProbe.invokeEvent('getData', 'trafficLight_test', 'int 2', 4)    
                    .then((reply) => {
                        // Expect a reply of 4 * 3 * 2 * 4 = 96
                        // Note: Since we invoked the event on a specific port index
                        // we only expect one reply
                        assert.strictEqual(reply.result.length, 1); // Broadcast reply
                        assert.strictEqual(reply.result[0].data, 'int 96');
                    })
                })                
            ]);
        })
        .finally(() => {
            testProbe.stopListenForEvents();
        });
    });

});