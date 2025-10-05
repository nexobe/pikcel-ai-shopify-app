#!/bin/bash

#
# DigitalOcean App Platform Deployment Script
# PikcelAI Shopify App
#
# This script automates the deployment process to DigitalOcean App Platform.
#
# Usage:
#   ./deploy.sh create          # Create a new app
#   ./deploy.sh update          # Update an existing app
#   ./deploy.sh logs            # View app logs
#   ./deploy.sh status          # Check app status
#   ./deploy.sh setup-secrets   # Set up environment secrets
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_YAML="$SCRIPT_DIR/app.yaml"

# Functions
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

check_doctl() {
    if ! command -v doctl &> /dev/null; then
        print_error "doctl CLI not found"
        echo ""
        echo "Install doctl:"
        echo "  macOS: brew install doctl"
        echo "  Linux: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi
    print_success "doctl CLI found"
}

check_auth() {
    if ! doctl auth list &> /dev/null; then
        print_error "Not authenticated with DigitalOcean"
        echo ""
        echo "Run: doctl auth init"
        exit 1
    fi
    print_success "Authenticated with DigitalOcean"
}

check_app_yaml() {
    if [ ! -f "$APP_YAML" ]; then
        print_error "app.yaml not found at: $APP_YAML"
        exit 1
    fi

    # Check if placeholder values are still present
    if grep -q "YOUR_GITHUB_USERNAME" "$APP_YAML"; then
        print_error "Please update app.yaml with your GitHub repository details"
        echo ""
        echo "Edit: $APP_YAML"
        echo "Replace: YOUR_GITHUB_USERNAME/pikcel-ai-shopify-app"
        exit 1
    fi

    print_success "app.yaml configuration valid"
}

get_app_id() {
    local app_name="pikcel-ai-shopify-app"
    local app_id=$(doctl apps list --format ID,Spec.Name --no-header | grep "$app_name" | awk '{print $1}')
    echo "$app_id"
}

create_app() {
    print_info "Creating new app on DigitalOcean..."

    check_doctl
    check_auth
    check_app_yaml

    print_info "Deploying from: $APP_YAML"

    doctl apps create --spec "$APP_YAML"

    print_success "App created successfully!"

    local app_id=$(get_app_id)
    if [ -n "$app_id" ]; then
        print_info "App ID: $app_id"
        echo ""
        print_warning "Next steps:"
        echo "  1. Set environment secrets: ./deploy.sh setup-secrets"
        echo "  2. Monitor deployment: ./deploy.sh logs"
        echo "  3. Check status: ./deploy.sh status"
    fi
}

update_app() {
    print_info "Updating existing app on DigitalOcean..."

    check_doctl
    check_auth
    check_app_yaml

    local app_id=$(get_app_id)

    if [ -z "$app_id" ]; then
        print_error "App not found. Use './deploy.sh create' to create a new app."
        exit 1
    fi

    print_info "App ID: $app_id"
    print_info "Updating from: $APP_YAML"

    doctl apps update "$app_id" --spec "$APP_YAML"

    print_success "App updated successfully!"
}

setup_secrets() {
    print_info "Setting up environment secrets..."

    check_doctl
    check_auth

    local app_id=$(get_app_id)

    if [ -z "$app_id" ]; then
        print_error "App not found. Deploy the app first."
        exit 1
    fi

    echo ""
    print_warning "You will need:"
    echo "  - Shopify API Key"
    echo "  - Shopify API Secret"
    echo "  - Session Secret (generate with: openssl rand -base64 32)"
    echo ""

    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi

    # Get Shopify credentials
    read -p "Enter SHOPIFY_API_KEY: " shopify_key
    read -sp "Enter SHOPIFY_API_SECRET: " shopify_secret
    echo

    # Generate or input session secret
    read -p "Generate new session secret? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        session_secret=$(openssl rand -base64 32)
        print_success "Session secret generated"
    else
        read -sp "Enter SHOPIFY_APP_SESSION_SECRET: " session_secret
        echo
    fi

    # Update app with secrets
    print_info "Updating app secrets..."

    doctl apps update "$app_id" \
        --env "SHOPIFY_API_KEY=$shopify_key" \
        --env "SHOPIFY_API_SECRET=$shopify_secret" \
        --env "SHOPIFY_APP_SESSION_SECRET=$session_secret"

    print_success "Secrets updated successfully!"
    print_warning "The app will automatically redeploy with new secrets"
}

show_logs() {
    check_doctl
    check_auth

    local app_id=$(get_app_id)

    if [ -z "$app_id" ]; then
        print_error "App not found"
        exit 1
    fi

    local log_type="${1:-RUN}"

    print_info "Showing $log_type logs for app: $app_id"
    print_info "Press Ctrl+C to exit"
    echo ""

    doctl apps logs "$app_id" --type "$log_type" --follow
}

show_status() {
    check_doctl
    check_auth

    local app_id=$(get_app_id)

    if [ -z "$app_id" ]; then
        print_error "App not found"
        exit 1
    fi

    print_info "App Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    doctl apps get "$app_id"

    echo ""
    print_info "Live URL:"
    doctl apps get "$app_id" --format LiveURL --no-header
}

list_apps() {
    check_doctl
    check_auth

    print_info "Your DigitalOcean Apps"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    doctl apps list
}

show_help() {
    echo "DigitalOcean App Platform Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  create          Create a new app on DigitalOcean"
    echo "  update          Update an existing app"
    echo "  setup-secrets   Set up environment secrets (Shopify credentials)"
    echo "  logs            View runtime logs (default)"
    echo "  logs build      View build logs"
    echo "  logs deploy     View deployment logs"
    echo "  status          Check app status and URL"
    echo "  list            List all your apps"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh create              # Create new app"
    echo "  ./deploy.sh update              # Update app config"
    echo "  ./deploy.sh setup-secrets       # Set Shopify credentials"
    echo "  ./deploy.sh logs                # View runtime logs"
    echo "  ./deploy.sh status              # Check app status"
}

# Main script logic
case "${1:-help}" in
    create)
        create_app
        ;;
    update)
        update_app
        ;;
    setup-secrets)
        setup_secrets
        ;;
    logs)
        show_logs "${2:-RUN}"
        ;;
    status)
        show_status
        ;;
    list)
        list_apps
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
