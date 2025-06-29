# orchestrator/Dockerfile
# Use a Node.js image that includes 'git' or allows easy installation
FROM node:18-slim

# Install git and other necessary tools
# The entire RUN block is now a single, correctly chained command
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests.
COPY package*.json ./

# Install production dependencies.
RUN npm install --production

# Copy local code to the container image.
COPY . .

# Expose the port that the application listens on.
EXPOSE 8080

# Run the web service on container startup.
CMD [ "npm", "start" ]