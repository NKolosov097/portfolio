/**
 * Calculates the number of full years between a birth date and a reference
 * date, accounting for whether the birthday has already occurred this year.
 *
 * @param birthDate - Date of birth.
 * @param now - Reference date to measure against (defaults to the current date).
 * @returns Full years of age, or `null` when the birth date is invalid or lies in the future.
 */
export const getAge = (birthDate: Date, now: Date = new Date()): number | null => {
  const birthTime = birthDate.getTime()

  if (Number.isNaN(birthTime) || birthTime > now.getTime()) {
    return null
  }

  let age = now.getFullYear() - birthDate.getFullYear()

  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())

  if (!hasHadBirthdayThisYear) {
    age -= 1
  }

  return age
}
