import { makeExecutableSchema } from 'graphql-tools';

const typeDefs = [`
type Query {
  hello: String
}

schema {
  query: Query
}`];

const resolvers = {
  Query: {
    hello(root) {
      return 'world';
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

export default schema;
