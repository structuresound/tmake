// This is an example MongoDB pad

import { graphql, buildSchema } from 'graphql';
import { MongoClient, ObjectID, Db } from 'mongodb';

import { settings } from '../settings';

function fromMongo(item: any) {
  return {
    ...item,
    id: item._id.toString(),
  };
}

function toMongo(item: any) {
  return {
    ...item,
    _id: new ObjectID(item.id),
  };
}

// Construct a schema, using GraphQL schema language
export const schema = buildSchema(
  `
  type Post {
	  id: ID!
    title: String
    text: String
  }

  input PostInput {
    title: String!
    text: String
  }	

  input PostInputWithId {
    id: ID!
    title: String!
    text: String
  }

  type Query {
    posts: [Post]
    postById(id: ID!): Post
  }

  type Mutation {
    createPost(input: PostInput!): Post
    updatePost(input: PostInputWithId!): Post
    deletePost(id: ID!): Post
  }
`,
);

// The root provides a resolver function for each API endpoint
export const rootValue = {
  posts: async (args: any, context: any) => {
    return context.mongo.collection('Posts').find({}).map(fromMongo).toArray();
  },

  postById: async ({ id }: any, context: any) => {
    const result = await context.mongo
      .collection('Posts')
      .findOne({ _id: new ObjectID(id) });
    return fromMongo(result);
  },

  createPost: async ({ input: { title, text } }: any, context: any) => {
    const id = new ObjectID();
    const result = await context.mongo.collection('Posts').findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          title,
          text,
        },
      },
      {
        upsert: true,
        returnOriginal: false,
      },
    );
    return fromMongo(result.value);
  },

  updatePost: async ({ input: { id, title, text } }: any, context: any) => {
    const result = await context.mongo.collection('Posts').findOneAndUpdate(
      {
        _id: new ObjectID(id),
      },
      {
        $set: {
          title,
          text,
        },
      },
      {
        returnOriginal: false,
      },
    );
    return fromMongo(result.value);
  },

  deletePost: async ({ id }: any, context: any) => {
    const result = await context.mongo.collection('Posts').findOneAndDelete({
      _id: new ObjectID(id),
    });
    return fromMongo(result.value);
  },
};

let mongo: Db;

export async function context(headers: any, secrets: any) {
  if (!mongo) {
    mongo = await MongoClient.connect(settings.private.mongo.uri)
  }
  return {
    mongo,
  };
}

