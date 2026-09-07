export function StatusBadge({ hold }: { hold: boolean }) {
  return <span className={hold ? 'badge pending' : 'badge complete'}>{hold ? 'Холд' : 'Завершено'}</span>
}
