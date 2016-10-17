/*
 * gcp.js
 *
 * Compute Engine API wrapper
 */

"use strict";
class GCP {
  constructor(project) {
    var gcloud = require('google-cloud');
    var current = projects.filter(function (o) { return (o.project == project || -1 != o.alias.indexOf(project)); });
    this.error = false;
    
    if (0 == current.length) {
      console.log('project id or alias: \'' + project + '\' not found');
      this.error = true;
      return false;
    }
    this.gce = gcloud.compute({
        projectId: current[0].project,
      keyFilename: config["key_dir"] + current[0].key
    });
  }

  getInstances(resultcallback) {
    var results = [];
    this.gce.getVMs(function(err, vms) {
      if (null == vms || 0 == vms.length) {
        return;
      }
      for(var i = 0 ; i < vms.length ; i++) {
        var key = vms[i];
        if ('RUNNING' == key.metadata.status) {
          results.push({'name': key.name, 'privateIP': key.metadata.networkInterfaces[0].networkIP, 'publicIP': key.metadata.networkInterfaces[0].accessConfigs[0].natIP, 'TTL': config["default_ttl"]});
        }
      }
    });

    this.gce.getVMs()
      .on('error', console.error)
      .on('data', function(vm) { /* intentionally empty function */ })
      .on('end', function() { resultcallback(results); });
  }
}

module.exports = GCP;
