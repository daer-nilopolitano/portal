"use client";

import { useState } from "react";
import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function QuizBlock({ block }: { block: BlockOf<"quiz"> }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const total = block.questions.length;
  const answered = Object.keys(answers).length;
  const score = block.questions.reduce((sum, q, i) => (answers[i] === q.answer ? sum + 1 : sum), 0);
  const title = block.title ?? "Teste o que você aprendeu";

  return (
    <section className="c-quiz" aria-label={title}>
      <p className="c-label">Quiz</p>
      <h2 className="c-block-title">{title}</h2>

      {block.questions.map((question, qi) => {
        const chosen = answers[qi];
        const done = chosen !== undefined;
        return (
          <div key={qi} className="c-quiz__q">
            <p className="c-quiz__prompt">
              <span className="c-quiz__n">{qi + 1}.</span> <Inline text={question.question} />
            </p>
            <ul className="c-quiz__options">
              {question.options.map((option, oi) => {
                const state = !done ? "idle" : oi === question.answer ? "correct" : oi === chosen ? "wrong" : "idle";
                return (
                  <li key={oi}>
                    <button
                      type="button"
                      className={`c-quiz__opt c-quiz__opt--${state}`}
                      disabled={done}
                      onClick={() => setAnswers((current) => ({ ...current, [qi]: oi }))}
                    >
                      <span className="c-quiz__key" aria-hidden="true">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>
                        <Inline text={option} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div aria-live="polite">
              {done && (
                <p className={`c-quiz__feedback ${chosen === question.answer ? "is-correct" : "is-wrong"}`}>
                  <strong>{chosen === question.answer ? "Correto. " : "Não foi dessa vez. "}</strong>
                  {question.explanation && <Inline text={question.explanation} />}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {answered === total && total > 0 && (
        <div className="c-quiz__result" aria-live="polite">
          <p>
            Você acertou <strong>{score}</strong> de <strong>{total}</strong>.
          </p>
          <button type="button" className="c-quiz__reset" onClick={() => setAnswers({})}>
            Refazer o quiz
          </button>
        </div>
      )}
    </section>
  );
}
