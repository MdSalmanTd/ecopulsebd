"use client";

import { useRef, useState } from "react";
import { useReports } from "@/lib/app-state";
import { ISSUE_LABELS, LOCATIONS, STATUS_LABELS } from "@/lib/app-data";
import { useToast } from "./Toast";

const ISSUES = [
  { value: "illegal-dumping", paths: ["M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"] },
  { value: "blocked-drain", paths: ["M12 3.5s-5 5.7-5 10a5 5 0 0 0 10 0c0-4.3-5-10-5-10Z", "M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"] },
  { value: "tree-damage", paths: ["M12 21v-8m0 1-4-3m4 1 4-4M5 5l14 14m-8-7-2 2m4-6 2-2", "M12 3 9.5 7H12L10 11h4l-2-4h2.5L12 3Z"] },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

/** Shrinks a photo to a small JPEG data URL so it can be kept in browser storage. */
function shrinkImage(file, max = 360) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function formatWhen(iso) {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
  return `${d.toLocaleDateString("en-GB", { month: "short", day: "numeric" })} · ${time}`;
}

export default function ReportsBoard() {
  const { reports, loading, error: loadError, add, remove } = useReports();
  const toast = useToast();
  const formRef = useRef(null);
  const listRef = useRef(null);
  const [photo, setPhoto] = useState(null); // data URL
  const [photoError, setPhotoError] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [filter, setFilter] = useState("all");

  const resolved = reports.filter((r) => r.status === "resolved").length;
  const shown = reports.filter((r) =>
    filter === "all" ? true : filter === "resolved" ? r.status === "resolved" : r.status !== "resolved",
  );

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (!file) return setPhoto(null);
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      e.target.value = "";
      setPhoto(null);
      return setPhotoError("Please choose a JPG or PNG image.");
    }
    if (file.size > 10 * 1024 * 1024) {
      e.target.value = "";
      setPhoto(null);
      return setPhotoError("That image is larger than 10 MB.");
    }
    try {
      setPhoto(await shrinkImage(file));
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!photo) {
      setPhotoError("Please add a photo of the problem.");
      return;
    }
    setBusy(true);
    setSubmitError("");
    const fd = new FormData(e.currentTarget);
    // Upload the shrunk photo (not the original file) to keep requests small.
    fd.set("photo", await (await fetch(photo)).blob(), "photo.jpg");
    fd.set("shareToFeed", fd.get("shareToFeed") ? "true" : "false");
    let report;
    try {
      report = await add(fd);
    } catch (err) {
      setSubmitError(err.message);
      setBusy(false);
      return;
    }
    formRef.current.reset();
    setPhoto(null);
    setDesc("");
    setFilter("all");
    setBusy(false);
    toast(
      report.shared
        ? `Report ${report.id} submitted and shared on the feed.`
        : `Report ${report.id} submitted. You’ll earn XP once it’s verified.`,
    );
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section className="report-column" aria-labelledby="page-title">
        <header className="page-heading">
          <p className="eyebrow">Flag a problem</p>
          <h1 id="page-title">Submit a report</h1>
        </header>

        <form className="card report-form" id="report-form" ref={formRef} onSubmit={onSubmit} noValidate>
          <fieldset className="form-section">
            <legend>
              1. What did you see? <span className="required" aria-hidden="true">*</span>
            </legend>
            <div className="issue-options">
              {ISSUES.map((issue, i) => (
                <label className="issue-option" key={issue.value}>
                  <input type="radio" name="issue" value={issue.value} defaultChecked={i === 0} />
                  <span className="issue-option__content">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {issue.paths.map((d) => (
                        <path key={d} d={d} />
                      ))}
                    </svg>
                    <span>{ISSUE_LABELS[issue.value]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-section">
            <p className="field-label">
              2. Add a photo <span className="required" aria-hidden="true">*</span>
            </p>
            <label className={`upload-area${photo ? " has-photo" : ""}`} htmlFor="report-photo">
              <span className="upload-preview" aria-hidden="true">
                {photo ? (
                  <img src={photo} alt="" className="upload-preview__img" />
                ) : (
                  <svg viewBox="0 0 32 32">
                    <path d="M5 24.5 12.2 16a2 2 0 0 1 3.1-.1l3.1 3.5 2.1-2.4a2 2 0 0 1 3.1.1l4.4 5.3v2.1H5Z" />
                    <circle cx="11" cy="10" r="3" />
                  </svg>
                )}
              </span>
              <span className="upload-copy">
                <span className="upload-button">
                  <img className="ic" src="/icons/photo.svg" alt="" />
                  {photo ? "Change photo" : "Choose a photo"}
                </span>
                <span className="upload-hint">{photo ? "Photo added ✓" : "JPG or PNG image"}</span>
              </span>
              <input
                id="report-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png"
                onChange={onPhoto}
                aria-invalid={photoError ? true : undefined}
                aria-describedby={photoError ? "photo-error" : undefined}
              />
            </label>
            {photoError && (
              <p className="form-error" id="photo-error" role="alert">
                {photoError}
              </p>
            )}
            <a className="sample-link" href="/images/post-dumping.svg" target="_blank" rel="noopener">
              View an example photo
            </a>
            <p className="field-help">Please avoid including identifiable faces or private information.</p>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="report-location">
              3. Location <span className="required" aria-hidden="true">*</span>
            </label>
            <div className="select-wrap">
              <img className="ic" src="/icons/pin.svg" alt="" />
              <select id="report-location" name="location" required defaultValue="dhanmondi-road-12">
                {Object.entries(LOCATIONS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <p className="field-help">
              <img src="/icons/pin.svg" alt="" /> Your exact address is not shown publicly.
            </p>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="report-description">
              4. Description <span className="optional">(optional)</span>
            </label>
            <textarea
              id="report-description"
              name="description"
              rows={4}
              maxLength={500}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is happening and since when?"
            ></textarea>
            <div className="description-meta">
              <span>Helpful details help the local team follow up.</span>
              <span aria-live="polite">{desc.length} / 500</span>
            </div>
          </div>

          <label className="share-toggle">
            <input type="checkbox" name="shareToFeed" value="true" defaultChecked />
            <span>
              <strong>Share on the community feed</strong>
              <small>Neighbours can see your photo and the area, then verify the problem faster.</small>
            </span>
          </label>

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <button className="submit-button" type="submit" disabled={busy}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z" />
              <path d="M9.7 13.3 15 8" />
            </svg>
            {busy ? "Submitting…" : "Submit report"}
          </button>
          <p className="privacy-note">Your report will be shared with local community organizers for review.</p>
        </form>
      </section>

      <aside className="reports-column" id="my-reports" aria-labelledby="reports-title" ref={listRef}>
        <section className="card reports-card">
          <header className="reports-heading">
            <h2 id="reports-title">My reports</h2>
            <span className="reports-count">
              {reports.length} reports · {resolved} resolved
            </span>
          </header>

          <div className="seg" role="tablist" aria-label="Filter reports">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={filter === f.key ? "on" : undefined}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <ol className="report-list">
            {shown.map((r) => (
              <li className={`report-item${r.canWithdraw ? " is-new" : ""}`} key={r.id}>
                <figure className="report-visual">
                  <img className="report-thumb" src={r.image} alt={`Photo for report ${r.id}`} />
                  <figcaption>{r.image?.startsWith("/api/") ? "Your photo" : "Area preview"}</figcaption>
                </figure>
                <div className="report-item__body">
                  <div className="report-item__title">
                    <h3>
                      {r.id} · {ISSUE_LABELS[r.issue]}
                    </h3>
                    <span className={`status status--${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  </div>
                  <p>
                    <img src="/icons/pin.svg" alt="" />
                    {r.place}
                  </p>
                  {r.description && <p className="report-desc">“{r.description}”</p>}
                  <div className="report-meta">
                    <time dateTime={r.createdAt}>{formatWhen(r.createdAt)}</time>
                    <span>{r.note}</span>
                  </div>
                  <span className="report-detail">{r.detail}</span>
                  {r.canWithdraw && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={async () => {
                        try {
                          await remove(r.id);
                          toast(`Report ${r.id} withdrawn.`);
                        } catch (err) {
                          toast(err.message);
                        }
                      }}
                    >
                      Withdraw report
                    </button>
                  )}
                </div>
              </li>
            ))}
            {loading && <li className="report-empty">Loading your reports…</li>}
            {loadError && <li className="report-empty">Couldn’t load reports: {loadError.message}</li>}
            {!loading && !loadError && !shown.length && (
              <li className="report-empty">{filter === "all" ? "You haven’t reported anything yet." : `No ${filter} reports.`}</li>
            )}
          </ol>

          <div className="reports-note">
            <img src="/icons/leaf-green.svg" alt="" />
            <p>You earn Eco Score and Eco Coins when a report is verified and marked resolved.</p>
          </div>
        </section>
      </aside>
    </>
  );
}
