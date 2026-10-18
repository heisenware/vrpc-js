#!/bin/ash

set -e

# Fix write permissions for mosquitto directories
chown --no-dereference --recursive mosquitto /mosquitto/log
chown --no-dereference --recursive mosquitto /mosquitto/data

mkdir -p /var/run/mosquitto \
  && chown --no-dereference --recursive mosquitto /var/run/mosquitto

if ( [ -z "${MOSQUITTO_USERNAME}" ] || [ -z "${MOSQUITTO_PASSWORD}" ] ); then
  echo "MOSQUITTO_USERNAME or MOSQUITTO_PASSWORD not defined"
  exit 1
fi

# create mosquitto passwordfile, readable by the broker alone
touch /mosquitto/config/passwordfile
mosquitto_passwd -b /mosquitto/config/passwordfile $MOSQUITTO_USERNAME $MOSQUITTO_PASSWORD
chown mosquitto:mosquitto /mosquitto/config/passwordfile
chmod 0600 /mosquitto/config/passwordfile

exec "$@"
