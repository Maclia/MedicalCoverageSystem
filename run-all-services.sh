#!/bin/bash

# Script to run Docker for each independent service in the MedicalCoverageSystem
# Updated to ensure successful system startup with databases and networking

SERVICES_DIR="./services"
CLIENT_DIR="./client"
SERVER_DIR="./server"

# Database configuration
POSTGRES_CONTAINER="medical-postgres"
REDIS_CONTAINER="medical-redis"
NETWORK_NAME="medical-network"

# Service databases
DATABASES=(
    "medical-coverage-api-gateway"
    "medical-coverage-billing"
    "medical-coverage-core"
    "medical-coverage-crm"
    "medical-coverage-finance"
    "medical-coverage-hospital"
    "medical-coverage-insurance"
    "medical-coverage-membership"
    "medical-coverage-wellness"
)

# Function to check if container is running
is_container_running() {
    docker ps --filter "name=$1" --filter "status=running" | grep -q "$1"
}

# Function to wait for container to be healthy
wait_for_container() {
    local container=$1
    local max_attempts=30
    local attempt=1

    echo "Waiting for $container to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker exec $container pg_isready -U postgres > /dev/null 2>&1 2>/dev/null; then
            echo "$container is ready!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: $container not ready yet..."
        sleep 2
        ((attempt++))
    done
    echo "Failed to wait for $container"
    return 1
}

# Start PostgreSQL container
if ! is_container_running $POSTGRES_CONTAINER; then
    echo "Starting PostgreSQL container..."
    docker run -d --name $POSTGRES_CONTAINER \
        -e POSTGRES_PASSWORD=postgres \
        -p 5432:5432 \
        postgres:15
    if [ $? -ne 0 ]; then
        echo "Failed to start PostgreSQL"
        exit 1
    fi
else
    echo "PostgreSQL container already running"
fi

# Start Redis container
if ! is_container_running $REDIS_CONTAINER; then
    echo "Starting Redis container..."
    docker run -d --name $REDIS_CONTAINER \
        -p 6379:6379 \
        redis:7
    if [ $? -ne 0 ]; then
        echo "Failed to start Redis"
        exit 1
    fi
else
    echo "Redis container already running"
fi

# Wait for PostgreSQL to be ready
wait_for_container $POSTGRES_CONTAINER
if [ $? -ne 0 ]; then
    echo "PostgreSQL failed to start properly"
    exit 1
fi

# Create databases
echo "Creating databases..."
for db in "${DATABASES[@]}"; do
    echo "Creating database: $db"
    docker exec $POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE $db;" 2>/dev/null || echo "Database $db may already exist"
done

# Create Docker network
echo "Creating Docker network: $NETWORK_NAME"
docker network create $NETWORK_NAME 2>/dev/null || echo "Network $NETWORK_NAME may already exist"

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
        if [ $? -ne 0 ]; then
            echo "Failed to build $service_name"
            return 1
        fi
        docker run -d --name "medical-$service_name" \
            --network $NETWORK_NAME \
            -e POSTGRES_HOST=$POSTGRES_CONTAINER \
            -e REDIS_HOST=$REDIS_CONTAINER \
            "medical-$service_name"
        if [ $? -ne 0 ]; then
            echo "Failed to run $service_name"
            return 1
        fi
    else
        echo "No Docker setup found for $service_name"
        return 1
    fi
}

# Run client
if [ -f "$CLIENT_DIR/Dockerfile" ]; then
    echo "Building and running Docker for client"
    docker build -t medical-client "$CLIENT_DIR"
    if [ $? -eq 0 ]; then
        docker run -d --name medical-client \
            --network $NETWORK_NAME \
            -p 5173:5173 \
            medical-client
    else
        echo "Failed to build client"
    fi
fi

# Run server (if exists)
if [ -f "$SERVER_DIR/Dockerfile" ]; then
    echo "Building and running Docker for server"
    docker build -t medical-server "$SERVER_DIR"
    if [ $? -eq 0 ]; then
        docker run -d --name medical-server \
            --network $NETWORK_NAME \
            -p 5000:5000 \
            medical-server
    else
        echo "Failed to build server"
    fi
fi

# Run each service
echo "Starting microservices..."
failed_services=()
for service in "$SERVICES_DIR"/*/; do
    if [ -d "$service" ]; then
        run_service "$service"
        if [ $? -ne 0 ]; then
            failed_services+=("$(basename "$service")")
        fi
    fi
done

# Summary
if [ ${#failed_services[@]} -eq 0 ]; then
    echo "All services started successfully!"
    echo "API Gateway should be available at http://localhost:5000"
    echo "Client should be available at http://localhost:5173"
else
    echo "Some services failed to start: ${failed_services[*]}"
    exit 1
fi