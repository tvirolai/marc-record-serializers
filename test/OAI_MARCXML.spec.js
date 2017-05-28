/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var Record = require('marc-record-js');
var pd = require('pretty-data').pd;


describe('OAI_MARCXML parsing', function() {

  var filesPath = path.resolve(__dirname, 'files/OAI_MARCXML');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') == 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');
    it(`should convert file ${fromFile} to file ${toFile}`, function() {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var fromRecord = fs.readFileSync(fromFilePath, 'utf8').trim();
      var expectedRecord = fs.readFileSync(toFilePath, 'utf8').trim();
      
      var parsedRecord = Serializers.OAI_MARCXML.fromOAI_MARCXML(fromRecord);

      var parsedRecordAsString = parsedRecord.toString();
   
      expect(parsedRecordAsString).to.equal(expectedRecord);
   
    });
  });
});

describe('OAI_MARCXML toOAI_MARCXML', function() {

  var filesPath = path.resolve(__dirname, 'files/OAI_MARCXML');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') === 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');
    it(`should convert file ${toFile} to file ${fromFile}`, function(done) {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var expectedOAI_MARCXML = fs.readFileSync(fromFilePath, 'utf8').trim();

      var inJS = fs.readFileSync(toFilePath, 'utf8');

      if (inJS.substr(0,5) === 'Error') {
        return done();
      }

      var record = Serializers.OAI_MARCXML.toOAI_MARCXML( Record.fromString(inJS) );
      
      var declaration = '<?xml version = "1.0" encoding = "UTF-8"?>\n';
      expect(pd.xml(declaration+record)).to.equal(pd.xml(expectedOAI_MARCXML));
      done();

    });
  });

});