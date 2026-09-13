FROM quay.io/keycloak/keycloak:26.7.3

USER root
COPY realm-pulso-piura.json /opt/keycloak/data/import/realm.json
COPY bootstrap.sh /opt/keycloak/bootstrap/bootstrap.sh
RUN chmod 0555 /opt/keycloak/bootstrap/bootstrap.sh \
    && chown -R 1000:0 /opt/keycloak/data/import /opt/keycloak/bootstrap
USER 1000
