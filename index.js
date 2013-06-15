#!/usr/bin/env node

if (require.main === module) {
  var express = require('express');
  var app = express();


  var smeter = require('./lib/smeterengine').SmeterEngine();

  app.get('/', function(req, res){
    smeter.get({
      begin: req.query.begin || new Date().toISOString().split('T')[0] + ' 00:00:00',
      end: req.query.end  || new Date().toISOString().split('T')[0] + ' 23:59:59',
      district: req.query.district
    }, function(err, json, xml){
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      if (err) {
        console.log(err);
        return res.end(err);
      }
      // res.setHeader('Content-Type', 'text/xml; charset=UTF-8');
      var out = '';
      if (req.query.callback) {
        callback = req.query.callback.replace(/\W/g, '');
        out = callback + '(';
      }
      out += JSON.stringify(json);
      if (req.query.callback) {
        out += ');';
      }
      res.end(out);
      // res.end(xml);
    });
  });
  port = process.env.PORT || 3000;
  app.listen(port);
  console.log('Listening on port ' + port);
} else {
  module.exports = require('./lib/smeterengine');
}