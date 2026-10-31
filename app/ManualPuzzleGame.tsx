"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Photo = { id: number; src: string; label: string; width: number; height: number };
type Level = { key: string; label: string; pieces: number; rows: number; cols: number };
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
  return {
    board: allIds.map((id) => restored.has(id) ? id : null),
    tray: seededShuffle(allIds.filter((id) => !restored.has(id)), seed),
  };
}

function PieceCanvas({
  id,
  photo,
  level,
  cellW,
  cellH,
  pad,
  className = "",
  testId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  id: number;
  photo: Photo;
  level: Level;
  cellW: number;
  cellH: number;
  pad: number;
  className?: string;
  testId?: string;
  onPointerDown?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLCanvasElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const row = Math.floor(id / level.cols);
  const col = id % level.cols;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cellW || !cellH) return;
    const image = new Image();
    image.src = photo.src;
    image.onload = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = cellW + pad * 2;
      const height = cellH + pad * 2;
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const right = col === level.cols - 1 ? 0 : (row * level.cols + col) % 2 ? 1 : -1;
      const left = col === 0 ? 0 : -((row * level.cols + col - 1) % 2 ? 1 : -1);
      const bottom = row === level.rows - 1 ? 0 : (row + col) % 2 ? 1 : -1;
      const top = row === 0 ? 0 : -((row - 1 + col) % 2 ? 1 : -1);
      const knob = Math.min(cellW, cellH) * 0.22;
      const start = pad;
      ctx.beginPath();
      ctx.moveTo(start, start);
      ctx.lineTo(start + cellW * 0.36, start);
      if (top) ctx.bezierCurveTo(start + cellW * 0.34, start - top * knob, start + cellW * 0.66, start - top * knob, start + cellW * 0.64, start);
      ctx.lineTo(start + cellW, start);
      ctx.lineTo(start + cellW, start + cellH * 0.36);
      if (right) ctx.bezierCurveTo(start + cellW + right * knob, start + cellH * 0.34, start + cellW + right * knob, start + cellH * 0.66, start + cellW, start + cellH * 0.64);
      ctx.lineTo(start + cellW, start + cellH);
      ctx.lineTo(start + cellW * 0.64, start + cellH);
      if (bottom) ctx.bezierCurveTo(start + cellW * 0.66, start + cellH + bottom * knob, start + cellW * 0.34, start + cellH + bottom * knob, start + cellW * 0.36, start + cellH);
      ctx.lineTo(start, start + cellH);
      ctx.lineTo(start, start + cellH * 0.64);
      if (left) ctx.bezierCurveTo(start - left * knob, start + cellH * 0.66, start - left * knob, start + cellH * 0.34, start, start + cellH * 0.36);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.drawImage(image, pad - col * cellW, pad - row * cellH, cellW * level.cols, cellH * level.rows);
      const shade = ctx.createLinearGradient(0, 0, cellW, cellH);
      shade.addColorStop(0, "rgba(255,255,255,.14)");
      shade.addColorStop(0.52, "rgba(255,255,255,0)");
      shade.addColorStop(1, "rgba(0,0,0,.16)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.76)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
  }, [cellH, cellW, col, id, level.cols, level.rows, pad, photo.src, row]);

  return (
    <canvas
      ref={canvasRef}
      className={`puzzle-piece ${className}`}
      data-testid={testId}
      data-piece-id={id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="button"
      tabIndex={0}
      aria-label={`Pieza ${id + 1}. Arrastra para colocarla o cambiarla de sitio.`}
    />
  );
}

