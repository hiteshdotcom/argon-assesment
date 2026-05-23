import { Dropzone } from "./components/Dropzone";
import { ImagePanel } from "./components/ImagePanel";
import { StatusChip } from "./components/StatusChip";
import { useImageUpload } from "./hooks/useImageUpload";
import styles from "./App.module.css";

export function App() {
  const { pending, accepted, rejected, addFiles, remove } = useImageUpload();

  // In-flight items: not yet terminal.
  const inflight = pending.filter(
    (p) => p.status === "uploading" || p.status === "processing" || p.status === "validating",
  );
  const errored = pending.filter((p) => p.status === "error");

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <h1 className={styles.brand}>Argon · Image Validation</h1>
        <span className={styles.tagline}>
          Six-rule pipeline · format, dimensions, blur, similarity, face count, face size
        </span>
      </header>

      <main className={styles.main}>
        <Dropzone onFiles={addFiles} />

        {(inflight.length > 0 || errored.length > 0) && (
          <section className={styles.inflight}>
            <h2 className={styles.sectionTitle}>In flight</h2>
            <ul className={styles.inflightList}>
              {[...inflight, ...errored].map((p) => (
                <li key={p.localId} className={styles.inflightCard}>
                  <img src={p.previewUrl} alt={p.file.name} className={styles.inflightThumb} />
                  <div className={styles.inflightMeta}>
                    <div className={styles.inflightTitle}>{p.file.name}</div>
                    <StatusChip status={p.status} />
                    {p.error && <div className={styles.errorText}>{p.error}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.grid}>
          <ImagePanel title="Accepted" rows={accepted} onDelete={remove} />
          <ImagePanel title="Rejected" rows={rejected} showReasons onDelete={remove} />
        </div>
      </main>
    </div>
  );
}
