import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

export const AXIOS_INSTANCE = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器
AXIOS_INSTANCE.interceptors.request.use(
  // 请求发送前执行
  (config) => {
    // 在此添加请求前的自定义逻辑
    return config
  },
  // 请求拦截器内部抛出异常时执行
  (error) => {
    console.error('[HTTP Request Error]', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
AXIOS_INSTANCE.interceptors.response.use(
  // 收到成功响应（HTTP 状态码 2xx）时执行
  (response) => {
    // 在此添加正常收到响应后的处理逻辑
    return response
  },
  // 收到错误响应或请求失败时执行
  (error) => {
    console.error('[HTTP Error]', error)
    return Promise.reject(error)
  },
)

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
  }).then(({ data }: AxiosResponse<T>) => data)

  return promise
}
