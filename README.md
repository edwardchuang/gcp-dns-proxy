# gcp-dns-proxy

A DNS proxy which responding DNS queries with addresses of GCE instances resolution<br />
You can hook-up your GCE instance address on a public of private domain name by point NS record <br />
to this DNS proxy which will translate the address of instance name in a project like: <br />

~~~~
<instance-name>.<project_id or alias>.your.domain.here
~~~~

# Install

~~~~bash
$ npm install
~~~~

# Config

Insert your project id and corresponding service account JSON key path into project_ids.js
You can optionally assign aliases for your project id

~~~~json
[
  { "alias": [], "project_id": "your-project-id", "key": "path_to_service_account.json"},
  { ... }
]
~~~~

Please refer to config.js for more configurable parameters.<br />

# Running

You need root privilege to bind this proxy on port 53 
~~~~bash
$ sudo node dns
~~~~

Note: you can use pm2 (http://pm2.io) for managing this application as well as manage startup on boot.
