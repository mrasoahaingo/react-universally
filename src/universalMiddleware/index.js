/* @flow */

import type { $Request, $Response, Middleware } from 'express';
import React from 'react';
import { ServerRouter, createServerRenderContext } from 'react-router';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo';
import { getDataFromTree } from 'react-apollo/server';
import render from './render';
import runTasksForLocation from '../shared/universal/routeTasks/runTasksForLocation';
import App from '../shared/universal/components/App';
import configureStore from '../shared/universal/redux/configureStore';

/**
 * An express middleware that is capabable of doing React server side rendering.
 */
function universalReactAppMiddleware(request: $Request, response: $Response) {
  if (typeof response.locals.nonce !== 'string') {
    throw new Error('A "nonce" value has not been attached to the response');
  }
  const nonce = response.locals.nonce;

  if (process.env.DISABLE_SSR === 'true') {
    if (process.env.NODE_ENV === 'development') {
      console.log('==> Handling react route without SSR');  // eslint-disable-line no-console
    }
    // SSR is disabled so we will just return an empty html page and will
    // rely on the client to initialize and render the react application.
    const html = render({ nonce });
    response.status(200).send(html);
    return;
  }

  // Create our apollo client.
  const apolloClient = new ApolloClient({
    ssrMode: true,
    // Remember that this is the interface the SSR server will use to connect to the
    // API server, so we need to ensure it isn't firewalled, etc
    networkInterface: createNetworkInterface({
      uri: `http://localhost:${process.env.SERVER_PORT}/graphql`,
      opts: {
        credentials: 'same-origin',
        // transfer request headers to networkInterface so that they're accessible to proxy server
        // Addresses this issue: https://github.com/matthew-andrews/isomorphic-fetch/issues/83
        headers: request.headers,
      },
    }),
  });

  // Create the redux store.
  const store = configureStore(apolloClient);
  const { dispatch } = store;

  // Set up a function we can call to render the app and return the result via
  // the response.
  const renderApp = () => {
    // First create a context for <ServerRouter>, which will allow us to
    // query for the results of the render.
    const context = createServerRenderContext();

    // Create the application react element.
    const app = (
      <ServerRouter
        location={request.url}
        context={context}
      >
        <ApolloProvider store={store} client={apolloClient}>
          <App />
        </ApolloProvider>
      </ServerRouter>
    );

    getDataFromTree(app).then((apolloContext) => {
      // Get our initial app state from Apollo store.
      const initialState = apolloContext.store.getState();
      // Here we have to prune the queries from the initial state
      // before sending it to the client to fix this issue:
      // https://github.com/apollostack/apollo-client/issues/845
      // Hopefully Apollo maintiners will have a better fix.
      Object.keys(initialState.apollo).forEach((key) => {
        if (key === 'queries') {
          // Set the key to empty object, because removing it breaks
          // the client.
          initialState.apollo[key] = {};
        }
      });
      // Render the app to a string.
      const html = render({
        // Provide the full app react element.
        app,
        // Provide the redux store state, this will be bound to the window.APP_STATE
        // so that we can rehydrate the state on the client.
        initialState,
        // The nonce for inline script security.
        nonce,
      });

      // Get the render result from the server render context.
      const renderResult = context.getResult();

      // Check if the render result contains a redirect, if so we need to set
      // the specific status and redirect header and end the response.
      if (renderResult.redirect) {
        response.status(301).setHeader('Location', renderResult.redirect.pathname);
        response.end();
        return;
      }

      response
        .status(
          renderResult.missed
            // If the renderResult contains a "missed" match then we set a 404 code.
            // Our App component will handle the rendering of an Error404 view.
            ? 404
            // Otherwise everything is all good and we send a 200 OK status.
            : 200
        )
        .send(html);
    }).catch(err => console.log(err));
  };

  // Execute any 'prefetchData' tasks that get matched for the request location.
  const executingTasks = runTasksForLocation(
    { pathname: request.originalUrl }, ['prefetchData'], { dispatch }
  );

  if (executingTasks) {
    // Some tasks are executing so we will chain the promise, waiting for them
    // to complete before we render the application.
    executingTasks.then(({ routes }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Finished route tasks', routes); // eslint-disable-line no-console,max-len
      }

      // The tasks are complete! Our redux state will probably contain some
      // data now. :)

      // Lets render the app and return the response.
      renderApp();
    });
  } else {
    // No tasks are being executed so we can render and return the response.
    renderApp();
  }
}

export default (universalReactAppMiddleware : Middleware);
