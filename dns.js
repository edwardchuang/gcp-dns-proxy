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

exports.serial = new Date().getTime(); /* serial number for this runtime */
    
// DNS query types
var A = 1;
var NS = 2;
var CNAME = 5;
var SOA = 6;
var PTR = 12;
var MX = 15;
var TXT = 16;

server.on('request', function(request, response) {
  if ([A].indexOf(request.question[0].type) == -1) {
    response.send();
    return;
  }
  
  var domain = request.question[0].name;
  
  /* foramt: <instance name>.<project id or alias>.<type>.foo.dont.care */
  /* type: i = internal, * (else) = external
   */
  var _s = domain.split(".");
  console.log(_s);
  
  var hostname = _s[0];
  var project = _s[1];
  var isInternal = (3 <= _s.length && 'i' == _s[2].toLowerCase());
  
  gcp.getInstances(project, function(ret) {
    if (0 == ret.length) {
      console.log("empty result.");
      response.send();
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
