export const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type AuthData {
    token: String!
    user: User!
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    emailOrUsername: String!
    password: String!
  }

  scalar JSON

  type HistoryItem {
    id: ID!
    userId: ID!
    actionType: String!
    inputContent: String!
    outputResult: String!
    metaData: JSON
    createdAt: String!
  }

  type Query {
    _health: String!
    me: User
    history: [HistoryItem!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    googleLogin(token: String!): AuthData
    translate(text: String!, sourceLang: String, targetLang: String!): HistoryItem!
    summarize(text: String!): HistoryItem!
  }
`;

