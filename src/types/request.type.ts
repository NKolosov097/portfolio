export interface IResponse<T = null> {
  status: boolean
  message: string

  data?: T
}
