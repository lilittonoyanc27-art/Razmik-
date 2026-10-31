"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { funnyDistractors, practiceBank, type PracticeItem } from "./data";
import ManualPuzzleGame from "./ManualPuzzleGame";

type Photo = { id: number; src: string; label: string; width: number; height: number };
type Level = { key: string; label: string; pieces: number; rows: number; cols: number };
type QuizMode = "choice" | "free" | "dialogue" | "order" | "situation";
type PuzzleLayout = { board: Array<number | null>; tray: number[] };
type DragState = {
  id: number;
  origin: "board" | "tray";
  originIndex: number;
  pointerId: number;
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
};
type Piece = { id: number; row: number; col: number; x: number; y: number; solved: boolean; rotation: number; z: number };
type Geometry = { boardX: number; boardY: number; boardW: number; boardH: number; trayX: number; trayY: number; trayW: number; trayH: number; stageW: number; stageH: number; cellW: number; cellH: number; pad: number };

const photos: Photo[] = [
  { id: 1, src: "/photos/foto-1.png", label: "Foto 1", width: 800, height: 506 },
  { id: 2, src: "/photos/foto-2.png", label: "Foto 2", width: 494, height: 619 },
  { id: 3, src: "/photos/foto-3.png", label: "Foto 3", width: 738, height: 414 },
];

const levels: Level[] = [
  { key: "easy", label: "Fácil", pieces: 9, rows: 3, cols: 3 },
  { key: "medium", label: "Medio", pieces: 16, rows: 4, cols: 4 },
  { key: "hard", label: "Difícil", pieces: 36, rows: 6, cols: 6 },
  { key: "expert", label: "Experto", pieces: 64, rows: 8, cols: 8 },
];

const modes: { id: QuizMode; icon: string; label: string }[] = [
  { id: "choice", icon: "✓", label: "Elegir respuesta" },
  { id: "free", icon: "✎", label: "Respuesta libre" },
  { id: "dialogue", icon: "☵", label: "Completa diálogo" },
  { id: "order", icon: "↔", label: "Ordena la frase" },
  { id: "situation", icon: "◎", label: "Situaciones reales" },
];

const STORAGE_KEY = "football-puzzle-espanol-v1";

function seededShuffle<T>(values: T[], seed: number) {
  const copy = [...values];
  let state = (seed || 1) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, " ").trim();
}

function createLayout(level: Level, savedSolved: number[], savedBoard: Array<number | null> | null, savedTray: number[] | null, seed: number): PuzzleLayout {
  const allIds = Array.from({ length: level.pieces }, (_, id) => id);
  const isValidId = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) < level.pieces;
  const board = Array.isArray(savedBoard) && savedBoard.length === level.pieces
    ? savedBoard.map((value) => isValidId(value) ? value : null)
    : null;
  const tray = Array.isArray(savedTray) ? savedTray.filter(isValidId) : null;
  if (board && tray) {
    const used = [...board.filter((value): value is number => value !== null), ...tray];
    if (used.length === level.pieces && new Set(used).size === level.pieces) return { board, tray };
  }
  const restored = new Set(savedSolved.filter(isValidId));
  const migratedBoard = allIds.map((id) => restored.has(id) ? id : null);
  const remaining = allIds.filter((id) => !restored.has(id));
  return { board: migratedBoard, tray: seededShuffle(remaining, seed) };
}

function createPieces(level: Level, savedSolved: number[], seed: number) {
  const restored = new Set(savedSolved);
  return seededShuffle(Array.from({ length: level.pieces }, (_, id) => id), seed).map((id) => ({
    id,
    row: Math.floor(id / level.cols),
    col: id % level.cols,
    x: 0,
    y: 0,
    solved: restored.has(id),
    rotation: 0,
    z: id + 1,
  }));
}

function Speaker({ text, small = false }: { text: string; small?: boolean }) {
  const speak = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 0.86;
    const spanishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;
    window.speechSynthesis.speak(utterance);
  };
  return <button className={`speaker ${small ? "speaker-small" : ""}`} onClick={speak} aria-label={`Escuchar: ${text}`} title="Escuchar en español">◖))</button>;
}

