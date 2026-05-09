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

  type MessageResponse {
    message: String!
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

  type Note {
    id: ID!
    user: ID!
    text: String!
    sourceUrl: String
    createdAt: String
  }

  type Query {
    _health: String!
    me: User
    history: [HistoryItem!]!
    getNotes: [Note]
  }

  type Mutation {
    register(input: RegisterInput!): MessageResponse!
    verifyEmail(email: String!, code: String!): AuthPayload!
    resendVerificationCode(email: String!): MessageResponse!
    login(input: LoginInput!): AuthPayload!
    forgotPassword(email: String!): MessageResponse!
    resetPassword(email: String!, code: String!, newPassword: String!): MessageResponse!
    googleLogin(token: String!): AuthData
    translate(text: String!, sourceLang: String, targetLang: String!): HistoryItem!
    summarize(text: String!, language: String, length: String): HistoryItem!
    deleteHistoryItem(id: ID!): ID
    createNote(text: String!, sourceUrl: String): Note
    deleteNote(id: ID!): Boolean
  }
`;

