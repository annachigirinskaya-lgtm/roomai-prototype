import Pricing from '@/components/Pricing';
import { billingReady } from '@/lib/stripe';
export default function Page(){const enabled=billingReady();return <><h1 className="text-3xl font-semibold mb-2">RoomAI plans</h1><p className="text-stone-600 mb-6">{enabled?'Choose a plan and pay securely with Stripe Checkout.':'These are our planned prices. Checkout is not available yet; no payment will be collected.'}</p><Pricing paymentsEnabled={enabled}/></>}