function LegacyPuzzleGame({
  photo,
  level,
  savedSolved,
  onPieceSolved,
  onComplete,
  onProgress,
  resetToken,
}: {
  photo: Photo;
  level: Level;
  savedSolved: number[];
  onPieceSolved: () => void;
  onComplete: () => void;
  onProgress: (solved: number[]) => void;
  resetToken: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const geometryRef = useRef<Geometry | null>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const zRef = useRef(50);
  const firstLayout = useRef(true);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [pieces, setPieces] = useState<Piece[]>(() => createPieces(level, savedSolved, photo.id * 1000 + resetToken * 97 + level.pieces));
  const [activeId, setActiveId] = useState<number | null>(null);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const board = boardRef.current;
    const tray = trayRef.current;
    if (!stage || !board || !tray) return;
    const sr = stage.getBoundingClientRect();
    const br = board.getBoundingClientRect();
    const tr = tray.getBoundingClientRect();
    if (!br.width || !br.height || !tr.width) return;
    const cellW = br.width / level.cols;
    const cellH = br.height / level.rows;
    const pad = Math.max(4, Math.min(cellW, cellH) * 0.18);
    const trayCols = Math.max(1, Math.floor((tr.width - pad * 2) / cellW));
    const trayRows = Math.ceil(level.pieces / trayCols);
    const trayNeeded = trayRows * cellH + pad * 2 + 28;
    const boardBottom = br.bottom - sr.top + 12;
    const trayBottom = tr.top - sr.top + trayNeeded;
    const stageH = Math.max(boardBottom, trayBottom);
    const next: Geometry = {
      boardX: br.left - sr.left,
      boardY: br.top - sr.top,
      boardW: br.width,
      boardH: br.height,
      trayX: tr.left - sr.left,
      trayY: tr.top - sr.top,
      trayW: tr.width,
      trayH: trayNeeded,
      stageW: sr.width,
      stageH,
      cellW,
      cellH,
      pad,
    };
    const previous = geometryRef.current;
    geometryRef.current = next;
    setGeometry(next);
    setPieces((current) => {
      if (!current.length) return current;
      const cols = Math.max(1, Math.floor((next.trayW - next.pad * 2) / next.cellW));
      return current.map((piece, index) => {
        const targetX = next.boardX + piece.col * next.cellW - next.pad;
        const targetY = next.boardY + piece.row * next.cellH - next.pad;
        if (piece.solved) return { ...piece, x: targetX, y: targetY, rotation: 0 };
        if (firstLayout.current || !previous) {
          const spot = index;
          const jitterX = (Math.random() - 0.5) * Math.min(9, next.cellW * 0.12);
          const jitterY = (Math.random() - 0.5) * Math.min(7, next.cellH * 0.12);
          return {
            ...piece,
            x: next.trayX + next.pad + (spot % cols) * next.cellW + jitterX,
            y: next.trayY + 24 + Math.floor(spot / cols) * next.cellH + jitterY,
          };
        }
        return {
          ...piece,
          x: piece.x * (next.stageW / previous.stageW),
          y: piece.y * (next.stageH / previous.stageH),
        };
      });
    });
    firstLayout.current = false;
  }, [level.cols, level.pieces, level.rows]);

  useEffect(() => {
    const timer = window.setTimeout(measure, 40);
    const observer = new ResizeObserver(measure);
    if (stageRef.current) observer.observe(stageRef.current);
    if (boardRef.current) observer.observe(boardRef.current);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [measure, photo.id, level.key, resetToken]);

  useEffect(() => {
    if (!geometry) return;
    const image = new Image();
    image.src = photo.src;
    image.onload = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pieces.forEach((piece) => {
        const canvas = canvases.current.get(piece.id);
        if (!canvas) return;
        const { cellW: w, cellH: h, pad: p } = geometry;
        canvas.width = Math.ceil((w + p * 2) * dpr);
        canvas.height = Math.ceil((h + p * 2) * dpr);
        canvas.style.width = `${w + p * 2}px`;
        canvas.style.height = `${h + p * 2}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w + p * 2, h + p * 2);
        const right = piece.col === level.cols - 1 ? 0 : (piece.row * level.cols + piece.col) % 2 ? 1 : -1;
        const left = piece.col === 0 ? 0 : -((piece.row * level.cols + piece.col - 1) % 2 ? 1 : -1);
        const bottom = piece.row === level.rows - 1 ? 0 : (piece.row + piece.col) % 2 ? 1 : -1;
        const top = piece.row === 0 ? 0 : -((piece.row - 1 + piece.col) % 2 ? 1 : -1);
        const knob = Math.min(w, h) * 0.22;
        const start = p;
        ctx.beginPath();
        ctx.moveTo(start, start);
        // top edge
        ctx.lineTo(start + w * 0.36, start);
        if (top) ctx.bezierCurveTo(start + w * 0.34, start - top * knob, start + w * 0.66, start - top * knob, start + w * 0.64, start);
        ctx.lineTo(start + w, start);
        // right edge
        ctx.lineTo(start + w, start + h * 0.36);
        if (right) ctx.bezierCurveTo(start + w + right * knob, start + h * 0.34, start + w + right * knob, start + h * 0.66, start + w, start + h * 0.64);
        ctx.lineTo(start + w, start + h);
        // bottom edge
        ctx.lineTo(start + w * 0.64, start + h);
        if (bottom) ctx.bezierCurveTo(start + w * 0.66, start + h + bottom * knob, start + w * 0.34, start + h + bottom * knob, start + w * 0.36, start + h);
        ctx.lineTo(start, start + h);
        // left edge
        ctx.lineTo(start, start + h * 0.64);
        if (left) ctx.bezierCurveTo(start - left * knob, start + h * 0.66, start - left * knob, start + h * 0.34, start, start + h * 0.36);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(image, p - piece.col * w, p - piece.row * h, geometry.boardW, geometry.boardH);
        const shade = ctx.createLinearGradient(0, 0, w, h);
        shade.addColorStop(0, "rgba(255,255,255,.12)");
        shade.addColorStop(0.5, "rgba(255,255,255,0)");
        shade.addColorStop(1, "rgba(0,0,0,.12)");
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w + p * 2, h + p * 2);
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,.78)";
        ctx.lineWidth = Math.max(1, 1.1 / dpr);
        ctx.stroke();
      });
    };
  }, [geometry, level.cols, level.rows, photo.src, pieces.length]);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>, piece: Piece) => {
    if (piece.solved || !stageRef.current) return;
    const sr = stageRef.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: piece.id, dx: event.clientX - sr.left - piece.x, dy: event.clientY - sr.top - piece.y };
    zRef.current += 1;
    setActiveId(piece.id);
    setPieces((current) => current.map((item) => item.id === piece.id ? { ...item, z: zRef.current, rotation: 0 } : item));
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    const g = geometryRef.current;
    if (!drag || !stage || !g) return;
    const sr = stage.getBoundingClientRect();
    const width = g.cellW + g.pad * 2;
    const height = g.cellH + g.pad * 2;
    const x = Math.max(-g.pad, Math.min(g.stageW - width + g.pad, event.clientX - sr.left - drag.dx));
    const y = Math.max(-g.pad, Math.min(g.stageH - height + g.pad, event.clientY - sr.top - drag.dy));
    setPieces((current) => current.map((piece) => piece.id === drag.id ? { ...piece, x, y } : piece));
  };

  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const g = geometryRef.current;
    if (!drag || !g) return;
    dragRef.current = null;
    setActiveId(null);
    let didSolve = false;
    let completed = false;
    let solvedIds: number[] = [];
    setPieces((current) => {
      const next = current.map((piece) => {
        if (piece.id !== drag.id) return piece;
        const targetX = g.boardX + piece.col * g.cellW - g.pad;
        const targetY = g.boardY + piece.row * g.cellH - g.pad;
        const distance = Math.hypot(piece.x - targetX, piece.y - targetY);
        const threshold = Math.max(10, Math.min(g.cellW, g.cellH) * 0.24);
        if (distance <= threshold) {
          didSolve = !piece.solved;
          return { ...piece, x: targetX, y: targetY, solved: true, rotation: 0, z: 2 };
        }
        return piece;
      });
      solvedIds = next.filter((piece) => piece.solved).map((piece) => piece.id);
      completed = solvedIds.length === next.length;
      return next;
    });
    window.setTimeout(() => {
      if (didSolve) onPieceSolved();
      onProgress(solvedIds);
      if (completed) onComplete();
    }, 0);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released */ }
  };

  const solvedCount = pieces.filter((piece) => piece.solved).length;
  return (
    <div className="puzzle-shell">
      <div className="puzzle-status-row">
        <div><span className="status-kicker">TABLERO</span><strong>Arma la jugada</strong></div>
        <div className="piece-counter"><span>◫</span><strong>{solvedCount}/{level.pieces}</strong><small>piezas</small></div>
      </div>
      <div
        ref={stageRef}
        className="puzzle-stage"
        style={{ minHeight: geometry ? geometry.stageH : undefined }}
        aria-label={`Puzzle de ${level.pieces} piezas. Arrastra cada pieza manualmente.`}
      >
        <div
          ref={boardRef}
          className="puzzle-board"
          style={{ aspectRatio: `${photo.width}/${photo.height}` }}
        >
          <div className="field-line center-line" />
          <div className="field-line center-circle" />
          <div className="field-line penalty left" />
          <div className="field-line penalty right" />
          <div className="board-instruction"><span>ARRASTRA AQUÍ</span><small>Sin imagen de ayuda</small></div>
        </div>
        <div ref={trayRef} className="piece-tray" style={{ minHeight: geometry ? geometry.trayH : 260 }}>
          <div className="tray-label"><span>PIEZAS MEZCLADAS</span><small>Muévelas libremente</small></div>
        </div>
        {geometry && pieces.map((piece) => (
          <canvas
            key={piece.id}
            ref={(node) => { if (node) canvases.current.set(piece.id, node); else canvases.current.delete(piece.id); }}
            className={`puzzle-piece ${piece.solved ? "is-solved" : ""} ${activeId === piece.id ? "is-dragging" : ""}`}
            style={{ transform: `translate3d(${piece.x}px, ${piece.y}px, 0) rotate(${piece.rotation}deg)`, zIndex: piece.z }}
            onPointerDown={(event) => pointerDown(event, piece)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            role="button"
            aria-label={`Pieza ${piece.id + 1}${piece.solved ? ", colocada" : ", sin colocar"}`}
          />
        ))}
      </div>
    </div>
  );
}

function LanguagePractice({ onCorrect, spanishScore }: { onCorrect: () => void; spanishScore: number }) {
  const [mode, setMode] = useState<QuizMode>("choice");
  const [index, setIndex] = useState(0);
  const [translation, setTranslation] = useState(false);
  const [answerTranslation, setAnswerTranslation] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [freeText, setFreeText] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [optionTranslation, setOptionTranslation] = useState<string | null>(null);
  const item: PracticeItem = practiceBank[index % practiceBank.length];

  const options = useMemo(() => {
    const wrongs = seededShuffle(funnyDistractors, index * 37 + 11).slice(0, 3);
    return seededShuffle([item.answer, ...wrongs], index * 53 + 29);
  }, [index, item.answer]);
  const wordTokens = useMemo(() => seededShuffle(item.answer.replace(/[.!¡¿?]/g, "").split(" "), index * 71 + 43), [index, item.answer]);

  const resetQuestion = () => {
    setTranslation(false);
    setAnswerTranslation(false);
    setResult(null);
    setFreeText("");
    setSelectedWords([]);
    setOptionTranslation(null);
  };

  const judge = (isCorrect: boolean) => {
    if (result) return;
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) onCorrect();
  };

  const submitFree = () => {
    const text = normalize(freeText);
    const good = item.keywords.some((keyword) => text.includes(normalize(keyword))) || (text.length > 16 && /futbol|equipo|partido|gol|pase|jugar|entren/.test(text));
    judge(good);
  };

  const submitOrder = () => {
    judge(normalize(selectedWords.join(" ")) === normalize(item.answer));
  };

  const next = () => {
    resetQuestion();
    setIndex((current) => (current + 1) % practiceBank.length);
  };

  const changeMode = (nextMode: QuizMode) => {
    resetQuestion();
    setMode(nextMode);
  };

  const prompt = mode === "dialogue"
    ? `Periodista: ${item.question} · Tú: …`
    : mode === "situation"
      ? `Estás hablando después de un partido. ${item.question}`
      : item.question;

  return (
    <section className="practice-section" id="practica">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><i /> ENTRENAMIENTO DE ESPAÑOL</span>
          <h2>Habla como un <em>campeón</em></h2>
          <p>60 situaciones reales de fútbol para escuchar, responder y aprender.</p>
        </div>
        <div className="language-score"><span>XP ESPAÑOL</span><strong>+{spanishScore}</strong></div>
      </div>
      <div className="mode-tabs" role="tablist" aria-label="Modos de práctica">
        {modes.map((entry) => (
          <button key={entry.id} className={mode === entry.id ? "active" : ""} onClick={() => changeMode(entry.id)} role="tab" aria-selected={mode === entry.id}>
            <b>{entry.icon}</b><span>{entry.label}</span>
          </button>
        ))}
      </div>
      <div className="practice-card">
        <div className="quiz-progress"><span>PREGUNTA {index + 1} / {practiceBank.length}</span><div><i style={{ width: `${((index + 1) / practiceBank.length) * 100}%` }} /></div><strong>{modes.find((entry) => entry.id === mode)?.label}</strong></div>
        <div className="question-block">
          <button className="question-text" onClick={() => setTranslation((value) => !value)} aria-expanded={translation}>
            <span>{mode === "dialogue" ? "“" : "¿"}</span>{prompt}<small>TOCA PARA TRADUCIR</small>
          </button>
          <Speaker text={prompt} />
          {translation && <div className="translation-popover"><b>HY</b>{item.questionHy}</div>}
        </div>

        {(mode === "choice" || mode === "dialogue" || mode === "situation") && (
          <div className="answer-grid">
            {options.map((option, optionIndex) => {
              const isRight = option === item.answer;
              const state = result ? (isRight ? "right" : "muted") : "";
              return <div key={option} className={`answer-option ${state}`}>
                <button className="answer-choice" onClick={() => judge(isRight)} disabled={!!result}><span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b></button>
                <button className="translate-answer" onClick={() => setOptionTranslation(optionTranslation === option ? null : option)} aria-label={`Traducir ${option} al armenio`}>HY</button>
                <Speaker text={option} small />
                {optionTranslation === option && <p>{isRight ? item.answerHy : "Սա կատակային կամ իրավիճակին չհամապատասխանող պատասխան է։"}</p>}
              </div>;
            })}
          </div>
        )}

        {mode === "free" && (
          <div className="free-answer">
            <label htmlFor="free-response">Tu respuesta en español</label>
            <textarea id="free-response" value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder="Escribe una respuesta corta…" disabled={!!result} />
            <button className="primary-action" onClick={submitFree} disabled={!freeText.trim() || !!result}>Comprobar respuesta <span>→</span></button>
          </div>
        )}

        {mode === "order" && (
          <div className="order-zone">
            <div className="sentence-line">{selectedWords.length ? selectedWords.map((word, idx) => <button key={`${word}-${idx}`} onClick={() => setSelectedWords((words) => words.filter((_, i) => i !== idx))}>{word}</button>) : <span>Toca las palabras en el orden correcto</span>}</div>
            <div className="word-bank">{wordTokens.map((word, idx) => {
              const used = selectedWords.filter((chosen) => chosen === word).length >= wordTokens.slice(0, idx + 1).filter((token) => token === word).length;
              return <button key={`${word}-${idx}`} disabled={used || !!result} onClick={() => setSelectedWords((words) => [...words, word])}>{word}</button>;
            })}</div>
            <button className="primary-action" onClick={submitOrder} disabled={selectedWords.length !== wordTokens.length || !!result}>Comprobar orden <span>→</span></button>
          </div>
        )}

        {result && (
          <div className={`feedback ${result}`}>
            <div className="feedback-icon">{result === "correct" ? "✓" : "!"}</div>
            <div><strong>{result === "correct" ? "¡Excelente respuesta!" : "Casi. Prueba esta respuesta:"}</strong><button onClick={() => setAnswerTranslation((value) => !value)}>{item.answer} <small>HY</small></button>{answerTranslation && <p>{item.answerHy}</p>}<em>{result === "correct" ? "Շատ լավ։ Պատասխանը բնական է և համապատասխանում է իրավիճակին։" : "Ուշադրություն դարձրու հիմնական ֆուտբոլային բառերին և բայի ձևին։"}</em></div>
            <button className="next-button" onClick={next}>Siguiente →</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [photoId, setPhotoId] = useState(1);
  const [levelKey, setLevelKey] = useState("easy");
  const [elapsed, setElapsed] = useState(0);
  const [puzzleScore, setPuzzleScore] = useState(0);
  const [spanishScore, setSpanishScore] = useState(0);
  const [solvedIds, setSolvedIds] = useState<number[]>([]);
  const [boardLayout, setBoardLayout] = useState<Array<number | null> | null>(null);
  const [trayLayout, setTrayLayout] = useState<number[] | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const photo = photos.find((entry) => entry.id === photoId) ?? photos[0];
  const level = levels.find((entry) => entry.key === levelKey) ?? levels[0];

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const saveProgress = useCallback((nextBoard = boardLayout, nextTray = trayLayout) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ photoId, levelKey, elapsed, puzzleScore, spanishScore, solvedIds, boardLayout: nextBoard, trayLayout: nextTray }));
  }, [boardLayout, elapsed, levelKey, photoId, puzzleScore, solvedIds, spanishScore, trayLayout]);

  useEffect(() => {
    const timer = window.setInterval(() => saveProgress(), 5000);
    return () => window.clearInterval(timer);
  }, [saveProgress]);

  const startNew = (nextPhoto = photoId, nextLevel = levelKey) => {
    setPhotoId(nextPhoto);
    setLevelKey(nextLevel);
    setElapsed(0);
    setPuzzleScore(0);
    setSolvedIds([]);
    setBoardLayout(null);
    setTrayLayout(null);
    setIsComplete(false);
    setResetToken((value) => value + 1);
  };

  const continueGame = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (!saved) return;
      setPhotoId(saved.photoId ?? 1);
      setLevelKey(saved.levelKey ?? "easy");
      setElapsed(saved.elapsed ?? 0);
      setPuzzleScore(saved.puzzleScore ?? 0);
      setSpanishScore(saved.spanishScore ?? 0);
      setSolvedIds(saved.solvedIds ?? []);
      setBoardLayout(Array.isArray(saved.boardLayout) ? saved.boardLayout : null);
      setTrayLayout(Array.isArray(saved.trayLayout) ? saved.trayLayout : null);
      setResetToken((value) => value + 1);
    } catch { /* ignore invalid local save */ }
  };

  const randomPhoto = () => startNew(photos[Math.floor(Math.random() * photos.length)].id, levelKey);
  const totalScore = puzzleScore + spanishScore;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Football Puzzle inicio"><span className="brand-ball">◆</span><div><strong>FOOTBALL</strong><em>PUZZLE</em></div><small>APRENDE ESPAÑOL</small></a>
        <nav><a href="#juego">JUEGO</a><a href="#practica">ESPAÑOL</a><a href="#como">CÓMO JUGAR</a></nav>
        <div className="score-pill"><span>★</span><div><small>PUNTOS</small><strong>{totalScore.toLocaleString("es-ES")}</strong></div></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><i /> FÚTBOL · PUZZLE · ESPAÑOL</span>
          <h1>Arma la<br /><em>jugada.</em><br />Habla español.</h1>
          <p>Construye cada momento pieza a pieza y entrena el español que se habla dentro y fuera del campo.</p>
          <a href="#juego" className="hero-cta">EMPEZAR EL PARTIDO <span>→</span></a>
          <div className="hero-facts"><div><strong>64</strong><span>PIEZAS MÁX.</span></div><div><strong>60</strong><span>PREGUNTAS</span></div><div><strong>5</strong><span>MODOS</span></div></div>
        </div>
        <div className="hero-photo">
          <div className="hero-frame"><img src={photo.src} alt="Futbolista durante un partido" /><span className="frame-corner tl" /><span className="frame-corner br" /></div>
          <div className="floating-card"><span>PARTIDO EN CURSO</span><strong>90:00</strong><small>◉ NIVEL CAMPEÓN</small></div>
          <div className="hero-number">7</div>
        </div>
      </section>

      <section className="game-section" id="juego">
        <div className="game-toolbar">
          <div className="toolbar-group photo-picker"><span>ELIGE LA FOTO</span><div>{photos.map((entry) => <button key={entry.id} className={photoId === entry.id ? "active" : ""} onClick={() => startNew(entry.id, levelKey)}><img src={entry.src} alt="" /><b>{entry.id}</b></button>)}<button className="random-button" onClick={randomPhoto}><b>↻</b><small>ALEATORIO</small></button></div></div>
          <div className="toolbar-group level-picker"><span>DIFICULTAD</span><div>{levels.map((entry) => <button key={entry.key} className={levelKey === entry.key ? "active" : ""} onClick={() => startNew(photoId, entry.key)}><b>{entry.label}</b><small>{entry.pieces} piezas</small></button>)}</div></div>
          <div className="match-metrics"><div><span>TIEMPO</span><strong>{formatTime(elapsed)}</strong></div><div><span>PUNTOS PUZZLE</span><strong>{puzzleScore}</strong></div></div>
        </div>

        <ManualPuzzleGame
          key={`${photo.id}-${level.key}-${resetToken}`}
          photo={photo}
          level={level}
          savedSolved={solvedIds}
          savedBoard={boardLayout}
          savedTray={trayLayout}
          resetToken={resetToken}
          onPiecesScored={(count) => setPuzzleScore((score) => score + count * Math.round(900 / level.pieces))}
          onLayoutChange={(board, tray) => {
            setBoardLayout(board);
            setTrayLayout(tray);
            setSolvedIds(board.flatMap((id, slot) => id === slot ? [slot] : []));
            saveProgress(board, tray);
          }}
          onComplete={() => setIsComplete(true)}
        />

        <div className="game-actions">
          <button className="new-game" onClick={() => startNew()}><span>＋</span>Nueva partida</button>
          <button onClick={continueGame}><span>▶</span>Continuar</button>
          <button onClick={() => startNew()}><span>↺</span>Reiniciar</button>
          <button onClick={randomPhoto}><span>▣</span>Cambiar foto</button>
          <button onClick={() => startNew(photoId, levels[(levels.findIndex((item) => item.key === levelKey) + 1) % levels.length].key)}><span>◆</span>Cambiar nivel</button>
        </div>
      </section>

      <LanguagePractice spanishScore={spanishScore} onCorrect={() => setSpanishScore((score) => score + 150)} />

      <section className="how-section" id="como">
        <span className="eyebrow"><i /> CÓMO JUGAR</span>
        <h2>Tu camino al <em>título</em></h2>
        <div className="how-grid"><article><b>01</b><span>▣</span><h3>Elige tu reto</h3><p>Selecciona una foto y entre 9 y 64 piezas.</p></article><article><b>02</b><span>✥</span><h3>Arma a mano</h3><p>Coloca cualquier pieza en cualquier casilla y cámbialas de sitio.</p></article><article><b>03</b><span>◖))</span><h3>Escucha y habla</h3><p>Practica frases reales con voz y traducción armenia.</p></article><article><b>04</b><span>★</span><h3>Gana experiencia</h3><p>Suma puntos por cada pieza y respuesta correcta.</p></article></div>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-ball">◆</span><div><strong>FOOTBALL</strong><em>PUZZLE</em></div></a><p>Entrena tu mente. Mejora tu juego. Habla español.</p><span>Hecho para futuros campeones.</span></footer>

      {isComplete && <div className="victory-overlay" role="dialog" aria-modal="true" aria-label="Puzzle completado"><div className="confetti" /><div className="victory-card"><span className="trophy">★</span><small>FINAL DEL PARTIDO</small><h2>¡Has completado<br />el puzzle!</h2><p>¡Eres campeón del fútbol y del español!</p><div><b>{formatTime(elapsed)}<small>TIEMPO</small></b><b>{totalScore}<small>PUNTOS</small></b></div><button onClick={() => startNew()}>JUGAR DE NUEVO →</button><button className="close-victory" onClick={() => setIsComplete(false)}>Cerrar</button></div></div>}
    </main>
  );
}
