"use strict";

var EventEmitter = require("events").EventEmitter;
var util = require("util");
var EventSource = require("eventsource");
var helpers = require("./helpers");

/**
 * Represents a Marathon Event Proxy
 * @constructor
 * @param {object} options - The option map object.
 */
function MarathonEventProxy (options) {

    if (!(this instanceof MarathonEventProxy)) {
        return new MarathonEventProxy(options);
    }

    // Inherit from EventEmitter
    EventEmitter.call(this);

    var self = this;

    self.allowedEventTypes = ["deployment_info", "deployment_success", "deployment_failed", "deployment_step_success", "deployment_step_failure", "group_change_success", "group_change_failed", "failed_health_check_event", "health_status_changed_event", "unhealthy_task_kill_event"];

    self.options = {};

    // Master discovery
    self.options.marathonHost = options.marathonHost;
    self.options.marathonPort = parseInt(options.marathonPort);
    self.options.marathonProtocol = options.marathonProtocol;
    self.options.connections = options.connections || {};

    // Logging
    self.logger = options.logger || helpers.getLogger((options.logging && options.logging.path ? options.logging.path : null), (options.logging && options.logging.fileName ? options.logging.fileName : null), (options.logging && options.logging.level ? options.logging.level.toLowerCase() : null));

}

// Inherit from EventEmitter
util.inherits(MarathonEventProxy, EventEmitter);

/**
 * Subscribes the MarathonEventProxy to the Marathon Event Bus
 */
MarathonEventProxy.prototype.subscribe = function () {

    var self = this,
        url = self.options.marathonProtocol + "://" + self.options.marathonHost + ":" + self.options.marathonPort+"/v2/events";

    self.logger.info("Trying to connect to Marathon at " + url);

    // Create EventSource for Marathon /v2/events endpoint
    var es = new EventSource(url);

    es.on("open", function () {
        self.emit("connected", { "timestamp": ((new Date().getTime())/1000) })
    });

    es.on("error", function (error) {
        self.emit("error", { "timestamp": ((new Date().getTime())/1000), error: error })
    });

    // Add event listeners for all allowed event types
    self.allowedEventTypes.forEach(function (type) {
        es.addEventListener(type, function (e) {
            self.handleEvent({ event: e.type, data: JSON.parse(e.data) });
        });
    });

};

MarathonEventProxy.prototype.handleEvent = function (eventObj) {

    var self = this;

    // Iterate over all connections
    Object.getOwnPropertyNames(self.options.connections).forEach(function (connectionId) {

        var connectionObj = self.options.connections[connectionId];

        // Check if connection has subscribed to the current eventType
        if (connectionObj.eventTypes.indexOf(eventObj.event) > -1) {

            var evt = {
                event: eventObj.event,
                data: JSON.stringify(eventObj.data)
            };

            // If so, send the event!
            connectionObj.connection.send(evt);

            // Count the event
            connectionObj.stats[eventObj.event].count++;
            connectionObj.stats[eventObj.event].bytes += Buffer.byteLength(JSON.stringify(evt), 'utf8')

        }

    });

};

module.exports = MarathonEventProxy;