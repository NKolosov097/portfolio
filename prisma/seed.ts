import { PrismaClient, Prisma } from '../src/generated/prisma'

const prisma = new PrismaClient()

const initialUserData: Prisma.UserCreateInput[] = [
  {
    name: 'Nikita',
    company: 'Google',
    profession: 'Software Engineer',
    email: 'NKolosov097@gmail.com',
    messages: {
      create: [
        {
          content: 'Hi! This is my first message. Have a nice day, guys 😉',
        },
      ],
    },
  },
]

export async function main() {
  for (const data of initialUserData) {
    await prisma.user.create({ data })
  }
}

main()
