import React, { Component } from 'react';
import logo from './logo_dark.png';
import Dropzone from 'react-dropzone'
import IOTA from 'iota.lib.js';
import '@blueprintjs/core/dist/blueprint.css';
import './App.css';
var CryptoJS = require("crypto-js");
const generate = require('iota-generate-seed');
const request = require('request');

const iota = new IOTA({
  provider: 'http://eugeneoldisoft.iotasupport.com:14265'
});

class App extends Component {

  constructor(props) {
    super(props);
    this.state = { spin: false, hashString: "", data: {}}
    this.verify = this.verify.bind(this);
    this.post = this.post.bind(this);
  }

  onDrop = (acceptedFiles, rejectedFiles) => {
    var reader = new FileReader();
    reader.readAsArrayBuffer(acceptedFiles[0]);
    const self = this;
    reader.addEventListener("loadend", function () {
      self.setState({spin: true});
      const wordArray = CryptoJS.lib.WordArray.create(reader.result);
      var hash = CryptoJS.SHA256(wordArray);
      console.log(hash.toString(CryptoJS.enc.Hex));
      self.setState({hashString: hash.toString(CryptoJS.enc.Hex), uploading: false});
      /* Use the logged hash string above to post to the tangle */
      self.verify(self.state.hashString);
      /* Use one endpoint on the backend. Return the value that is the response, 
      if the hash exists and is verified, return the associated data,
      if the hash does not exist return some data that indicates it was put on the chain*/
    });
  }

  verify(hash) {
    console.log(hash,"HASH");
    var command = {
      'command': 'findTransactions',
      'tags': [iota.utils.toTrytes(hash)]
    }

    var options = {
      url: 'http://eugeneoldisoft.iotasupport.com:14265',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(command).length
      },
      json: command
    };
    const self = this;

    request(options, function (error, response, data) {
      if (!error && response.statusCode === 200) {
        console.log(data);
        self.setState({data: data});
        if (data.hashes.length === 0) {
          self.post(hash);
        }
        else {
          self.setState({spin: false})
        }
      }
    });
  }

  post(hash) {
    const seed = generate();
    // now you can start using all of the functions
    console.log(hash);
    const tag = iota.utils.toTrytes(hash);
    const message = iota.utils.toTrytes(new Date().toString());

    iota.api.getNewAddress(seed, {}, function (error, address) {
      console.log("Generated Address: " + address);
      var transfer = [{
        'address': address,
        'value': parseInt(0, 10),
        'message': message,
        'tag': tag
      }]


      console.log("Sending Transfer", transfer);

      // We send the transfer from this seed, with depth 4 and minWeightMagnitude 18
      iota.api.sendTransfer(seed, 4, 18, transfer, function (e) {
        if (e) console.log(e);
        else {
          self.setState({spin: false});
          console.log("Transfer success");
        }
      });
    });
  }

  render() {
    return (
      <div className="App container-fluid">
        <div className="row pad-1">
          <div className="col-sm-3"><h1>Proof of Existence</h1></div>
          <div className="col-sm-6"></div>
          <div className="col-sm-3"></div>
          {/* <img src='./logo_dark.png' height="64px"/>*/}
        </div>
        <div className="row pad-1">
            <div className="col-md-3"></div>
            <div className="pt-card col-md-6">
            <Dropzone className="drop" onDrop={this.onDrop} multiple={false} style={{}} activeClassName="drop-active">
                <div className="pad-side">      
                      <h4>Drop a file into the box to get started!</h4>
                      <h4>The file will NOT be uploaded. The cryptographic proof is calculated client-side</h4>
                    </div>
                </Dropzone>
            </div>
            <div className="col-md-3"></div>
          </div>
        <div className="row pad-1">
          <div className="col-md-3"></div>
            {this.state.hashString === "" ? <div className="col-md-6"></div> : 
              <div className="pt-card col-md-6">
              <h3> Hash of File: </h3>
              <code>{this.state.hashString}</code>
              </div>
          }
          <div className="col-md-3"></div>
        </div>
      </div>
    );
  }
}

export default App;
