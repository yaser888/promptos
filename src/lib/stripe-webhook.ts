import { prisma } from "./prisma";

export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.clerkId;
      const plan = session.metadata?.plan || "PRO";

      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: plan as any,
            status: "ACTIVE",
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          },
          create: {
            userId,
            plan: plan as any,
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const status = subscription.status;

      const dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (dbSubscription) {
        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: mapStripeStatus(status),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      const dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (dbSubscription) {
        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
          },
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: new Date(
                invoice.lines?.data?.[0]?.period?.end * 1000 || Date.now()
              ),
            },
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const failedInvoice = event.data.object;
      const failedSubId = failedInvoice.subscription;

      if (failedSubId) {
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: failedSubId },
        });

        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { status: "PAST_DUE" },
          });
        }
      }
      break;
    }
  }
}

function mapStripeStatus(status: string) {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "trialing":
      return "TRIALING";
    case "incomplete":
    case "incomplete_expired":
      return "EXPIRED";
    default:
      return "EXPIRED";
  }
}
