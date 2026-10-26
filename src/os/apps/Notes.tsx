import { useRuntime } from '../../engine/runtime';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

/** Sticky notes found on the workstation. */
export default function Notes() {
  const notes = useRuntime((state) => state.runtime?.config.world.notes) ?? EMPTY_LIST;
  return (
    <div className="notes">
      {notes.map((note, index) => (
        <article key={note.id} className={`sticky ${note.color ?? 'yellow'}`} style={{ rotate: `${(index % 3) - 1}deg` }}>
          <h4>{note.title}</h4>
          <p className="ltr">{note.body}</p>
        </article>
      ))}
    </div>
  );
}
