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

# GKE (Google Container Engine) user

You can simply deploy to your GKE cluster by
~~~~bash
$ docker build -t asia.gcr.io/<your project id>/gcp-dns-proxy
$ gcloud docker push asia.gcr.io/<your project id>/gcp-dns-proxy
~~~~

(edit gcp-dns-proxy.yaml with proper setting fits your environment)

~~~~bash
$ kubectl create -f gcp-dns-proxy.yaml
$ kubectl expost -f gcp-dns-proxy.yaml --type=LoadBalancer
~~~~

(then get the external ip)

~~~~bash
$ kubectl get service gcp-dns-proxy
~~~~

(create "secret" with your service account json files)

~~~~bash
$ kubectl create secret generic gcp-secret --from-file=<json1> --from-file=<json2> ...
~~~~

