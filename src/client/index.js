/* @flow */
/* eslint-disable global-require */

import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router';
import ApolloClient from 'apollo-client';
import { ApolloProvider } from 'react-apollo';
import configureStore from '../shared/universal/redux/configureStore';
import ReactHotLoader from './components/ReactHotLoader';
import TaskRoutesExecutor from './components/TaskRoutesExecutor';
import App from '../shared/universal/components/App';

// Create the apollo graphql client.
const apolloClient = new ApolloClient({
  initialState: window.APP_STATE,
});

// Get the DOM Element that will host our React application.
const container = document.querySelector('#app');

// Create our Redux store.
const store = configureStore(
  apolloClient,
  // Server side rendering would have mounted our state on this global.
  window.APP_STATE
);

function renderApp(TheApp) {
  render(
    <ReactHotLoader>
      <ApolloProvider store={store} client={apolloClient}>
        <BrowserRouter>
          {
            routerProps =>
              <TaskRoutesExecutor {...routerProps} dispatch={store.dispatch}>
                <TheApp />
              </TaskRoutesExecutor>
          }
        </BrowserRouter>
      </ApolloProvider>
    </ReactHotLoader>,
    container
  );
}

// The following is needed so that we can support hot reloading our application.
if (process.env.NODE_ENV === 'development' && module.hot) {
  // Accept changes to this file for hot reloading.
  module.hot.accept('./index.js');
  // Any changes to our App will cause a hotload re-render.
  module.hot.accept(
    '../shared/universal/components/App',
    () => renderApp(require('../shared/universal/components/App').default)
  );
}

renderApp(App);
