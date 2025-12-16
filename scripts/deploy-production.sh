#!/bin/bash

# Medical Coverage System - Production Deployment Script
# This script automates the deployment of all production Kubernetes resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="medical-coverage"
KUBECONTEXT="k8s-medical-coverage-production"
REGION="us-west-2"
CLUSTER_NAME="medical-coverage-prod"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to verify prerequisites
verify_prerequisites() {
    print_status "Verifying prerequisites..."

    # Check required tools
    if ! command_exists kubectl; then
        print_error "kubectl is not installed"
        exit 1
    fi

    if ! command_exists helm; then
        print_error "helm is not installed"
        exit 1
    fi

    # Check kubectl context
    if ! kubectl config current-context >/dev/null 2>&1; then
        print_error "No kubectl context is set"
        exit 1
    fi

    # Verify we can connect to the cluster
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    print_success "Prerequisites verified"
}

# Function to create namespace
create_namespace() {
    print_status "Creating namespace: $NAMESPACE"

    if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f k8s/production/infrastructure/namespace.yaml
        print_success "Namespace $NAMESPACE created"
    fi
}

# Function to create secrets
create_secrets() {
    print_status "Creating secrets..."

    # Check if secrets need to be updated
    kubectl apply -f k8s/production/secrets.yml
    kubectl apply -f k8s/production/security/rbac.yaml

    print_success "Secrets created"
}

# Function to create ConfigMaps
create_configmaps() {
    print_status "Creating ConfigMaps..."

    kubectl apply -f k8s/production/configmaps.yml
    kubectl apply -f k8s/production/monitoring/prometheus-config.yml
    kubectl apply -f k8s/production/monitoring/alertmanager-config.yml
    kubectl apply -f k8s/production/monitoring/grafana-config.yml

    print_success "ConfigMaps created"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure components..."

    # Deploy persistent volumes and claims
    kubectl apply -f k8s/production/volumes/postgres-pv.yaml
    kubectl apply -f k8s/production/volumes/postgres-pvc.yaml

    # Deploy database services
    print_status "Deploying PostgreSQL..."
    kubectl apply -f k8s/production/infrastructure/postgres.yaml

    print_status "Deploying Redis..."
    kubectl apply -f k8s/production/infrastructure/redis.yaml

    print_success "Infrastructure deployed"
}

# Function to wait for infrastructure
wait_for_infrastructure() {
    print_status "Waiting for infrastructure to be ready..."

    # Wait for PostgreSQL
    kubectl wait --for=condition=available --timeout=300s deployment/postgres-primary -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/postgres-replica -n $NAMESPACE

    # Wait for Redis
    kubectl wait --for=condition=available --timeout=300s statefulset/redis-master -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s statefulset/redis-slave -n $NAMESPACE

    print_success "Infrastructure is ready"
}

# Function to deploy monitoring
deploy_monitoring() {
    print_status "Deploying monitoring stack..."

    # Deploy monitoring components
    kubectl apply -f k8s/production/infrastructure/monitoring.yaml

    # Wait for monitoring components
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n $NAMESPACE

    print_success "Monitoring stack deployed"
}

# Function to deploy applications
deploy_applications() {
    print_status "Deploying application services..."

    # Deploy services
    kubectl apply -f k8s/production/services/api-gateway/deployment.yaml
    kubectl apply -f k8s/production/services/auth-service/deployment.yaml
    kubectl apply -f k8s/production/services/other-services/deployments.yaml

    # Wait for services to be ready
    kubectl wait --for=condition=available --timeout=600s deployment/api-gateway -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/auth-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/hospital-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/insurance-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/billing-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/frontend-app -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/admin-frontend -n $NAMESPACE

    print_success "Application services deployed"
}

# Function to configure ingress and load balancing
configure_networking() {
    print_status "Configuring networking..."

    kubectl apply -f k8s/production/infrastructure/ingress.yaml

    print_success "Networking configured"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."

    # Check all pods are running
    kubectl get pods -n $NAMESPACE

    # Check services
    kubectl get services -n $NAMESPACE

    # Check ingress
    kubectl get ingress -n $NAMESPACE

    print_success "Deployment verification completed"
}

# Function to show deployment status
show_status() {
    print_status "Deployment Status:"
    echo ""
    echo "=== Namespace ==="
    kubectl get namespace $NAMESPACE
    echo ""
    echo "=== Pods ==="
    kubectl get pods -n $NAMESPACE -o wide
    echo ""
    echo "=== Services ==="
    kubectl get services -n $NAMESPACE
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n $NAMESPACE
    echo ""
    echo "=== Persistent Volumes ==="
    kubectl get pv,pvc -n $NAMESPACE
    echo ""

    # Show access information
    print_status "Access Information:"
    API_URL=$(kubectl get ingress medical-coverage-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not available")
    GRAFANA_URL=$(kubectl get ingress medical-coverage-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[4].host}' 2>/dev/null || echo "Not available")

    echo "API URL: https://$API_URL"
    echo "Grafana URL: https://$GRAFANA_URL"
    echo "Namespace: $NAMESPACE"
    echo "Kube Context: $(kubectl config current-context)"
}

# Main deployment function
main() {
    print_status "Starting Medical Coverage System Production Deployment"
    print_status "Target: $NAMESPACE in context $(kubectl config current-context)"
    echo ""

    # Execute deployment steps
    verify_prerequisites
    create_namespace
    create_secrets
    create_configmaps
    deploy_infrastructure
    wait_for_infrastructure
    deploy_monitoring
    deploy_applications
    configure_networking
    verify_deployment
    show_status

    print_success "🎉 Production deployment completed successfully!"
    print_status "The Medical Coverage System is now running in production."
    echo ""
    print_status "Next steps:"
    echo "1. Monitor the system health at the Grafana dashboard"
    echo "2. Set up alerts and notifications"
    echo "3. Configure backup and disaster recovery"
    echo "4. Update DNS records for the load balancer"
    echo "5. Run smoke tests to verify functionality"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        show_status
        ;;
    "verify")
        verify_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the entire system (default)"
        echo "  status   - Show deployment status"
        echo "  verify   - Verify deployment health"
        echo "  help     - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac