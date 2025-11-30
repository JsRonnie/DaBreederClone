import React from "react";
import Modal from "./Modal";
import "./ScoringInfoModal.css";

export default function ScoringInfoModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-3xl">
      <div className="scoring-modal" role="document">
        <header className="scoring-modal__header">
          <div>
            <p className="scoring-modal__eyebrow">How Matching Works</p>
            <h2>Compatibility Score Breakdown</h2>
          </div>
          <button className="scoring-modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>

        <section className="scoring-modal__hero">
          <div>
            <p className="hero-kicker">Step 1 · Safety Gate</p>
            <h3>We screen for safe pairings first.</h3>
            <p>
              Only dogs with opposite sexes, similar size (within one category), and less than 10 kg
              difference move on to scoring.
            </p>
            <div className="hero-pills">
              <span>Opposite Sexes</span>
              <span>Size Gap &lt;= 1</span>
              <span>Weight Gap &lt; 10 kg</span>
            </div>
          </div>
        </section>

        <section className="scoring-modal__grid">
          <article className="score-card">
            <div className="score-card__badge">20 pts max</div>
            <h3>Breed Compatibility</h3>
            <ul>
              <li>Exact same breed earns the full 20 pts.</li>
              <li>Same AKC group earns 10 pts.</li>
              <li>
                Related lineage groups (toy + sporting + non-sporting, herding + working, etc.) earn
                15 pts.
              </li>
            </ul>
          </article>
          <article className="score-card">
            <div className="score-card__badge">42 pts max</div>
            <h3>Physical Traits</h3>
            <ul>
              <li>Gender pairing adds 15 pts when the safety gate is passed.</li>
              <li>Perfect size match adds 15 pts, one-step difference adds 8 pts.</li>
              <li>Weight adds up to 10 pts (minus 0.8 for every kg difference).</li>
              <li>Matching coat adds 5 pts; matching color adds 2 pts.</li>
            </ul>
          </article>
          <article className="score-card">
            <div className="score-card__badge">18 pts max</div>
            <h3>Age & Temperament</h3>
            <ul>
              <li>Age points = 10 - (1.5 × years apart), bottoming out at zero.</li>
              <li>Temperament adds +4 for matching activity, +2 sociability, +2 trainability.</li>
            </ul>
          </article>
        </section>

        <section className="scoring-modal__deductions">
          <h3>Deductions</h3>
          <div className="deduction-cards">
            <article>
              <p className="deduction-value">-5 pts</p>
              <p>Size is one category off.</p>
            </article>
            <article>
              <p className="deduction-value">-5 pts</p>
              <p>Weight differs between 5 kg and 9.9 kg.</p>
            </article>
          </div>
          <p className="scoring-modal__note">
            Bigger gaps are treated as deal breakers, so the match never appears on this list.
          </p>
        </section>
      </div>
    </Modal>
  );
}
