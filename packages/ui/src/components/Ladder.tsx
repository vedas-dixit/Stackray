export type LadderRow = { z: number | null; label: string; reason: string };

/**
 * The z-index ladder: the root context's direct children sorted by z.
 *
 * @example
 * <Ladder rows={[{ z: 20000, label: 'snackbar', reason: 'position: fixed' }]} />
 */
export function Ladder({ rows }: { rows: LadderRow[] }) {
  return (
    <table class="sr-table">
      <thead>
        <tr>
          <th scope="col">z</th>
          <th scope="col">Element</th>
          <th scope="col">Reason</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.label}-${row.z}`}>
            <td>{row.z === null ? 'auto' : row.z}</td>
            <td>{row.label}</td>
            <td class="sr-table__reason">{row.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
