import { Suspense } from 'react';
import Section from '../../../../components/Section';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <Suspense><ServerGuard><Section k="commands" /></ServerGuard></Suspense>; }
