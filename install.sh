#!/bin/bash

SERVICE_NAME="pos-printer"
INSTALL_DIR="/opt/pos-printer-service"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

install_service() {
    echo "Installing POS Printer Service..."

    # Ensure rsync is available
    if ! command -v rsync &> /dev/null; then
        echo "rsync not found, installing..."
        apt-get update && apt-get install -y rsync
    fi

    # Create installation directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"

    # Sync files from current folder to install dir, ensuring it's a clean copy
    rsync -av --delete ./ "$INSTALL_DIR/"

    # Install dependencies
    cd "$INSTALL_DIR"
    npm install --omit=dev

    # Set up service file
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=POS Printer Service
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/index.js
WorkingDirectory=$INSTALL_DIR
Restart=always
User=$SUDO_USER
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

    # Reload systemd, enable + restart service
    systemctl daemon-reexec
    systemctl enable $SERVICE_NAME.service
    systemctl restart $SERVICE_NAME.service

    echo "POS Printer Service installed and started successfully!"
}

uninstall_service() {
    echo "Uninstalling POS Printer Service..."

    systemctl stop $SERVICE_NAME.service
    systemctl disable $SERVICE_NAME.service
    rm -f "$SERVICE_FILE"
    systemctl daemon-reexec

    echo "Service removed. Files are still in $INSTALL_DIR (remove manually if needed)."
}

case "$1" in
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    reinstall)
        uninstall_service
        install_service
        ;;
    *)
        echo "Usage: $0 {install|uninstall|reinstall}"
        exit 1
        ;;
esac

