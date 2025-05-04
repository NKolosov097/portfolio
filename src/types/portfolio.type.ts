export interface IProjectTag {
  id: string
  title: string
}

export interface IProject {
  id: string
  img: string
  href: string
  tags: IProjectTag[]
}
