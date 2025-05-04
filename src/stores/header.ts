import { ETabID } from '@/constants/header.constants'
import { createStore } from 'zustand/vanilla'

export interface IHeaderState {
  currentTab: ETabID
  isClicked: boolean
}

export type IHeaderActions = {
  setCurrentTab: (_tab: ETabID) => void
  setIsClicked: (_isClicked: boolean) => void
}

export type THeaderStore = IHeaderState & IHeaderActions

export const initHeaderStore = (): IHeaderState => {
  return { currentTab: ETabID.home, isClicked: false }
}

export const initialHeaderState: IHeaderState = {
  currentTab: ETabID.home,
  isClicked: false,
}

export const createHeaderStore = (initState: IHeaderState = initialHeaderState) => {
  return createStore<THeaderStore>()((set) => ({
    ...initState,
    setCurrentTab: (newTab: ETabID) => set((state) => ({ ...state, currentTab: newTab })),
    setIsClicked: (isClicked: boolean) => set((state) => ({ ...state, isClicked })),
  }))
}
