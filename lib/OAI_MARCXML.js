'use strict';

var Record = require('marc-record-js');
var xmldom = require('xmldom');
var parser = new xmldom.DOMParser();

var NODE_TYPE = {
  TEXT_NODE: 3
};

function fromOAI_MARCXML(xmlString) {

  var record = new Record();
  
  var doc = parser.parseFromString(xmlString);

  var recordNode = doc.getElementsByTagName('oai_marc')[0];

  var childNodes = (recordNode !== undefined) ?  Array.prototype.slice.call(recordNode.childNodes) : [];

  childNodes.filter(notTextNode).forEach(function(node) {
  
    switch (node.tagName) {
      case 'fixfield': handleControlfieldNode(node); break;
      case 'varfield': handleDatafieldNode(node); break;
      default: throw new Error('Unable to parse node: ' + node.tagName); 
    }

    function handleControlfieldNode(node) {
      var tag = node.getAttribute('id');
      if (node.childNodes[0] !== undefined && node.childNodes[0].nodeType === NODE_TYPE.TEXT_NODE) {
        var value = node.childNodes[0].data;
        if (tag === 'LDR') {
          record.leader = value;
        } else {
          record.appendControlField([tag, value]);
        }    
      } else {
        throw new Error('Unable to parse controlfield: ' + tag);
      }
    }

    function handleDatafieldNode(node) {
      var tag = node.getAttribute('id');
      var ind1 = node.getAttribute('i1');
      var ind2 = node.getAttribute('i2');

      var subfields = Array.prototype.slice.call(node.childNodes).filter(notTextNode).map(function(subfieldNode) {

        var code = subfieldNode.getAttribute('label');
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
  fromOAI_MARCXML: fromOAI_MARCXML
};
