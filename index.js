"use strict";

var express = require("express");
var SSE = require("sse");
var crypto = require("crypto");
var parse = require("url").parse;

// The Marathon Event Listener
var MarathonEventListener = require("./lib/MarathonEventListener");

// The Express app
var app = express();

// The connection cache object
var connectionCache = {};

// Start Express server
var server = app.listen(8080, function (err) {
    if(err) throw err;
    console.log("server ready on http://localhost:8080")
});

// Start Server Sent Events server
var sse = new SSE(server, { path: "/events" });

//
sse.on("connection", function (connection) {

    var connectionId = crypto.randomBytes(16).toString("hex");
    var url = connection.req.url;
    var qs = parse(url, true).query;
    var allowedEventTypes = ["deployment_info", "deployment_success", "deployment_failed", "deployment_step_success", "deployment_step_failure", "group_change_success", "group_change_failed", "failed_health_check_event", "health_status_changed_event", "unhealthy_task_kill_event"];
    var eventTypes = [];

    console.log("new connection with id " +connectionId);
    console.log(qs);

    if (qs && qs["event_types"] && qs["event_types"].length > 0) {
        if (qs["event_types"].indexOf(",") > -1) {
            var temp = qs["event_types"].split(",");
            temp.forEach(function (eventType) {
                if (allowedEventTypes.indexOf(eventType) > -1) {
                    eventTypes.push(eventType);
                }
            })
        } else {
            if (allowedEventTypes.indexOf(qs["event_types"]) > -1) {
                eventTypes.push(qs["event_types"]);
            }
        }
    }

    // Use all event types if none (valid) have been specified
    if (eventTypes.length === 0) {
        eventTypes = allowedEventTypes;
    }

    // Store connection in connectionCache
    connectionCache[connectionId] = {
        connection: connection,
        eventTypes : eventTypes,
        counters: {}
    };

    // Initialize counters
    eventTypes.forEach(function (eventType) {
        connectionCache[connectionId].counters[eventType] = 0;
    });

    console.log("Main: Active connections: " + Object.getOwnPropertyNames(connectionCache).length);

    var heartbeat = setInterval(function () {
        connectionCache[connectionId].connection.send({
            event: "heartbeat",
            data: new Date().toTimeString()
        })
    }, 1000);

    connectionCache[connectionId].connection.on("close", function () {
        console.log("Main: Closing connection id " + connectionId);
        clearInterval(heartbeat);
        delete connectionCache[connectionId];
        console.log("Main: Active connections: " + Object.getOwnPropertyNames(connectionCache).length);
    });
});

// Define options
var options = {
    marathonUrl: process.env.MARATHON_HOST || "master.mesos",
    marathonPort: process.env.MARATHON_PORT || 8080,
    marathonProtocol: process.env.MARATHON_PROTOCOL || "http",
    logging: {
        level: process.env.LOG_LEVEL || "info"
    },
    connections: connectionCache
};

// Create event listener
var mel = new MarathonEventListener(options);

// Report connection
mel.on("connected", function (timestamp) {
    mel.logger.info("Connected to the Marathon Event Bus!");
});

// Report errors
mel.on("error", function (error) {
    mel.logger.error(JSON.stringify(error));
});

// Subscribe to Marathon event bus
mel.subscribe();