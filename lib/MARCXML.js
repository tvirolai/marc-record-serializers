'use strict';

var Record = require('marc-record-js');
var util = require('util');
var xmldom = require('xmldom');
var serializer = new xmldom.XMLSerializer();
var xmldoc =  new xmldom.DOMImplementation().createDocument();
var parser = new xmldom.DOMParser();

var NODE_TYPE = {
  TEXT_NODE: 3
};

var MARCXMLReader = function(stream) {

  var self = this,
    charbuffer = '';

  stream.on('data', function(data) {
    charbuffer += data.toString();
    while (1) { // eslint-disable-line no-constant-condition
      var pos = charbuffer.indexOf('<record');
      if (pos === -1) { return; }
      charbuffer = charbuffer.substr(pos);
      pos = charbuffer.indexOf('</record>');
      if (pos === -1) { return; }
      var raw = charbuffer.substr(0, pos+9);
      charbuffer = charbuffer.substr(pos+10);

      try {
        self.emit('data', fromMARCXML(raw));
      } catch(e) {
        self.emit('error', e);
      }

    }
  });

  stream.on('end', function(){
    self.emit('end');
  });

  stream.on('error', function(error){
    self.emit('error', error);
  });

};
util.inherits(MARCXMLReader, require('stream'));

function toMARCXML(record) {

  var xmlRecord = mkElement('record');
  var leader = mkElementValue('leader', record.leader);

  xmlRecord.appendChild(leader);
  record.getControlfields().forEach(function(field) {
    xmlRecord.appendChild(mkControlfield(field.tag, field.value));
  });
  record.getDatafields().forEach(function(field) {
    xmlRecord.appendChild(mkDatafield(field));
  });

  function mkDatafield(field) {
    var datafield = mkElement('datafield');
    datafield.setAttribute('tag', field.tag);
    datafield.setAttribute('ind1', formatIndicator(field.ind1));
    datafield.setAttribute('ind2', formatIndicator(field.ind2));

    field.subfields.forEach(function(subfield) {
      var sub = mkElementValue('subfield', subfield.value);
      sub.setAttribute('code', subfield.code);

      datafield.appendChild(sub);
    });

    return datafield;

  }

  function formatIndicator(ind) {
    return ind == '_' ? ' ' : ind;
  }

  function mkElementValue(name, value) {
    var el = mkElement(name);
    var t = xmldoc.createTextNode(value);
    el.appendChild(t);
    return el;
  }
  function mkElement(name) {
    return xmldoc.createElement(name);
  }

  function mkControlfield(tag, value) {
    var cf = mkElement('controlfield');
    cf.setAttribute('tag', tag);
    var t = xmldoc.createTextNode(value);
    cf.appendChild(t);
    return cf;
  }

  return serializer.serializeToString(xmlRecord);

}

function fromMARCXML(xmlString) {

  var record = new Record();

  var doc = parser.parseFromString(xmlString);

  var recordNode = doc.getElementsByTagName('record')[0];

  var childNodes = (recordNode !== undefined) ?  Array.prototype.slice.call(recordNode.childNodes) : [];

  childNodes.filter(notTextNode).forEach(function(node) {
  
    switch (node.tagName) {
      case 'leader': handleLeaderNode(node); break;
      case 'controlfield': handleControlfieldNode(node); break;
      case 'datafield': handleDatafieldNode(node); break;
      default: throw new Error('Unable to parse node: ' + node.tagName); 
    }

    function handleLeaderNode(node) {
      if (node.childNodes[0] !== undefined && node.childNodes[0].nodeType === NODE_TYPE.TEXT_NODE) {
        record.leader = node.childNodes[0].data;
      } else {
        throw new Error('Record has invalid leader');
      }
    }

    function handleControlfieldNode(node) {
      var tag = node.getAttribute('tag');
      if (node.childNodes[0] !== undefined && node.childNodes[0].nodeType === NODE_TYPE.TEXT_NODE) {
        var value = node.childNodes[0].data;
        record.appendControlField([tag, value]);
      } else {
        throw new Error('Unable to parse controlfield: ' + tag);
      }
    }

    function handleDatafieldNode(node) {
      var tag = node.getAttribute('tag');
      var ind1 = node.getAttribute('ind1');
      var ind2 = node.getAttribute('ind2');

      var subfields = Array.prototype.slice.call(node.childNodes).filter(notTextNode).map(function(subfieldNode) {

        var code = subfieldNode.getAttribute('code');
        var text = getChildTextNodeContents(subfieldNode).join('');

        return {
          code: code,
          value: text
        };
      });

      record.appendField({
        tag: tag,
        ind1: ind1,
        ind2: ind2,
        subfields: subfields
      });

    }

    function getChildTextNodeContents(node) {
      var childNodes = Array.prototype.slice.call(node.childNodes);
      var textNodes = childNodes.filter(function(node) {
        return node.nodeType === NODE_TYPE.TEXT_NODE;
      });
      return textNodes.map(function(node) {
        return node.data;
      });
    }


  });

  return record;
}

function notTextNode(node) {
  return node.nodeType !== NODE_TYPE.TEXT_NODE;
}

module.exports = {
  Reader: MARCXMLReader,
  Writer: undefined,
  toMARCXML: toMARCXML,
  fromMARCXML: fromMARCXML
};
