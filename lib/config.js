module.exports = {
    application: {
        host: process.env.HOST || "127.0.0.1",
        port: process.env.PORT0 || 8888,
        path: process.env.ENDPOINT || "/events"
    },
    marathon: {
        host: process.env.MARATHON_HOST || "master.mesos",
        port: process.env.MARATHON_PORT || 8080,
        protocol: process.env.MARATHON_PROTOCOL || "http"
    },
    logging: {
        level: process.env.LOG_LEVEL || "info"
    },
    allowedEventTypes: ["deployment_info", "deployment_success", "deployment_failed", "deployment_step_success", "deployment_step_failure", "group_change_success", "group_change_failed", "failed_health_check_event", "health_status_changed_event", "unhealthy_task_kill_event"]
};