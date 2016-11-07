/*
 * gcp.js
 *
 * Compute Engine API wrapper
 */

"use strict";
var async = require('async');
var util = require('util');

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

  getInstances(keyword, resultcallback) {
    var filter = util.format('(name eq %s*) (status eq RUNNING)', keyword)
    var results = [];
    this.gce.getVMs({'filter': filter}, function(err, vms) {
      async.eachSeries(vms, function(key, doneOfEach){
        if ('RUNNING' == key.metadata.status) {
          results.push({'name': key.name, 'privateIP': key.metadata.networkInterfaces[0].networkIP, 'publicIP': key.metadata.networkInterfaces[0].accessConfigs[0].natIP, 'TTL': config["default_ttl"]});
        }
        return doneOfEach(null);
      }, function(err, rs) {
        if (!err) {
          resultcallback(results);
        } else {
          console.log(err);
        }
      });
    });

    this.gce.getVMs()
      .on('error', console.error)
      .on('data', function(vm) { /* intentionally empty function */ })
      .on('end', function() { /* intentionally empty function */});
  }
}

module.exports = GCP;
