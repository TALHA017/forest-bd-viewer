// graphql/polygons.ts
import { gql } from '@apollo/client';

export const SAVE_POLYGON_MUTATION = gql`
  mutation SavePolygon($input: SavePolygonInput!) {
    savePolygon(input: $input) {
      id
      name
      areaHectares
      status
      createdAt
      geometry
      analysisResults {
        plotCount
        totalForestArea
        coveragePercentage
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
          geometry
        }
      }
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
      createdAt
      geometry
      analysisResults {
        plotCount
        totalForestArea
        coveragePercentage
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
        }
      }
    }
  }
`;

export const DELETE_POLYGON_MUTATION = gql`
  mutation DeletePolygon($polygonId: String!) {
    deletePolygon(polygonId: $polygonId)
  }
`;