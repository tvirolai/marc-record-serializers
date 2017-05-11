/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var Record = require('marc-record-js');
var pd = require('pretty-data').pd;

describe('MARCXML reader', function() {

  var filesPath = path.resolve(__dirname, 'files/MARCXML');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') == 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');
    it(`should convert file ${fromFile} to file ${toFile}`, function(done) {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var expectedRecord = fs.readFileSync(toFilePath, 'utf8').trim();
      var reader = new Serializers.MARCXML.Reader(fs.createReadStream(fromFilePath));

      var parsedRecords = [];

      reader.on('data', function(record) {
        parsedRecords.push(record);
      });

      reader.on('error', function(error) {
        expect('Error: ' + error.message).to.equal(expectedRecord);
    
      });

      reader.on('end', function() {

        if (expectedRecord.substr(0,5) != 'Error') {
          expect(parsedRecords).to.have.length(1);
          var parsedRecordAsString = parsedRecords[0].toString();
          expect(parsedRecordAsString).to.equal(expectedRecord);

        }
        done();
      });

    });
  });
});


describe('MARCXML toMARCXML', function() {

  var filesPath = path.resolve(__dirname, 'files/MARCXML');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') === 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');
    it(`should convert file ${toFile} to file ${fromFile}`, function(done) {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var inMarcMXL = fs.readFileSync(fromFilePath, 'utf8').trim();

      var inJS = fs.readFileSync(toFilePath, 'utf8');

      if (inJS.substr(0,5) === 'Error') {
        return done();
      }

      var record = Serializers.MARCXML.toMARCXML( Record.fromString(inJS) );
      
      var declaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
      expect(pd.xml(declaration+record)).to.equal(pd.xml(inMarcMXL));
      done();

    });
  });
});