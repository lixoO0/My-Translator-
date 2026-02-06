import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation RegisterUser($username: String!, $email: String!, $password: String!) {
    register(input: { username: $username, email: $email, password: $password }) {
      token
      user {
        username
        email
      }
    }
  }
`;

export const LOGIN_USER = gql`
  mutation LoginUser($emailOrUsername: String!, $password: String!) {
    login(input: { emailOrUsername: $emailOrUsername, password: $password }) {
      token
      user {
        username
        email
      }
    }
  }
`;

export const GOOGLE_LOGIN = gql`
  mutation GoogleLogin($token: String!) {
    googleLogin(token: $token) {
      token
      user {
        username
        email
      }
    }
  }
`;

export const TRANSLATE_TEXT = gql`
  mutation TranslateText($text: String!, $sourceLang: String, $targetLang: String!) {
    translate(text: $text, sourceLang: $sourceLang, targetLang: $targetLang) {
      id
      outputResult
      createdAt
    }
  }
`;

export const SUMMARIZE_TEXT = gql`
  mutation SummarizeText($text: String!) {
    summarize(text: $text) {
      id
      outputResult
      createdAt
    }
  }
`;

