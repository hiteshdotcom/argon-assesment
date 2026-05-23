import { Icon } from "./Icon";
import { RULE_DEFS, deriveRuleStatuses } from "../lib/rules";
import type { ImageRow } from "../api";

interface Props {
  processingImage: ImageRow;
}

export function ProcessingBanner({ processingImage }: Props) {
  const rules = deriveRuleStatuses(processingImage);
  const byId = new Map(rules.map((r) => [r.id, r] as const));

  return (
    <div className="proc-banner fade-in">
      <div className="proc-banner-icon">
        <Icon name="cpu" size={18} />
      </div>
      <div className="proc-banner-body">
        <div className="proc-banner-title">
          <span className="live-dot" />
          Hang tight — we're checking your photo
        </div>
        <p className="proc-banner-sub">
          Six rules run in parallel — only photos that pass every check are accepted.
          We'll show what failed if anything does.
        </p>

        <div className="pipeline">
          {RULE_DEFS.map((rd) => {
            const r = byId.get(rd.id) ?? { id: rd.id, status: "pending" as const };
            return (
              <div key={rd.id} className={`pipeline-step is-${r.status}`}>
                <div className="pipeline-step-head">
                  <div className="ps-icon">
                    <Icon name={rd.icon} size={14} stroke={2} />
                  </div>
                  <div className="ps-mark">
                    {r.status === "pass" && <Icon name="check" size={10} stroke={4} />}
                    {r.status === "fail" && <Icon name="x" size={10} stroke={4} />}
                    {r.status === "checking" && <span className="spinner spin" />}
                    {r.status === "skipped" && <Icon name="minus" size={10} stroke={4} />}
                  </div>
                </div>
                <div className="ps-name">{rd.name}</div>
                <div className="ps-desc">
                  {r.status === "checking"
                    ? "Running…"
                    : r.status === "pending"
                      ? rd.desc
                      : r.status === "pass"
                        ? "Passed"
                        : r.status === "fail"
                          ? "Failed"
                          : "Skipped"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
