"use strict";

var path = require("path");
var packageInfo = require("../package.json");
var winston = require('winston');

module.exports = {

    getLogger: function(path, fileName, logLevel) {

        var logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({ level: logLevel || "info" }),
                new (require("winston-daily-rotate-file"))({
                    filename: (path && fileName ? path + "/" + fileName : "logs/" + packageInfo.name + ".log"),
                    level: logLevel || "info",
                    prepend: true,
                    json: false
                })
            ]
        });

        return logger;

    },

    isFunction: function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

};