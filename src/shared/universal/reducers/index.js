/* @flow */

import posts, * as FromPosts from './posts';
import type { State as PostsState } from './posts';

// -----------------------------------------------------------------------------
// EXPORTED REDUCER STATE TYPE

export type State = {
  posts: PostsState,
};

// -----------------------------------------------------------------------------
// REDUCER

const reducers = {
  posts,
};

// -----------------------------------------------------------------------------
// EXPORTED SELECTORS

export function getPostById(state: State, id: number) {
  return FromPosts.getById(state.posts, id);
}

// -----------------------------------------------------------------------------
// REDUCER EXPORT

export default reducers;
