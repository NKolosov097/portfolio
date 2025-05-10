import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import { ELanguage } from '@/constants/header.constants'

export const useGetLanguage = () => {
  const searchParams = useSearchParams()
  const lang = useMemo(() => searchParams.get('lang') || 'en', [searchParams])

  return lang as ELanguage
}
