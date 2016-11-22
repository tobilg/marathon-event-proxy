# marathon-event-proxy

This project can act as a proxy for the [Server Sent Events endpoint](https://mesosphere.github.io/marathon/docs/generated/api.html#v2_events_get) of Marathon's [Event Bus](https://mesosphere.github.io/marathon/docs/event-bus.html).
  
It's useful to limit the number of sent events, which is achieved by filtering only the requested event types per SSE connection. The events sent from Marathon can easily become quite large, especially for the `deployment_*` events, which subsequently imposes an unnecessary load both on Marahton and the receiving application, if the receiving application isn't normally interested in these types of events. 

Marathon by default doesn't have this capability (yet), but there's an [issue](https://github.com/mesosphere/marathon/issues/4637) on this topic. 

## Configuration

Environment variables can be used to configure the application:

* `HOST`: The IP address the application should bind to. It'll use the `HOST` environment variable set by Marathon, when available. Default is `127.0.0.1`. 
* `PORT0`: The port which the application should bind to. It'll use the `PORT0` environment variable set by Marathon, when available. Default is `8888`.
* `ENDPOINT`: The relative path which should be used as endpoint. Default is `/events`. 
* `MARATHON_HOST`: The Marathon hostname or IP address. Default is `leader.mesos`. If you don't use Mesos DNS, or the application runs outside the cluster, this has to be set.
* `MARATHON_PORT`: The port on which Marathon listens to. Default is `8080`.
* `MARATHON_PROTOCOL`: The protocol Marathon listens on. Default is `http`. 
* `LOG_LEVEL`: The log level which should be used. Default is `info`.

## Usage

### Server-sent events (SSE) endpoint

If you want to access the Marathon event proxy application by using Mesos DNS, you should be able to access it with your client at `marathon-event-proxy.marathon.mesos:8888/events` (if your Marathon app name is `marathon-event-proxy`, the port is `8888` and you didn't change/set the `ENDPOINT` environment variable). Otherwise, the respective configurations have to be taken into account.

You can now specify the list of event types (separated by commas) you want to receive for the connection application, by using the following if you're interested in `deployment_info` and `group_change_success` events:

    marathon-event-proxy.marathon.mesos:8888/events?event_types=deployment_info,group_change_success

Have a look at the [Event Bus](https://mesosphere.github.io/marathon/docs/event-bus.html) docs to see the different event types possible.

### Marathon app definition

The below configuration will start the application on port `8888` on a random agent. If you want to place the application on a specific agent, please use [Marathon's contraints](https://mesosphere.github.io/marathon/docs/constraints.html).

```javascript
{
    "id":"marathon-event-proxy",
    "container": {
        "type": "DOCKER",
        "docker": {
            "network": "HOST",
            "image": "tobilg/marathon-event-proxy",
            "forcePullImage": true
        }
    },
    "cpus": 0.2,
    "mem": 256,
    "instances": 1,
    "healthChecks": [
        {
            "protocol": "HTTP",
            "path": "/health",
            "portIndex": 0,
            "gracePeriodSeconds": 5,
            "intervalSeconds": 10,
            "timeoutSeconds": 20,
            "maxConsecutiveFailures": 3
        }
    ],
    "portDefinitions": [
        {
            "protocol": "tcp",
            "port": 8888
        }
    ],
    "requirePorts" : true,
    "labels":{
        "MARATHON_SINGLE_INSTANCE_APP": "true"
    },
    "upgradeStrategy":{
        "minimumHealthCapacity": 0,
        "maximumOverCapacity": 0
    }
}
```

## API endpoints

### Stats

The application serves it statistics under the `GET /stats` endpoint. For each connection, there is an event count, as well as the total bytes sent:

```javascript
{
	"connectionCount": 2,
	"connections": {
		"f13800e56c9b5c096431329f5bf3fd3b": {
			"deployment_info": {
				"count": 2,
				"bytes": 315830
			},
			"group_change_success": {
				"count": 2,
				"bytes": 368
			}
		},
		"4bde850fc300e3c4a74a841094b0aa61": {
			"deployment_success": {
				"count": 2,
				"bytes": 315742
			}
		}
	}
}
```

### showEndpoint

The actual proxy endpoint can be gathered by requesting `GET /showEndpoint`. 

### Health

The health endpoint at `GET /health` can be used for health checking.
