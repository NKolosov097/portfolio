import { createStore } from 'zustand/vanilla'

export interface IAsideState {
  isOpenDrawer: boolean
}

export type IAsideActions = {
  setIsOpenDrawer: (_isOpen: boolean) => void
}

export type TAsideStore = IAsideState & IAsideActions

export const initAsideStore = (): IAsideState => {
  return { isOpenDrawer: false }
}

export const initialAsideState: IAsideState = {
  isOpenDrawer: false,
}

export const createAsideStore = (initState: IAsideState = initialAsideState) => {
  return createStore<TAsideStore>()((set) => ({
    ...initState,
    setIsOpenDrawer: (isOpenDrawer: boolean) => set((state) => ({ ...state, isOpenDrawer })),
  }))
}
