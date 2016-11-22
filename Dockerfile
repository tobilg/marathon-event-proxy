FROM mhart/alpine-node:6

MAINTAINER tobilg@gmail.com

# Set application name
ENV APP_NAME marathon-event-proxy

# Set application directory
ENV APP_DIR /usr/local/${APP_NAME}

# Set node env to production, so that npm install doesn't install the devDependencies
ENV NODE_ENV production

# Add application
ADD . $APP_DIR

# Update Alpine distro and install npm modules for the project
RUN apk update && \
    apk upgrade && \
    apk add git && \
    cd ${APP_DIR} && \
    npm set progress=false && \
    npm install --silent

# Change the workdir to the app's directory
WORKDIR ${APP_DIR}

# Start application
CMD ["npm", "start"]