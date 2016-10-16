/*
 * gcp.js
 *
 * Compute Engine API wrapper
 */

module.exports = {
  getInstances: function(project, resultcallback) {
    var results = [];
    var gcloud = require('google-cloud');
    var current = projects.filter(function (o) { return (o.project == project || -1 != o.alias.indexOf(project)); });

    if (0 == current.length) {
      console.log('project id or alias: ' + project + ' not found');
      return [];
    }
    var gce = gcloud.compute({
        projectId: current[0].project,
      keyFilename: config["key_dir"] + current[0].key
    });

    function callback(err, addresses, nextQuery, apiResponse) {
      if (null == addresses || 0 == addresses.length) {
        return;
      }
      addresses.forEach(function (key) {
        if ('RUNNING' != key.metadata.status) {
          return;
        }
        results.push({'name': key.name, 'privateIP': key.metadata.networkInterfaces[0].networkIP, 'publicIP': key.metadata.networkInterfaces[0].accessConfigs[0].natIP, 'TTL': config["default_ttl"]});
      });
      if (nextQuery) {
        gce.getVMs(nextQuery, callback);
      }
    }
            
    gce.getVMs({
      autoPaginate: false
    }, callback);

    gce.getVMs()
      .on('error', console.error)
      .on('data', function(vm) {
      })
      .on('end', function() {
         resultcallback(results);
      });
  }
};
