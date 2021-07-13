import React, { Component } from "react";
import client from "./client";
import House from "./main";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

class Application extends Component {
  render() {
    return (
      <div>
        <Router>
          <Switch>
            <Route path="/" exact component={House} />
            <Route path="/:link" component={client} />
          </Switch>
        </Router>
      </div>
    );
  }
}

export default Application;
