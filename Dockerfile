FROM strues/node:7.0.0
MAINTAINER Steven Truesdell <steven@strues.io>

# Copy package.json and the yarn.lock file to /tmp
# then install the packages. This creates an image
# layer after the packages are installed.
COPY package.json yarn.lock /tmp/
RUN cd /tmp && yarn install

# Create our app directory and then symlink the
# node_modules folder to the app directory.
RUN mkdir /app \
    && cd /app \
    && ln -s /tmp/node_modules

# Copy our files over now that everything is installed
WORKDIR /app
COPY . /app

# Declare /app a volume so that we can mount it from the outside.
VOLUME ["/app"]
# Expose the application ports
EXPOSE 1337 7331
# Issue the run command.
CMD ["npm", "run", "development"]
