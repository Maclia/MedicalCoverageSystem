#!/bin/bash

# Script to run Docker for each independent service in the MedicalCoverageSystem

SERVICES_DIR="./services"
CLIENT_DIR="./client"
SERVER_DIR="./server"

# Function to run docker-compose if exists, else build and run Dockerfile
run_service() {
    local service_path=$1
    local service_name=$(basename "$service_path")

    if [ -f "$service_path/docker-compose.yml" ]; then
        echo "Running docker-compose for $service_name"
        cd "$service_path"
        docker-compose up -d
        cd - > /dev/null
    elif [ -f "$service_path/Dockerfile" ]; then
        echo "Building and running Docker for $service_name"
        docker build -t "medical-$service_name" "$service_path"
        docker run -d --name "medical-$service_name" "medical-$service_name"
    else
        echo "No Docker setup found for $service_name"
    fi
}

# Run client
if [ -f "$CLIENT_DIR/Dockerfile" ]; then
    echo "Building and running Docker for client"
    docker build -t medical-client "$CLIENT_DIR"
    docker run -d --name medical-client -p 5173:5173 medical-client
fi

# Run server
if [ -f "$SERVER_DIR/Dockerfile" ]; then
    echo "Building and running Docker for server"
    docker build -t medical-server "$SERVER_DIR"
    docker run -d --name medical-server -p 5000:5000 medical-server
fi

# Run each service
for service in "$SERVICES_DIR"/*/; do
    if [ -d "$service" ]; then
        run_service "$service"
    fi
done

echo "All services started."