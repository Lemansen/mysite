import { Suspense } from 'react';
import PromoPage from '../../../../components/PromoPage';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <Suspense><ServerGuard><PromoPage /></ServerGuard></Suspense>; }
