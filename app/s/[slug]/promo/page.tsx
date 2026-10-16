import PromoPage from '../../../../components/PromoPage';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <ServerGuard><PromoPage /></ServerGuard>; }
