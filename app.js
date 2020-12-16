const testProbe = require ('./testProbe')('localhost', 9911);
testProbe.enableLogging(true);

testProbe.startListenForEvents(2234)
.then((data) => {
    return Promise.all([
        testProbe.expectEvent({event : 'walk', port : 'pedLight_server'}),
        testProbe.sendEvent('pedestrian', 'trafficLight_control')        
    ]);
})
.catch((err) => {
    console.log('Error occurred: ' + err);
})
.finally(() => {
    testProbe.stopListenForEvents();
});

