FROM node:boron
RUN mkdir -p /opt/dns
WORKDIR /opt/dns
COPY package.json /opt/dns
RUN npm install /opt/dns
COPY config.js /opt/dns
COPY project_ids.js /opt/dns
COPY dns.js /opt/dns
COPY gcp.js /opt/dns
EXPOSE 53/udp
CMD [ "node", "dns" ]