export default function ManualPuzzleGame({
  photo,
  level,
  savedSolved,
  savedBoard,
  savedTray,
  onPiecesScored,
  onComplete,
  onLayoutChange,
  resetToken,
}: {
  photo: Photo;
  level: Level;
  savedSolved: number[];
  savedBoard: Array<number | null> | null;
  savedTray: number[] | null;
  onPiecesScored: (count: number) => void;
  onComplete: () => void;
  onLayoutChange: (board: Array<number | null>, tray: number[]) => void;
  resetToken: number;
}) {
  const initialLayout = useMemo(
    () => createLayout(level, savedSolved, savedBoard, savedTray, photo.id * 1000 + resetToken * 97 + level.pieces),
    [level, photo.id, resetToken, savedBoard, savedSolved, savedTray],
  );
  const [layout, setLayout] = useState<PuzzleLayout>(initialLayout);
  const layoutRef = useRef(initialLayout);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [trayWidth, setTrayWidth] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const creditedRef = useRef(new Set(savedSolved));
  const completedRef = useRef(false);

  const measure = useCallback(() => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    const trayRect = trayRef.current?.getBoundingClientRect();
    if (boardRect?.width && boardRect.height) setBoardSize({ width: boardRect.width, height: boardRect.height });
    if (trayRect?.width) setTrayWidth(trayRect.width);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (boardRef.current) observer.observe(boardRef.current);
    if (trayRef.current) observer.observe(trayRef.current);
    const frame = window.requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const cellW = boardSize.width ? boardSize.width / level.cols : 0;
  const cellH = boardSize.height ? boardSize.height / level.rows : 0;
  const pad = Math.max(4, Math.min(cellW || 24, cellH || 24) * 0.16);
  const pieceW = cellW + pad * 2;
  const pieceH = cellH + pad * 2;
  const trayCols = Math.max(1, Math.floor((trayWidth - 22 + 8) / Math.max(1, pieceW + 8)));
  const correctCount = layout.board.reduce<number>((total, id, slot) => total + (id === slot ? 1 : 0), 0);
  const isComplete = correctCount === level.pieces;

  const commit = useCallback((next: PuzzleLayout) => {
    layoutRef.current = next;
    setLayout(next);
    onLayoutChange(next.board, next.tray);
    const newlyCorrect = next.board.filter((id, slot) => id === slot && !creditedRef.current.has(slot));
    newlyCorrect.forEach((id) => { if (id !== null) creditedRef.current.add(id); });
    if (newlyCorrect.length) onPiecesScored(newlyCorrect.length);
    const completed = next.board.every((id, slot) => id === slot);
    if (completed && !completedRef.current) {
      completedRef.current = true;
      window.setTimeout(onComplete, 180);
    } else if (!completed) {
      completedRef.current = false;
    }
  }, [onComplete, onLayoutChange, onPiecesScored]);

  const startDrag = (event: React.PointerEvent<HTMLCanvasElement>, id: number, origin: "board" | "tray", originIndex: number) => {
    if (!cellW || !cellH) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const next: DragState = {
      id,
      origin,
      originIndex,
      pointerId: event.pointerId,
      left: rect.left,
      top: rect.top,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    dragRef.current = next;
    setDrag(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = { ...active, left: event.clientX - active.offsetX, top: event.clientY - active.offsetY };
    dragRef.current = next;
    setDrag(next);
  };

  const cancelDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  };

  const finishDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const hit = document.elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element instanceof HTMLElement ? element.closest<HTMLElement>("[data-board-slot], [data-tray-index], [data-piece-tray]") : null)
      .find(Boolean) ?? null;
    const current = layoutRef.current;
    let next: PuzzleLayout | null = null;

    if (hit?.dataset.boardSlot !== undefined) {
      const targetSlot = Number(hit.dataset.boardSlot);
      if (Number.isInteger(targetSlot) && targetSlot >= 0 && targetSlot < level.pieces) {
        const board = [...current.board];
        const tray = [...current.tray];
        const displaced = board[targetSlot];
        if (active.origin === "board") {
          board[active.originIndex] = displaced;
        } else {
          const sourceIndex = tray.indexOf(active.id);
          if (sourceIndex >= 0) tray.splice(sourceIndex, 1);
          if (displaced !== null) tray.splice(Math.min(active.originIndex, tray.length), 0, displaced);
        }
        board[targetSlot] = active.id;
        next = { board, tray };
      }
    } else if (hit?.dataset.trayIndex !== undefined || hit?.dataset.pieceTray !== undefined) {
      const board = [...current.board];
      const tray = [...current.tray];
      let targetIndex = hit.dataset.trayIndex === undefined ? tray.length : Number(hit.dataset.trayIndex);
      targetIndex = Number.isInteger(targetIndex) ? Math.max(0, Math.min(targetIndex, tray.length)) : tray.length;
      if (active.origin === "board") {
        board[active.originIndex] = null;
        tray.splice(targetIndex, 0, active.id);
      } else {
        const sourceIndex = tray.indexOf(active.id);
        if (sourceIndex >= 0) {
          tray.splice(sourceIndex, 1);
          if (sourceIndex < targetIndex) targetIndex -= 1;
          tray.splice(Math.max(0, Math.min(targetIndex, tray.length)), 0, active.id);
        }
      }
      next = { board, tray };
    }

    dragRef.current = null;
    setDrag(null);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (next) commit(next);
  };

  return (
    <div className="puzzle-shell" data-photo-id={photo.id} data-level={level.key}>
      <div className="puzzle-status-row">
        <div><span className="status-kicker">TABLERO</span><strong>Arma la jugada</strong></div>
        <div className="piece-counter"><span>◫</span><strong>{correctCount}/{level.pieces}</strong><small>correctas</small></div>
      </div>
      <div className="puzzle-stage" aria-label={`Puzzle de ${level.pieces} piezas. Arrastra todas las piezas manualmente.`}>
        <div className="board-column">
          <div
            ref={boardRef}
            className="puzzle-board"
            style={{ aspectRatio: `${photo.width}/${photo.height}`, maxWidth: photo.height > photo.width ? 620 : 1000 }}
          >
            <div className="board-grid" style={{ gridTemplateColumns: `repeat(${level.cols}, 1fr)`, gridTemplateRows: `repeat(${level.rows}, 1fr)` }}>
              {layout.board.map((id, slot) => (
                <div
                  key={slot}
                  className="board-cell"
                  data-board-slot={slot}
                  data-testid={`board-slot-${slot}`}
                  data-occupant={id ?? ""}
                >
                  {id !== null && cellW > 0 && (
                    <div className="board-piece-wrap" style={{ left: -pad, top: -pad }} data-location="board" data-slot={slot}>
                      <PieceCanvas
                        id={id}
                        photo={photo}
                        level={level}
                        cellW={cellW}
                        cellH={cellH}
                        pad={pad}
                        testId={`piece-${id}`}
                        className={drag?.id === id ? "is-source-dragging" : ""}
                        onPointerDown={(event) => startDrag(event, id, "board", slot)}
                        onPointerMove={moveDrag}
                        onPointerUp={finishDrag}
                        onPointerCancel={cancelDrag}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isComplete && <div className="completed-photo"><img src={photo.src} alt="Puzzle completado" /></div>}
          </div>
          <p className="board-note">Cada casilla acepta cualquier pieza · Arrastra otra encima para intercambiarlas</p>
        </div>

        <aside className="tray-panel">
          <div className="tray-label"><span>PIEZAS MEZCLADAS</span><small>Desplázate si hace falta</small></div>
          <div
            ref={trayRef}
            className="piece-tray"
            data-piece-tray="true"
            style={{ gridTemplateColumns: `repeat(${trayCols}, ${pieceW}px)`, gridAutoRows: `${pieceH}px` }}
          >
            {layout.tray.map((id, index) => (
              <div
                className="tray-piece-wrap"
                key={id}
                data-tray-index={index}
                data-location="tray"
                style={{ width: pieceW, height: pieceH }}
              >
                {cellW > 0 && (
                  <PieceCanvas
                    id={id}
                    photo={photo}
                    level={level}
                    cellW={cellW}
                    cellH={cellH}
                    pad={pad}
                    testId={`piece-${id}`}
                    className={drag?.id === id ? "is-source-dragging" : ""}
                    onPointerDown={(event) => startDrag(event, id, "tray", index)}
                    onPointerMove={moveDrag}
                    onPointerUp={finishDrag}
                    onPointerCancel={cancelDrag}
                  />
                )}
              </div>
            ))}
            {!layout.tray.length && <p className="empty-tray">Todas las piezas están en el campo.</p>}
          </div>
        </aside>
      </div>

      {drag && cellW > 0 && (
        <div className="drag-ghost" style={{ left: drag.left, top: drag.top, width: pieceW, height: pieceH }} aria-hidden="true">
          <PieceCanvas id={drag.id} photo={photo} level={level} cellW={cellW} cellH={cellH} pad={pad} className="is-drag-ghost" />
        </div>
      )}
    </div>
  );
}
