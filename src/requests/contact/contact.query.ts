import axios from 'axios'
import { z } from 'zod'

import { BACKEND_API } from '@/constants/env.constant'

import { getContactSchema } from '@/schemas/Contact/Contact.schema'
import { IResponse } from '@/types/requests/request.type'

export const sendMessage = async (message: z.infer<ReturnType<typeof getContactSchema>>) =>
  await axios.post<IResponse>(`${BACKEND_API}/contact/send_message`, message)
