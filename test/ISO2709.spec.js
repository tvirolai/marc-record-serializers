/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var Record = require('marc-record-js');

describe('ISO2709', function() {

  describe('when converting empty string', function() {
    it('should throw an error', function() {

      var error;
      try {
        Serializers.ISO2709.fromISO2709('');
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal('Invalid record');
    });

  });

  describe('ISO2709 conversion', function() {

    it('should work', function() {

      var singleRecordData = fs.readFileSync(path.resolve(__dirname, 'files/ISO2709/yksitietue.mrc'), 'utf8');

      var converted = Serializers.ISO2709.fromISO2709(singleRecordData);

      var toData = fs.readFileSync(path.resolve(__dirname, 'files/ISO2709/yksitietue.to'), 'utf8');


      expect(toData).to.equal(converted.toString());
      

    });
  });

  describe('to ISO2709 conversion', function() {

    it('should work', function() {

      var fromData = fs.readFileSync(path.resolve(__dirname, 'files/ISO2709/yksitietue.to'), 'utf8');
      var singleRecordData = fs.readFileSync(path.resolve(__dirname, 'files/ISO2709/yksitietue.mrc'), 'utf8');

      var converted = Serializers.ISO2709.toISO2709(Record.fromString(fromData));

      expect(converted).to.equal(singleRecordData);
    });
  });

  describe('ISO2709 ParseStream', function() {

    it('should work', function(done) {

      var parser = new Serializers.ISO2709.ParseStream();
      var fileStream = fs.createReadStream(path.resolve(__dirname, 'files/ISO2709/yksitietue.mrc'));
      fileStream.setEncoding('utf8');

      fileStream.pipe(parser);

      var parsedRecords = [];
      parser.on('data', function(record) {
        
        parsedRecords.push(record);
      });

      parser.on('end', function() {

        expect(parsedRecords).to.have.length(1);

        var parsedRecordAsString = parsedRecords[0].toString();

        var expectedRecord = fs.readFileSync(path.resolve(__dirname,'files/ISO2709/yksitietue.to'), 'utf8');

        expect(parsedRecordAsString).to.equal(expectedRecord);
        
        done();
      });

    });
  });

  describe('ISO2709 EncodeStream', function() {

    it('should work', function(done) {

      var readFromFile = path.resolve(__dirname,'files/ISO2709/files1.mrc');
      var writeToFile = path.resolve(__dirname,'files/ISO2709/files1.mrc.to');

      var fromFileStream = fs.createReadStream(readFromFile);
      var toFileStream = fs.createWriteStream(writeToFile);

      fromFileStream.setEncoding('utf8');
  
      var parser = new Serializers.ISO2709.ParseStream();
      var encoder = new Serializers.ISO2709.EncodeStream();

      fromFileStream.pipe(parser).pipe(encoder).pipe(toFileStream);

      toFileStream.on('finish', function() {

        var fromFile = fs.readFileSync(readFromFile, 'utf8');
        var toFile = fs.readFileSync(writeToFile, 'utf8');

        expect(fromFile).to.equal(toFile);

        done();
      });
    });
  });


});
