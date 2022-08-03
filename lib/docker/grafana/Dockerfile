FROM grafana/grafana:8.2.6-ubuntu
## Copy Provisioning yml for dashboards and datasources
COPY ./config/provisioning /etc/grafana/provisioning
COPY ./config/grafana.ini /etc/grafana/grafana.ini
## install Plugins
RUN grafana-cli plugins install flant-statusmap-panel
RUN grafana-cli plugins install grafana-athena-datasource