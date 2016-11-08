/* @flow */

import type { $Request, $Response, Middleware } from 'express';
import React from 'react';
import { ServerRouter, createServerRenderContext } from 'react-router';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo';
import { renderToStringWithData } from 'react-apollo/server';
import { CodeSplitProvider, createRenderContext } from 'code-split-component';
import Helmet from 'react-helmet';
import render from './render';
import runTasksForLocation from '../shared/universal/routeTasks/runTasksForLocation';
import App from '../shared/universal/components/App';
import configureStore from '../shared/universal/redux/configureStore';

/**
 * An express middleware that is capabable of doing React server side rendering.
 */
function universalReactAppMiddleware(request: $Request, response: $Response) {
  // We should have had a nonce provided to us.  See the server/index.js for
  // more information on what this is.
  if (typeof response.locals.nonce !== 'string') {
    throw new Error('A "nonce" value has not been attached to the response');
  }
  const nonce = response.locals.nonce;

  // It's possible to disable SSR, which can be useful in development mode.
  // In this case traditional client side only rendering will occur.
  if (process.env.DISABLE_SSR === 'true') {
    if (process.env.NODE_ENV === 'development') {
      console.log('==> Handling react route without SSR');  // eslint-disable-line no-console
    }
    // SSR is disabled so we will just return an empty html page and will
    // rely on the client to initialize and render the react application.
    const html = render({
      // Nonce which allows us to safely declare inline scripts.
      nonce,
    });
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
    const reactRouterContext = createServerRenderContext();

    // We also create a context for our <CodeSplitProvider> which will allow us
    // to query which chunks/modules were used during the render process.
    const codeSplitContext = createRenderContext();

    // Create our application
    // Apollo will render it to a string for us using renderToStringWithData below
    const app = (
      <CodeSplitProvider context={codeSplitContext}>
        <ServerRouter
          location={request.url}
          context={reactRouterContext}
        >
          <ApolloProvider store={store} client={apolloClient}>
            <App />
          </ApolloProvider>
        </ServerRouter>
      </CodeSplitProvider>
    );

    renderToStringWithData(app).then(({ markup, initialState }) => {
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
        markup,
        // Nonce which allows us to safely declare inline scripts.
        nonce,
        // Running this gets all the helmet properties (e.g. headers/scripts/title etc)
        // that need to be included within our html.  It's based on the rendered app.
        // @see https://github.com/nfl/react-helmet
        helmet: Helmet.rewind(),
        // We provide our code split state so that it can be included within the
        // html, and then the client bundle can use this data to know which chunks/
        // modules need to be rehydrated prior to the application being rendered.
        codeSplitState: codeSplitContext.getState(),
        // Apollo and Redux initial state
        initialState,
      });

      // Get the render result from the server render context.
      const renderResult = reactRouterContext.getResult();

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
            : 200,
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
