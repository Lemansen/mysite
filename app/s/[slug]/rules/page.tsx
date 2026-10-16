import Section from '../../../../components/Section';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <ServerGuard><Section k="rules" /></ServerGuard>; }
