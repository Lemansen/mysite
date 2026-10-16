export default function Skeleton({ n = 3 }: { n?: number }) {
  return <div className="wrap">{Array.from({ length: n }).map((_, i) => <div key={i} className="sk" style={{ height: i ? 84 : 120 }} />)}</div>;
}
