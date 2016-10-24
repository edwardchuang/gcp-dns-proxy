FROM node:4
RUN mkdir -p /opt/dns
WORKDIR /opt/dns
COPY package.json /opt/dns
RUN npm install /opt/dns
COPY . /opt/dns
EXPOSE 53/udp
CMD [ "node", "dns" ]
