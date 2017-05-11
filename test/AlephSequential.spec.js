/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');

describe('AlephSequential', function() {

  var filesPath = path.resolve(__dirname, 'files/AlephSequential');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') == 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');
  
    it(`should convert file ${fromFile} to file ${toFile}`, function(done) {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var expectedRecord = fs.readFileSync(toFilePath, 'utf8');
      var reader = new Serializers.AlephSequential.Reader(fs.createReadStream(fromFilePath));

      var parsedRecords = [];
      reader.on('data', function(record) {
        parsedRecords.push(record);
      });

      reader.on('end', function() {

        expect(parsedRecords).to.have.length(1);

        var parsedRecordAsString = parsedRecords[0].toString();
        expect(parsedRecordAsString).to.equal(expectedRecord);
        
        done();
      });

    });

    it('should emit an error because of invalid data', function(done) {

      var filePath = path.resolve(__dirname, 'files/AlephSequential/erroneous');
      var reader = new Serializers.AlephSequential.Reader(fs.createReadStream(filePath));
                  
      reader.on('error', function() {
        done();
      });
    });
  });
});
