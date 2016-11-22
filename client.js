var EventSource = require("eventsource")
//var es = new EventSource('http://localhost:8080/events?event_types=deployment_info.fields(eventType,timestamp,plan.fields(id,target)).filter();status_update_event');
var es = new EventSource('http://localhost:8080/events?event_types=' + process.env.EVENT_TYPES);
es.addEventListener('heartbeat', function (e) {
    console.log(e.data);
});

var eventTypes = [];

if (process.env.EVENT_TYPES && process.env.EVENT_TYPES.length > 0) {
    if (process.env.EVENT_TYPES.indexOf(",") > -1) {
        var temp = process.env.EVENT_TYPES.split(",");
        temp.forEach(function (eventType) {
             eventTypes.push(eventType);
        })
    } else {
        eventTypes.push(process.env.EVENT_TYPES);
    }
}

eventTypes.forEach(function (eventType) {
    console.log("adding listener for " +eventType);
    es.addEventListener(eventType, function (e) {
        console.log(e.data);
    });
});