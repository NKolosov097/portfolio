export interface IProjectTag {
  /** Stable unique tag identifier, used as the React key and QA selector. */
  id: string
  /** Human-readable technology label shown on the chip (e.g. "React Native"). */
  title: string
}

export interface IProject {
  /** Stable unique project identifier; also serves as QA selector and i18n sub-namespace. */
  id: string
  /** Absolute URL of the project preview image (GitHub OpenGraph card). */
  img: string
  /** External URL the card links to: live demo when available, otherwise the GitHub repository. */
  href: string
  /** i18n key resolving to the project's short description shown on the card. */
  descriptionKey: string
  /** Technology chips displayed on the project card. */
  tags: IProjectTag[]
}
