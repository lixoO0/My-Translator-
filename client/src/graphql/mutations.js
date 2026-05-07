import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation RegisterUser($username: String!, $email: String!, $password: String!) {
    register(input: { username: $username, email: $email, password: $password }) {
      message
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

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($email: String!, $code: String!) {
    verifyEmail(email: $email, code: $code) {
      token
      user {
        username
        email
      }
    }
  }
`;

export const RESEND_VERIFICATION_CODE = gql`
  mutation ResendVerificationCode($email: String!) {
    resendVerificationCode(email: $email) {
      message
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
  mutation SummarizeText($text: String!, $language: String, $length: String) {
    summarize(text: $text, language: $language, length: $length) {
      id
      outputResult
      createdAt
    }
  }
`;

export const DELETE_HISTORY_ITEM = gql`
  mutation DeleteHistoryItem($id: ID!) {
    deleteHistoryItem(id: $id)
  }
`;

