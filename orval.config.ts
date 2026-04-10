import { defineConfig } from 'orval'

export default defineConfig({
  backend: {
    input: {
      target: 'http://localhost:8080/v1/api-docs',
    },
    output: {
      mode: 'tags',
      target: './src/api/generated/endpoints/index.ts',
      schemas: './src/api/generated/models',
      operationSchemas: './src/api/generated/models/operations',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/api/mutator/custom-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          useSetQueryData: true,
          useGetQueryData: true,
          useInvalidate: true,
          // 只有你的 OpenAPI 真有游标/分页参数时再打开
          // 待探索
          // useInfinite: true,
          // useInfiniteQueryParam: 'nextId',
        },
      },
    },
  },
})
