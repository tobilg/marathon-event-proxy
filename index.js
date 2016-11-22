"use strict";

var express = require("express");
var SSE = require("sse");
var crypto = require("crypto");
var parse = require("url").parse;

// The Marathon Event Listener
var MarathonEventProxy = require("./lib/MarathonEventProxy");

// Helpers
var helpers = require("./lib/helpers");

// Configuration
var config = require("./lib/config");

// Instantiate logger
var logger = helpers.getLogger(null, null, config.logging.level);

// The connection cache object
var connectionCache = {};

// The Express app
var app = express();

// Statistics endpoint
app.get("/stats", function(req, res) {
    var connectionCount = Object.getOwnPropertyNames(connectionCache).length;
    if (connectionCount > 0) {
        var stats = {
            connectionCount: connectionCount,
            connections: {}
        };
        Object.getOwnPropertyNames(connectionCache).forEach(function (connectionId) {
            stats.connections[connectionId] = connectionCache[connectionId].stats
        });
        res.json(stats);
    } else {
        res.json({
            connectionCount: connectionCount
        });
    }
});

app.get("/health", function (req, res) {
    res.status(200).send();
});

app.get("/showEndpoint", function (req, res) {
    res.json({
        endpoint: "http://" + config.application.host + ":" + config.application.port + config.application.path
    });
});

// Start Express server
var server = app.listen(config.application.port, config.application.host, function (err) {
    if(err) throw err;
    logger.info("SSE server ready on http://" + config.application.host + ":" + config.application.port);
});

// Start Server Sent Events server
var sse = new SSE(server, { path: config.application.path });

// Handle connections
sse.on("connection", function (connection) {

    var connectionId = crypto.randomBytes(16).toString("hex");
    var url = connection.req.url;
    var qs = parse(url, true).query;
    var allowedEventTypes = config.allowedEventTypes;
    var eventTypes = [];

    logger.info("New connection with id " + connectionId);

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

    logger.info("Used event_types are " + eventTypes.join(",") + " for connection with id " + connectionId);

    // Store connection in connectionCache
    connectionCache[connectionId] = {
        connection: connection,
        eventTypes : eventTypes,
        stats: {}
    };

    // Initialize counters
    eventTypes.forEach(function (eventType) {
        connectionCache[connectionId].stats[eventType] = {
            count: 0,
            bytes: 0
        };
    });

    logger.info("Active connections: " + Object.getOwnPropertyNames(connectionCache).length);

    connectionCache[connectionId].connection.on("close", function () {
        logger.info("Closing connection id " + connectionId);
        delete connectionCache[connectionId];
        logger.info("Active connections: " + Object.getOwnPropertyNames(connectionCache).length);
    });
});

// Define options
var options = {
    marathonHost: config.marathon.host,
    marathonPort: config.marathon.port,
    marathonProtocol: config.marathon.protocol,
    logger: logger,
    connections: connectionCache
};

// Create event listener
var mel = new MarathonEventProxy(options);

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