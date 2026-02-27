import { gql } from '@apollo/client';

export const SAVE_POLYGON_MUTATION = gql`
  mutation SavePolygon($input: SavePolygonInput!) {
    savePolygon(input: $input) {
      id
      name
      areaHectares
      status
      analysisResults {
        plotCount
        totalForestArea
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
        }
      }
      createdAt
      geometry   
    }
  }
`;

export const GET_MY_POLYGONS = gql`
  query MyPolygons {
    myPolygons {
      id
      name
      areaHectares
      status
      geometry
      analysisResults {
        plotCount
        totalForestArea
      }
      createdAt
    }
  }
`;

export const DELETE_POLYGON_MUTATION = gql`
  mutation DeletePolygon($polygonId: String!) {
    deletePolygon(polygonId: $polygonId)
  }
`;