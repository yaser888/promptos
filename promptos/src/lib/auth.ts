import { auth } from '@clerk/nextjs/server'
import { prisma } from './db'

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  })

  return user
}

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user || user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  return userId
}

export async function checkSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    return { plan: 'FREE', status: 'ACTIVE', isActive: true }
  }

  const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIALING'

  return {
    plan: subscription.plan,
    status: subscription.status,
    isActive,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
  }
}
