/*
 * dns.js
 */
"use strict";

global.include = function(f) { var fs = require('fs'); eval(fs.readFileSync(f)+''); }

include('project_ids.js');
include('config.js');

var dns = require('native-dns');
var util = require('util');
var gcp = require('./gcp');
var server = dns.createServer();

exports.serial = new Date().getTime() / 1000 | 0; /* serial number for this runtime */
    
// DNS query types
var A = 1;
var NS = 2;
var CNAME = 5;
var SOA = 6;
var PTR = 12;
var MX = 15;
var TXT = 16;
var ANY = 255;

server.on('request', function(request, response) {
  console.log(util.format("[%s] %s:%s Query: %s Type: %s",Date(), request.address.address, request.address.port, request.question[0].name, request.question[0].type))

  if ([A, SOA, ANY].indexOf(request.question[0].type) == -1) {
    response.send();
    return;
  }

  var domain = request.question[0].name;
  
  /* foramt: <instance name>.<project id or alias>.<type>.foo.dont.care */
  /* type: i = internal, * (else) = external
   */
  var _s = domain.split(".");
  var hostname = _s[0];
  var project = _s[1];
  var isInternal = (3 <= _s.length && 'i' == _s[2].toLowerCase());
  var requestDomain = _s.slice((isInternal) ? 3 : 2).join('.');
  var isLegit = config["domains"].indexOf(requestDomain);

  if (-1 == isLegit && 0 != config['domains'].length) {
    /* discard for non hosting domain */
    response.send();
    return;
  }

  if (SOA == request.question[0].type) {
    response.answer.push(dns.SOA({
      'name': requestDomain,
      'type': SOA,
      'primary': config['primary_ns'],
      'admin': config['soa_admin'],
      'serial': exports.serial,
      'ttl': config["default_ttl"],
      'refresh': 900,
      'retry': 900,
      'expiration': 1800,
      'minimum': 60
    }));
    response.send();
    return;
  }

  var GCP = new gcp(project);
  if (true == GCP.error) { // error on initializing
    response.send();
    return;
  }

  GCP.getInstances(function(ret) {
    if (0 == ret.length) {
      console.log("empty result.");
      return;
    }
    var result = ret.filter(function (o) { return (o.name.toUpperCase() == hostname.toUpperCase()) });
    if (null == result) {
      console.log(hostname + " (" + domain + ") not match any.");
      response.send();
      return;
    }
    var record = {'name': domain, 'ttl': result[0].TTL, 'address': ''};
    if (true == isInternal) {
      record.address = result[0].privateIP;
    } else {
      record.address = result[0].publicIP;
    }
    response.answer.push(dns.A(record));
    response.send();
    console.log(record);
  });
  
});

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

console.log('Listening on '+53);
console.log('Serial: '+exports.serial);
if (!process.getuid || 0 != process.getuid()) {
  console.log('You need root permission to bind on port 53');
  return;
}
server.serve(53);
