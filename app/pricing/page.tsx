import Pricing from '@/components/Pricing';
import { billingReady } from '@/lib/stripe';
export default function Page(){const enabled=billingReady();return <><h1 className="text-3xl font-semibold mb-2">Plans & credits</h1><p className="text-stone-600 mb-6">{enabled?'Subscribe for included credits, then top up anytime if you need more. Payments are handled securely by Stripe Checkout.':'These are our planned prices. Checkout is not available yet; no payment will be collected.'}</p><Pricing paymentsEnabled={enabled}/></>}
