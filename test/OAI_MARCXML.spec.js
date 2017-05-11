/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');

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
