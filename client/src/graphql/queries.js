import { gql } from '@apollo/client';

export const GET_HISTORY = gql`
  query GetHistory {
    history {
      id
      actionType
      inputContent
      outputResult
      metaData
      createdAt
    }
  }
`;

