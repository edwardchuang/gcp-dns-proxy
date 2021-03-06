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
var udpServer = dns.createUDPServer();
var tcpServer = dns.createTCPServer();

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

function processQueries(request, response) {
  console.log(util.format("[%s] %s:%s Query: %s Type: %s",Date(), request.address.address, request.address.port, request.question[0].name, request.question[0].type))

  if ([A, NS, SOA, ANY].indexOf(request.question[0].type) == -1) {
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
  var requestDomain = _s.slice((isInternal) ? -2 : -3).join('.');
  var isLegit = config["domains"].indexOf(requestDomain);
  var isRootLookup = config["domains"].indexOf(domain.toLowerCase());

  if (-1 == isLegit && 0 != config['domains'].length) {
    /* discard for non hosting domain */
    response.send();
    return;
  }

  response.additional.push(dns.A({'name': config['primary_ns'], 'ttl': config["default_ttl"], 'address': config['primary_ip'] }));
  config['secondary_ip'].forEach(function(v, i) {
    response.additional.push(dns.A({ 'name': config['secondary_ns'][i], 'ttl': config["default_ttl"], 'address': v }));
  });

  if (-1 != isRootLookup && -1 != isLegit && A == request.question[0].type) {
    response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': config['primary_ns'] }));
    config['secondary_ns'].forEach(function(v, i) {
      response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': v }));
    });
    response.send();
    return;
  }

  if (NS == request.question[0].type) {
    response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': config['primary_ns'] }));
    config['secondary_ns'].forEach(function(v, i) {
      response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': v }));
    });
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

    response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': config['primary_ns'] }));
    config['secondary_ns'].forEach(function(v, i) {
      response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': v }));
    });
    response.send();
    return;
  }

  var GCP = new gcp(project);
  if (true == GCP.error) { // error on initializing
    response.send();
    return;
  }

  GCP.getInstances(hostname, function(ret) {
    if (0 == ret.length) {
      console.log("empty result.");
      return;
    }
    // forced to one address for search result
    var record = {'name': domain, 'ttl': ret[0].TTL, 'address': ''};
    if (true == isInternal) {
      record.address = ret[0].privateIP;
    } else {
      record.address = ret[0].publicIP;
    }
    response.answer.push(dns.A(record));
    response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': config['primary_ns'] }));
    config['secondary_ns'].forEach(function(v, i) {
      response.authority.push(dns.NS({ 'name': requestDomain, 'type': NS, 'ttl': config["default_ttl"], 'data': v }));
    });
    response.send();
    console.log(record);
  });
}

udpServer.on('request', processQueries);
tcpServer.on('request', processQueries);
udpServer.on('error', function (err, buff, req, res) { console.log(err.stack); });
tcpServer.on('error', function (err, buff, req, res) { console.log(err.stack); });

console.log('Listening on '+53);
console.log('Serial: '+exports.serial);
if (!process.getuid || 0 != process.getuid()) {
  console.log('You need root permission to bind on port 53');
  sys.exit(0);
}
udpServer.serve(53);
tcpServer.serve(53);
