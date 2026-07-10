/* @ds-bundle: {"format":4,"namespace":"TelegramitoDesignSystem_019df4","components":[],"sourceHashes":{"app/design-canvas.jsx":"862a6db59c7c","app/letters.jsx":"f339ff291fc7","app/mobile.jsx":"3a5282a95563","app/thread-data.jsx":"942b89413134"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TelegramitoDesignSystem_019df4 = window.TelegramitoDesignSystem_019df4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// app/design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
  // isolation:isolate contains artboard content's z-indexes so a
  // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
  // the .dc-menu popover that drops into the top of the card.
  '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}',
  // Per-artboard header: grip + label on the left, delete/expand on the
  // right. Single flex row; when the artboard's on-screen width is too
  // narrow for both the label yields (ellipsis, then hidden entirely below
  // ~4ch via the container query) and the buttons stay on the row.
  '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;', '  display:flex;align-items:center;container-type:inline-size}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}', '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;', '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
  // Below ~4ch of label room: hide the label entirely, and drop the grip to
  // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
  // until the card is moused.
  '@container (max-width: 110px){', '  .dc-labeltext{display:none}', '  .dc-grip{opacity:0}', '  [data-dc-slot]:hover .dc-grip{opacity:1}', '}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}', '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}', '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}', '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}', '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;', '  font:inherit;transition:background .12s,color .12s}', '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
  // Slot hosting an open menu floats above later siblings (which otherwise
  // paint on top — same z-index:auto, later DOM order) so the popup isn't
  // clipped by the next card.
  '[data-dc-slot]:has(.dc-menu){z-index:10}', '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;', '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}', '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;', '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;', '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}', '.dc-menu button:hover{background:rgba(0,0,0,.05)}', '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}', '.dc-menu .dc-danger{color:#c96442}', '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
  // Chrome (titles / labels / buttons) counter-scales against the viewport
  // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
  // DCViewport on every transform update and inherits to all descendants —
  // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
  // it the same way.
  //
  // The header uses transform:scale (out-of-flow, so layout impact doesn't
  // matter) with its world-space width set to card-width / inv-zoom so that
  // after counter-scaling its on-screen width exactly matches the card's —
  // that's what lets the container query + text-overflow behave against the
  // card's visible edge at every zoom level.
  //
  // The section head uses CSS zoom instead of transform so its layout box
  // grows with the counter-scale, pushing the card row down — otherwise the
  // constant-screen-size title would overflow into the (shrinking) world-
  // space gap and overlap the artboard headers at low zoom.
  '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));', '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}', '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    React.Children.forEach(sec.props.children, ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? persisted.hidden || [] : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);
  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({
        type: '__dc_zoom',
        scale
      }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    }, 200);
  }, [tfKey]);
  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    };
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = {
          x: s.x,
          y: s.y,
          scale: Math.min(maxScale, Math.max(minScale, s.scale))
        };
        apply();
      }
    } catch {}
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = e => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({
          type: '__dc_present'
        }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({
      type: '__dc_present'
    }, '*');
    lastPostedScale.current = undefined;
    apply();
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const sec = ctx && sid && ctx.section(sid) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map(a => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? sec.hidden || [] : [];
  const srcOrder = allIds.filter(k => !hidden.includes(k));
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-sectionhead",
    style: {
      paddingBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onDelete: () => ctx && ctx.patchSection(sid, x => ({
      hidden: [...(x.srcKey === srcKey ? x.hidden || [] : []), k],
      srcKey
    })),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try {
    await document.fonts.ready;
  } catch {}
  const toDataURL = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(url);
    fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [],
    pending = [],
    seen = new Set();
  const scrapeCss = href => {
    if (seen.has(href)) return;
    seen.add(href);
    pending.push(fetch(href).then(r => r.text()).then(css => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({
        css: m,
        base: href
      });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({
        css: r.cssText,
        base
      });else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try {
          walk(r.styleSheet.cssRules, ibase);
        } catch {
          scrapeCss(ibase);
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try {
      walk(ss.cssRules, base);
    } catch {
      if (ss.href) scrapeCss(ss.href);
    }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async rule => {
    let out = rule.css,
      m;
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    while (m = re.exec(rule.css)) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs;
      try {
        abs = new URL(m[2], rule.base).href;
      } catch {
        continue;
      }
      out = out.split(m[0]).join('url("' + (await toDataURL(abs)) + '")');
    }
    return out;
  }))).join('\n');
  const cloneStyled = src => {
    if (src.nodeType === 8 || src.nodeType === 1 && src.tagName === 'SCRIPT') return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src);
      let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try {
        const im = document.createElement('img');
        im.src = src.toDataURL();
        im.setAttribute('style', txt);
        return im;
      } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  const jobs = [];
  clone.querySelectorAll('img').forEach(el => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then(d => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach(el => {
    const bg = el.style.backgroundImage;
    if (!bg) return;
    let m;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    while (m = re.exec(bg)) {
      const tok = m[0],
        url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then(d => {
        el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")');
      }));
    }
  });
  await Promise.all(jobs);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' + (fontCss ? '<style>' + fontCss + '</style>' : '') + '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], {
      type: 'text/html'
    }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' + (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px;
  cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob(blob => save(blob, 'png'), 'image/png');
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus,
  onDelete
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) {
      setConfirming(false);
      return;
    }
    const off = e => {
      if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);
  const doExport = kind => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind).catch(e => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-header",
    style: {
      color: DC.label
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-btns"
  }, /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dc-kebab",
    title: "More",
    onClick: () => setMenuOpen(o => !o)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2.5",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "6",
    r: "1.1"
  }))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "dc-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('png')
  }, "Download PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('html')
  }, "Download HTML"), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("button", {
    className: "dc-danger",
    onClick: () => {
      if (confirming) {
        setMenuOpen(false);
        onDelete();
      } else setConfirming(true);
    }
  }, confirming ? 'Click again to delete' : 'Delete'))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))))), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[((secIdx + d * i) % n + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) {
        ctx.setFocus(`${ns}/${first}`);
        return;
      }
    }
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.filter(sid => sectionMeta[sid].slotIds.length).map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/design-canvas.jsx", error: String((e && e.message) || e) }); }

// app/letters.jsx
try { (() => {
// Letters v2 — newsprint refinement.
// Cooler gray paper, ink-black, single terracotta accent.
// No postmark. Inline DNA + calendar in the letter's header.
// Channels get frequencies (88.6); people-chats get names.
// Pulsing "in the post" indicator on chats where someone is actively writing.

const lettersS = {
  paper: '#dfdbd2',
  // newsprint warm gray
  paper2: '#d4cfc3',
  card: '#e9e4d8',
  ink: '#1c1815',
  // deep warm black
  ink2: '#3a322a',
  ink3: '#7a705f',
  ink4: '#a89e8b',
  rule: 'rgba(28,24,21,.16)',
  rule2: 'rgba(28,24,21,.08)',
  accent: '#b03e1b',
  // single warm accent · terracotta ink
  accent2: '#8b2f12',
  serif: "'Spectral', 'Iowan Old Style', Georgia, serif",
  sc: "'Manrope', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace"
};

// Mark which chats are channels (get frequency) vs people (get name only)
const KIND = {
  mama: 'person',
  soft: 'channel',
  telegram: 'channel',
  kate: 'person',
  dmts: 'channel',
  liza: 'person',
  mami: 'person',
  nastyab2: 'person',
  katya: 'person',
  natulik: 'person',
  papa: 'person',
  ludmila: 'person'
};
const CHANNEL_FREQ = {
  soft: '88.6',
  telegram: '101.3',
  dmts: '107.2'
};

// Pretend-active chats (typing / unsent letter en route)
const POSTING = new Set(['mama', 'kate']);
function LettersVariant() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      background: lettersS.paper,
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(28,24,21,.022) 0 1px, transparent 1px 3px),
        radial-gradient(900px 500px at 100% 0%, rgba(176,62,27,.04), transparent 70%)`,
      color: lettersS.ink,
      fontFamily: lettersS.serif,
      display: 'grid',
      gridTemplateColumns: '300px 1fr 320px',
      gridTemplateRows: '54px 1fr',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TopBand, null), /*#__PURE__*/React.createElement(CorrespondentsAside, null), /*#__PURE__*/React.createElement(LetterMain, null), /*#__PURE__*/React.createElement(TodaysMail, null), /*#__PURE__*/React.createElement("style", null, `
        @keyframes lt-post {
          0%,100% { transform: translateX(0); opacity: .85; }
          50%     { transform: translateX(3px); opacity: 1; }
        }
        @keyframes lt-pulse {
          0%,100% { opacity: .55; }
          50%     { opacity: 1; }
        }
      `));
}

/* ───────── Top band ───────── */
function TopBand() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: `1px solid ${lettersS.rule}`,
      background: lettersS.paper2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: lettersS.ink2,
      fontWeight: 700
    }
  }, "Telegramito"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 14,
      background: lettersS.rule
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 14,
      color: lettersS.ink2
    }
  }, "Friday, the fifteenth of May")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      fontFamily: lettersS.sc,
      fontSize: 11,
      color: lettersS.ink2,
      letterSpacing: '.04em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.accent,
      fontWeight: 700,
      borderBottom: `1.5px solid ${lettersS.accent}`,
      paddingBottom: 4
    }
  }, "Letters"), /*#__PURE__*/React.createElement("span", null, "Drafts"), /*#__PURE__*/React.createElement("span", null, "Returned"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.ink4
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Search"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 10px',
      border: `1px solid ${lettersS.ink}`,
      fontFamily: lettersS.sc,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase'
    }
  }, "Write \u2197")));
}

/* ───────── Left aside — Correspondents ───────── */
function CorrespondentsAside() {
  const people = CHATS.filter(c => KIND[c.id] === 'person').slice(0, 7);
  const channels = CHATS.filter(c => KIND[c.id] === 'channel');
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      borderRight: `1px solid ${lettersS.rule}`,
      padding: '20px 0',
      overflow: 'hidden',
      background: lettersS.paper
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Correspondents"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, people.map(c => /*#__PURE__*/React.createElement(PersonRow, {
    key: c.id,
    c: c
  }))), /*#__PURE__*/React.createElement(SectionTitle, {
    style: {
      marginTop: 18
    }
  }, "Channels & Bulletins"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, channels.map(c => /*#__PURE__*/React.createElement(ChannelRow, {
    key: c.id,
    c: c
  }))));
}
function SectionTitle({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 18px 10px',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 700
    }
  }, children));
}
function PersonRow({
  c
}) {
  const posting = POSTING.has(c.id);
  const active = c.current;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      columnGap: 10,
      alignItems: 'baseline',
      padding: '10px 18px 10px 22px',
      borderLeft: `2px solid ${active ? lettersS.accent : 'transparent'}`,
      background: active ? lettersS.card : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.serif,
      fontSize: 15,
      fontWeight: 500,
      color: lettersS.ink,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.name), c.pinned && /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.accent,
      fontSize: 10
    }
  }, "\u2726")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: posting ? lettersS.serif : lettersS.sc,
      fontSize: posting ? 12 : 11,
      fontStyle: posting ? 'italic' : 'normal',
      color: posting ? lettersS.accent : lettersS.ink3,
      letterSpacing: posting ? 0 : '.04em',
      marginTop: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, posting && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: '50%',
      background: lettersS.accent,
      animation: 'lt-pulse 1.4s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: '50%',
      background: lettersS.accent,
      animation: 'lt-pulse 1.4s ease-in-out .2s infinite',
      marginLeft: 2
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: '50%',
      background: lettersS.accent,
      animation: 'lt-pulse 1.4s ease-in-out .4s infinite',
      marginLeft: 2
    }
  })), posting ? 'in the post…' : c.tag)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      color: lettersS.ink3,
      letterSpacing: '.06em'
    }
  }, c.date), c.unread && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      marginTop: 3,
      background: lettersS.ink,
      color: lettersS.paper,
      padding: '0 6px',
      fontFamily: lettersS.sc,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.04em'
    }
  }, c.unread)));
}
function ChannelRow({
  c
}) {
  const freq = CHANNEL_FREQ[c.id] || '—';
  const posting = c.id === 'soft'; // bulletin currently transmitting
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '54px 1fr auto',
      columnGap: 12,
      alignItems: 'center',
      padding: '11px 18px 11px 18px',
      borderLeft: `2px solid ${c.current ? lettersS.accent : 'transparent'}`,
      background: c.current ? lettersS.card : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.mono,
      fontWeight: 700,
      fontSize: 15,
      color: c.current ? lettersS.accent : lettersS.ink2,
      letterSpacing: '-.02em',
      lineHeight: 1
    }
  }, freq, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: lettersS.mono,
      fontSize: 8,
      color: lettersS.ink3,
      fontWeight: 500,
      letterSpacing: '.18em',
      marginTop: 2
    }
  }, "FM \xB7 MHz")), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      color: posting ? lettersS.accent : lettersS.ink3,
      letterSpacing: '.04em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, posting && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: lettersS.accent,
      animation: 'lt-pulse 1.3s ease-in-out infinite',
      flex: 'none'
    }
  }), posting ? 'transmitting now' : c.tag)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      color: lettersS.ink3
    }
  }, c.date), c.unread && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      marginTop: 3,
      background: lettersS.accent,
      color: lettersS.paper,
      padding: '0 6px',
      fontFamily: lettersS.sc,
      fontSize: 10,
      fontWeight: 700
    }
  }, c.unread)));
}

/* ───────── Center — the letter ───────── */
function LetterMain() {
  return /*#__PURE__*/React.createElement("main", {
    style: {
      overflow: 'hidden',
      position: 'relative',
      padding: '28px 56px 0'
    }
  }, /*#__PURE__*/React.createElement(LetterHeader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: lettersS.ink,
      opacity: .85,
      margin: '18px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      position: 'relative',
      maxHeight: 580
    }
  }, /*#__PURE__*/React.createElement(DayMark, null, "April 24, afternoon"), MESSAGES.slice(0, 7).map(m => /*#__PURE__*/React.createElement(Passage, {
    key: m.id,
    m: m
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 80,
      background: `linear-gradient(180deg, transparent, ${lettersS.paper})`,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement(Compose, null));
}
function LetterHeader() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      columnGap: 28,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", null, "Bundle \u2116 24"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 1,
      background: lettersS.rule
    }
  }), /*#__PURE__*/React.createElement("span", null, "Test Drive"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 1,
      background: lettersS.rule
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.accent,
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: lettersS.accent,
      animation: 'lt-pulse 1.2s ease-in-out infinite'
    }
  }), "4 hands writing")), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '6px 0 4px',
      fontFamily: lettersS.serif,
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: '-.01em',
      color: lettersS.ink,
      lineHeight: 1.05
    }
  }, "Soft Start \xB7 2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 13,
      color: lettersS.ink3
    }
  }, "14 correspondents \xB7 99+ pages unread \xB7 opened by Irina K.")), /*#__PURE__*/React.createElement(Insights, null));
}

/* Inline thread DNA + calendar */
function Insights() {
  const max = Math.max(...DNA_DAYS.map(d => d.count));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1px auto',
      columnGap: 16,
      alignItems: 'stretch',
      padding: '10px 14px',
      background: lettersS.card,
      border: `1px solid ${lettersS.rule}`
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 9,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 700,
      marginBottom: 6
    }
  }, "Volume \xB7 14 days"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      height: 26
    }
  }, DNA_DAYS.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 5,
      height: `${d.count / max * 100}%`,
      minHeight: 2,
      background: d.peak ? lettersS.accent : lettersS.ink2,
      opacity: d.peak ? 1 : 0.6
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 11,
      color: lettersS.ink3
    }
  }, "peak ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.accent,
      fontWeight: 600,
      fontStyle: 'normal'
    }
  }, "99"), " \xB7 Apr 24")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: lettersS.rule
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 9,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 700,
      marginBottom: 6
    }
  }, "Jump by date"), /*#__PURE__*/React.createElement(MiniCalendar, null)));
}
function MiniCalendar() {
  // Show last 4 weeks ending on May 15 (Fri). Active days = those in DNA_DAYS.
  const activeDates = new Set(DNA_DAYS.map(d => d.d));
  const peakDate = (DNA_DAYS.find(d => d.peak) || {}).d;
  // Build a 4×7 grid ending May 15
  const cells = [];
  // Simple labeling: rows by week, days Apr 18 → May 15 = 28 days
  const start = new Date(2026, 3, 18); // Apr 18
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const key = `${months[d.getMonth()]} ${d.getDate()}`;
    cells.push({
      key,
      day: d.getDate(),
      active: activeDates.has(key),
      peak: key === peakDate
    });
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 16px)',
      gap: 3
    }
  }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: 'center',
      fontSize: 8,
      color: lettersS.ink4,
      letterSpacing: '.08em',
      fontWeight: 600
    }
  }, d)), cells.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 16,
      height: 16,
      display: 'grid',
      placeItems: 'center',
      fontFamily: lettersS.mono,
      fontSize: 9,
      fontWeight: c.active ? 600 : 400,
      color: c.peak ? lettersS.paper : c.active ? lettersS.ink : lettersS.ink4,
      background: c.peak ? lettersS.accent : c.active ? 'rgba(28,24,21,.08)' : 'transparent'
    }
  }, c.day))));
}
function DayMark({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '0 0 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: lettersS.rule2
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 13,
      color: lettersS.ink3
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: lettersS.rule2
    }
  }));
}
function Passage({
  m
}) {
  const p = PEOPLE[m.from];
  const reactions = m.reactions || [];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '120px 1fr 116px',
      columnGap: 22,
      padding: '10px 0',
      alignItems: 'flex-start',
      borderBottom: `1px solid ${lettersS.rule2}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      paddingTop: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 9,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 600
    }
  }, m.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontSize: 13,
      fontStyle: 'italic',
      color: m.mine ? lettersS.accent : lettersS.ink2,
      marginTop: 1
    }
  }, "\u2014 ", p.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontSize: 16,
      lineHeight: 1.55,
      color: lettersS.ink
    }
  }, m.kind === 'text' && /*#__PURE__*/React.createElement("span", {
    style: {
      textWrap: 'pretty'
    }
  }, m.text), m.kind === 'reaction-quote' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      borderLeft: `2px solid ${lettersS.rule}`,
      paddingLeft: 10,
      fontStyle: 'italic',
      color: lettersS.ink3,
      fontSize: 14,
      marginBottom: 4
    }
  }, (MESSAGES.find(x => x.id === m.quoteOf) || {}).text), m.text), m.kind === 'list' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      marginBottom: 4
    }
  }, m.title), m.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.ink3,
      fontFamily: lettersS.sc,
      fontSize: 13
    }
  }, "\u2014"), /*#__PURE__*/React.createElement("span", null, it)))), m.kind === 'voice' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '4px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: `1.5px solid ${lettersS.ink}`,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 0,
      height: 0,
      borderLeft: `8px solid ${lettersS.ink}`,
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      marginLeft: 2
    }
  })), /*#__PURE__*/React.createElement("svg", {
    width: "180",
    height: "26",
    viewBox: "0 0 180 26"
  }, m.waveform.map((h, i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: i * 8,
    y: 13 - h * 11,
    width: "3",
    height: Math.max(2, h * 22),
    fill: i < 8 ? lettersS.accent : lettersS.ink3
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 11,
      letterSpacing: '.06em',
      color: lettersS.ink3
    }
  }, m.duration))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 12,
      color: lettersS.ink3,
      paddingTop: 5
    }
  }, reactions.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, reactions.map((r, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontStyle: 'normal'
    }
  }, r.e), /*#__PURE__*/React.createElement("span", null, "\xD7", r.n)))), m.from === 'irina' && m.id === 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      borderLeft: `2px solid ${lettersS.accent}`,
      paddingLeft: 8,
      color: lettersS.ink2,
      display: 'block'
    }
  }, "noted, week 3 \u2713"), m.kind === 'voice' && /*#__PURE__*/React.createElement("span", {
    style: {
      color: lettersS.ink3,
      fontStyle: 'normal',
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.06em',
      textTransform: 'uppercase'
    }
  }, "read transcript \u203A")));
}
function Compose() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 56,
      right: 56,
      bottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      background: lettersS.paper2,
      border: `1px solid ${lettersS.ink}`,
      boxShadow: `4px 4px 0 ${lettersS.rule}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 14,
      color: lettersS.ink3
    }
  }, "Reply, in your own hand\u2026"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: lettersS.ink3
    }
  }, "Photo \xB7 Voice \xB7 File"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: lettersS.ink,
      color: lettersS.paper,
      padding: '8px 16px',
      fontFamily: lettersS.sc,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      cursor: 'pointer'
    }
  }, "Send \u2192"));
}

/* ───────── Right rail — today's mail ───────── */
function TodaysMail() {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      borderLeft: `1px solid ${lettersS.rule}`,
      padding: '22px 22px',
      overflow: 'hidden',
      background: lettersS.paper2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: lettersS.ink3,
      fontWeight: 700
    }
  }, "The day's mail"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 13,
      color: lettersS.ink2,
      margin: '4px 0 16px'
    }
  }, "What arrived while you were away."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 4,
      top: 6,
      bottom: 6,
      width: 1,
      background: lettersS.rule
    }
  }), TODAY.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      paddingBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -16,
      top: 5,
      width: 9,
      height: 9,
      background: i === 0 ? lettersS.accent : lettersS.paper,
      border: `1.5px solid ${i === 0 ? lettersS.accent : lettersS.ink3}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.14em',
      color: lettersS.ink3
    }
  }, it.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.serif,
      fontSize: 14,
      lineHeight: 1.35,
      color: lettersS.ink,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, it.who), " ", it.what), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      color: lettersS.ink3
    }
  }, it.chat)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      padding: '12px 0 0',
      borderTop: `1px dashed ${lettersS.rule}`,
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.sc,
      fontSize: 10,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: lettersS.ink3
    }
  }, "Quiet since 09:14"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: lettersS.serif,
      fontStyle: 'italic',
      fontSize: 12,
      color: lettersS.ink3
    }
  }, "5h 12m")));
}
Object.assign(window, {
  LettersVariant
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/letters.jsx", error: String((e && e.message) || e) }); }

// app/mobile.jsx
try { (() => {
// Telegramito Mobile — детский клиент Telegram, метафора «Письма».
// Светлая газетная бумага (Letters v2), без линеек-строчек: ровная тёплая
// бумага + едва заметная терракотовая дымка сверху.
// Все механики мапятся на реальные функции Telegram (MTProto) — см. подписи секции.

const MB_CSS = `
.mb-phone { width: 390px; height: 844px; box-sizing: border-box; position: relative;
  display: flex; flex-direction: column; overflow: hidden;
  background:
    radial-gradient(120% 42% at 50% -8%, rgba(176,62,27,.05), transparent 65%),
    #dfdbd2;
  color: #1c1815; font-family: 'Spectral', Georgia, serif;
  border: 1px solid rgba(28,24,21,.35); border-radius: 34px;
  box-shadow: 0 24px 60px rgba(28,24,21,.22); }
.mb-phone *, .mb-phone *::before, .mb-phone *::after { box-sizing: border-box; }
.mb-ui { font-family: 'Manrope', system-ui, sans-serif; }
.mb-mono { font-family: 'JetBrains Mono', monospace; }

.mb-status { height: 44px; flex: 0 0 auto; display: flex; align-items: flex-end;
  justify-content: space-between; padding: 0 26px 6px;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 700; color: #3a322a; }

/* ── компактная шапка 52px ── */
.mb-top { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; height: 52px;
  padding: 0 8px 0 18px; border-bottom: 1px solid rgba(28,24,21,.14);
  font-family: 'Manrope', sans-serif; }
.mb-word { font-size: 10px; font-weight: 800; letter-spacing: .24em; color: #1c1815; }
.mb-date { font-family: 'Spectral', serif; font-style: italic; font-size: 12.5px; color: #7a705f; margin-top: 1px; }
.mb-iconbtn { width: 44px; height: 44px; border-radius: 12px; border: none; background: transparent;
  color: #3a322a; display: inline-flex; align-items: center; justify-content: center;
  font-size: 19px; flex: 0 0 auto; cursor: pointer; }
.mb-iconbtn:hover { background: rgba(176,62,27,.08); }

.mb-body { flex: 1 1 auto; min-height: 0; position: relative; overflow: hidden;
  display: flex; flex-direction: column; }

/* ── нижняя навигация ── */
.mb-tabbar { flex: 0 0 auto; display: flex; align-items: stretch;
  border-top: 1px solid rgba(28,24,21,.18); background: #d4cfc3; padding-bottom: 16px; }
.mb-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 0 6px; font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: #7a705f;
  border: none; background: none; position: relative; cursor: pointer; min-height: 52px; }
.mb-tab.on { color: #b03e1b; }
.mb-tab.on::before { content: ""; position: absolute; top: -1px; left: 26%; right: 26%;
  height: 2px; background: #b03e1b; }
.mb-tab .g { font-size: 19px; line-height: 1; font-family: 'Spectral', serif; }
.mb-tab .bdg { position: absolute; top: 5px; right: calc(50% - 30px);
  font-size: 8.5px; font-weight: 800; background: #b03e1b; color: #f5f0e6; padding: 1px 5px; }

.mb-fab { position: absolute; right: 18px; bottom: 18px; z-index: 20; height: 50px;
  padding: 0 20px; display: inline-flex; align-items: center; gap: 9px;
  background: #1c1815; color: #f5f0e6; border: none; border-radius: 2px;
  font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .16em;
  box-shadow: 4px 4px 0 rgba(28,24,21,.22); cursor: pointer; }

/* ── список писем ── */
.mb-seg { display: flex; gap: 7px; padding: 14px 16px 10px; font-family: 'Manrope', sans-serif; }
.mb-chip { border: 1px solid rgba(28,24,21,.22); border-radius: 999px; background: transparent;
  color: #3a322a; font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  padding: 9px 16px; min-height: 36px; cursor: pointer; }
.mb-chip.on { background: rgba(176,62,27,.12); border-color: rgba(176,62,27,.5);
  color: #1c1815; font-weight: 700; }
.mb-sect { padding: 14px 18px 6px; font-family: 'Manrope', sans-serif; font-size: 10px;
  font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #7a705f; }
.mb-row { display: flex; gap: 13px; padding: 13px 16px; border-bottom: 1px solid rgba(28,24,21,.1);
  align-items: center; min-height: 64px; }
.mb-row.active { border-left: 2px solid #b03e1b; background: #e9e4d8; }
.mb-ava { width: 42px; height: 42px; border-radius: 7px; flex: 0 0 auto; background: #e9e4d8;
  display: flex; align-items: center; justify-content: center; font-family: 'Spectral', serif;
  font-size: 17px; color: #3a322a; border: 1px solid rgba(28,24,21,.16); }
.mb-rmain { flex: 1; min-width: 0; }
.mb-rname { font-family: 'Spectral', serif; font-size: 15.5px; font-weight: 500; color: #1c1815;
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mb-rname .tm { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 600;
  color: #7a705f; letter-spacing: .06em; flex: 0 0 auto; }
.mb-rprev { font-size: 13px; color: #7a705f; line-height: 1.4; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.mb-unrd { font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  background: #1c1815; color: #dfdbd2; padding: 2px 6px; margin-left: 7px; }
.mb-post { color: #b03e1b; font-family: 'Manrope', sans-serif; font-size: 11px;
  letter-spacing: .04em; font-style: normal; }
.mb-post .d { display: inline-block; width: 4px; height: 4px; border-radius: 50%;
  background: #b03e1b; margin-right: 3px; animation: mbPulse 1.4s ease-in-out infinite; }
.mb-post .d:nth-child(2) { animation-delay: .2s; }
.mb-post .d:nth-child(3) { animation-delay: .4s; }
@keyframes mbPulse { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mb-post .d { animation: none; } }

/* ── почта дня ── */
.mb-dm-head { padding: 20px 20px 8px; }
.mb-dm-kick { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .24em; text-transform: uppercase; color: #b03e1b; }
.mb-dm-h { font-family: 'Spectral', serif; font-weight: 400; font-size: 30px;
  line-height: 1.1; margin: 6px 0 0; letter-spacing: -.01em; }
.mb-dm-sub { font-family: 'Spectral', serif; font-style: italic; font-size: 13.5px;
  color: #7a705f; margin: 6px 0 0; }
.mb-dm-list { list-style: none; margin: 14px 0 0; padding: 0 20px 20px 34px; position: relative;
  overflow-y: hidden; flex: 1; }
.mb-dm-list::before { content: ""; position: absolute; left: 25px; top: 8px; bottom: 24px;
  width: 1px; background: rgba(28,24,21,.18); }
.mb-dm-item { position: relative; padding: 11px 0 13px; border-bottom: 1px solid rgba(28,24,21,.09); }
.mb-dm-item::before { content: ""; position: absolute; left: -13.5px; top: 16px; width: 9px;
  height: 9px; border: 1.5px solid #7a705f; background: #dfdbd2; }
.mb-dm-item.seen::before { background: #b03e1b; border-color: #b03e1b; }
.mb-dm-time { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 600;
  color: #7a705f; letter-spacing: .08em; }
.mb-dm-line { font-family: 'Spectral', serif; font-size: 15px; line-height: 1.42;
  color: #1c1815; margin: 3px 0 0; }
.mb-dm-line b { font-weight: 600; }
.mb-dm-src { font-family: 'Spectral', serif; font-style: italic; font-size: 11.5px;
  color: #7a705f; margin-top: 3px; }
.mb-quiet { padding: 12px 20px; border-top: 1px solid rgba(28,24,21,.14);
  display: flex; justify-content: space-between; font-family: 'Manrope', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #7a705f; }

/* ── тред ── */
.mb-thead { flex: 0 0 auto; display: flex; align-items: center; gap: 4px; height: 52px;
  padding: 0 6px; border-bottom: 1px solid rgba(28,24,21,.14); font-family: 'Manrope', sans-serif; }
.mb-tt { flex: 1; min-width: 0; padding-left: 2px; }
.mb-tt .nm { font-family: 'Spectral', serif; font-size: 16.5px; font-weight: 500; color: #1c1815;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mb-tt .st { font-size: 10px; font-weight: 600; color: #7a705f; letter-spacing: .05em; margin-top: 1px; }
.mb-tt .st .writing { color: #b03e1b; }
.mb-tscroll { flex: 1; min-height: 0; overflow: hidden; padding: 14px 18px 150px; position: relative; }
.mb-datechip { text-align: center; margin: 2px 0 12px; }
.mb-datechip span { font-family: 'Spectral', serif; font-style: italic; font-size: 12px;
  color: #7a705f; background: #e9e4d8; border: 1px solid rgba(28,24,21,.1);
  border-radius: 999px; padding: 4px 14px; }
.mb-msg { margin: 0 0 15px; position: relative; }
.mb-who { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .2em; text-transform: uppercase; color: #7a705f; }
.mb-who .n { font-family: 'Spectral', serif; font-style: italic; font-size: 13px;
  font-weight: 400; text-transform: none; letter-spacing: 0; color: #3a322a; margin-left: 6px; }
.mb-who.me .n { color: #b03e1b; }
.mb-prose { font-family: 'Spectral', serif; font-size: 15.5px; line-height: 1.58;
  color: #1c1815; margin: 3px 0 0; max-width: 58ch; }
.mb-quote { border-left: 2px solid rgba(28,24,21,.2); padding: 1px 0 2px 10px; margin: 4px 0 5px;
  font-style: italic; font-size: 13.5px; color: #7a705f; line-height: 1.45; }
.mb-note { display: inline-flex; align-items: center; gap: 6px; margin-top: 7px;
  font-family: 'Spectral', serif; font-style: italic; font-size: 12.5px; color: #b03e1b;
  border: 1px solid rgba(176,62,27,.35); background: rgba(176,62,27,.06);
  border-radius: 2px; padding: 4px 10px; }
.mb-catchup { display: flex; align-items: center; gap: 12px; margin: 18px 0;
  font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .18em; text-transform: uppercase; color: #b03e1b; }
.mb-catchup::before, .mb-catchup::after { content: ""; flex: 1; height: 1px;
  background: rgba(176,62,27,.4); }
.mb-newmail { position: absolute; right: 16px; bottom: 158px; z-index: 14; display: inline-flex;
  align-items: center; gap: 8px; background: #e9e4d8; border: 1px solid rgba(176,62,27,.5);
  color: #b03e1b; border-radius: 999px; padding: 9px 16px; min-height: 40px;
  font-family: 'Manrope', sans-serif; font-size: 10.5px; font-weight: 800; letter-spacing: .1em;
  box-shadow: 0 6px 16px rgba(28,24,21,.18); cursor: pointer; }

/* ── компоуз ── */
.mb-compose { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 15;
  background: #d4cfc3; border: 1px solid #1c1815;
  box-shadow: 3px 3px 0 rgba(28,24,21,.16); padding: 10px 12px 9px; }
.mb-c-row { display: flex; align-items: center; gap: 4px; }
.mb-c-ph { flex: 1; font-family: 'Spectral', serif; font-style: italic; font-size: 14.5px;
  color: #7a705f; padding-left: 4px; }
.mb-c-btn { width: 42px; height: 42px; border: none; background: transparent; color: #7a705f;
  font-size: 18px; border-radius: 10px; flex: 0 0 auto; display: inline-flex;
  align-items: center; justify-content: center; cursor: pointer; }
.mb-c-send { height: 42px; padding: 0 16px; border: none; background: #1c1815; color: #dfdbd2;
  border-radius: 2px; font-family: 'Manrope', sans-serif; font-size: 10.5px; font-weight: 800;
  letter-spacing: .14em; flex: 0 0 auto; cursor: pointer; }
.mb-c-foot { display: flex; align-items: center; gap: 6px; margin-top: 7px; padding: 0 4px;
  font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: #7a705f; }
.mb-c-foot .lnk { cursor: pointer; }
.mb-c-foot .lnk:hover { color: #1c1815; }
.mb-c-foot .dot { opacity: .8; }
.mb-c-foot .morning { margin-left: auto; color: #b03e1b; display: inline-flex;
  align-items: center; gap: 5px; cursor: pointer; }
.mb-sealed { position: absolute; left: 12px; right: 12px; bottom: 84px; z-index: 16;
  background: #1c1815; color: #dfdbd2; padding: 11px 14px; display: flex; align-items: center;
  gap: 10px; font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 600;
  box-shadow: 4px 4px 0 rgba(28,24,21,.2); }
.mb-sealed .wax { width: 22px; height: 22px; border-radius: 50%; background: #b03e1b;
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #f5f0e6; }
.mb-sealed .undo { margin-left: auto; color: #e8a482; letter-spacing: .1em;
  text-transform: uppercase; font-size: 9.5px; font-weight: 800; cursor: pointer; }

/* ── стол ── */
.mb-desk-scroll { flex: 1; min-height: 0; overflow: hidden; padding: 4px 0 20px; }
.mb-sheet { position: relative; margin: 12px 20px 0; background: #e9e4d8;
  border: 1px solid rgba(28,24,21,.16); padding: 16px 18px 14px;
  box-shadow: 2px 3px 0 rgba(28,24,21,.1); }
.mb-sheet.tilt { transform: rotate(-.7deg); }
.mb-sheet .to { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .2em; text-transform: uppercase; color: #7a705f; }
.mb-sheet .txt { font-family: 'Spectral', serif; font-style: italic; font-size: 16px;
  line-height: 1.5; color: #3a322a; margin: 6px 0 10px; }
.mb-sheet .cont { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase; color: #b03e1b; cursor: pointer; }
.mb-set { margin: 8px 20px 0; border-top: 1px solid rgba(28,24,21,.14); }
.mb-set-row { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  min-height: 54px; padding: 6px 0; border-bottom: 1px solid rgba(28,24,21,.09);
  font-family: 'Manrope', sans-serif; font-size: 14px; color: #1c1815; }
.mb-set-row .lab { display: flex; align-items: center; gap: 12px; }
.mb-set-row .ic { width: 22px; text-align: center; color: #7a705f; font-family: 'Spectral', serif; }
.mb-set-row .val { font-size: 12px; color: #7a705f; }
.mb-segc { display: flex; border: 1px solid rgba(28,24,21,.2); border-radius: 999px; overflow: hidden; flex: 0 0 auto; }
.mb-segc span { padding: 7px 9px; font-size: 10px; font-weight: 700; color: #7a705f; cursor: pointer; white-space: nowrap; }
.mb-segc span.on { background: rgba(176,62,27,.14); color: #1c1815; }

/* ── вечерний выпуск ── */
.mb-evening { background:
  radial-gradient(120% 42% at 50% -8%, rgba(176,62,27,.1), transparent 65%),
  linear-gradient(180deg, #d8d2c4 0%, #dfdbd2 40%); }
.mb-ev-close { margin: 16px 20px 0; border: 1px solid rgba(176,62,27,.4);
  background: rgba(176,62,27,.07); padding: 13px 16px; display: flex; align-items: center;
  gap: 12px; font-family: 'Manrope', sans-serif; }
.mb-ev-close .t { font-size: 12.5px; font-weight: 700; color: #8b2f12; }
.mb-ev-close .s { font-size: 11px; color: #7a705f; margin-top: 2px; }
.mb-ev-h { padding: 16px 20px 4px; font-family: 'Manrope', sans-serif; font-size: 10px;
  font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #7a705f; }
.mb-ev-stat { display: flex; gap: 10px; padding: 8px 20px 0; }
.mb-ev-card { flex: 1; border: 1px solid rgba(28,24,21,.16); background: #e9e4d8;
  padding: 12px 14px; }
.mb-ev-card .n { font-family: 'Spectral', serif; font-size: 24px; color: #1c1815; }
.mb-ev-card .l { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .16em; text-transform: uppercase; color: #7a705f; margin-top: 3px; }
.mb-ev-row { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: 0 20px; padding: 12px 0; border-bottom: 1px solid rgba(28,24,21,.1); }
.mb-ev-row .who { font-family: 'Spectral', serif; font-size: 15px; color: #1c1815; }
.mb-ev-row .what { font-family: 'Spectral', serif; font-style: italic; font-size: 12px;
  color: #7a705f; margin-top: 2px; }
.mb-ev-act { font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase; color: #b03e1b; border: 1px solid rgba(176,62,27,.4);
  background: transparent; border-radius: 999px; padding: 9px 14px; cursor: pointer; }
.mb-ev-foot { margin: 18px 20px 0; font-family: 'Spectral', serif; font-style: italic;
  font-size: 13.5px; line-height: 1.5; color: #7a705f; }
`;
function MbStatus() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-status"
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", null, "LTE \xB7 87%"));
}
function MbTop({
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-top"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-word"
  }, "TELEGRAMITO"), /*#__PURE__*/React.createElement("div", {
    className: "mb-date"
  }, "\u041F\u044F\u0442\u043D\u0438\u0446\u0430, \u0434\u0435\u0441\u044F\u0442\u043E\u0435 \u0438\u044E\u043B\u044F")), actions);
}
function MbTabBar({
  active
}) {
  const tabs = [{
    k: 'letters',
    g: '✉',
    l: 'Письма'
  }, {
    k: 'daymail',
    g: '☙',
    l: 'Почта дня',
    badge: '14'
  }, {
    k: 'circles',
    g: '◫',
    l: 'Кружки'
  }, {
    k: 'desk',
    g: '❦',
    l: 'Стол'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-tabbar"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.k,
    type: "button",
    className: t.k === active ? 'mb-tab on' : 'mb-tab'
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, t.g), t.l, t.badge && t.k !== active ? /*#__PURE__*/React.createElement("span", {
    className: "bdg"
  }, t.badge) : null)));
}

/* ═══ A · Письма ═══ */
function MobLetters() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-phone"
  }, /*#__PURE__*/React.createElement("style", null, MB_CSS), /*#__PURE__*/React.createElement(MbStatus, null), /*#__PURE__*/React.createElement(MbTop, {
    actions: /*#__PURE__*/React.createElement("button", {
      className: "mb-iconbtn",
      "aria-label": "\u041F\u043E\u0438\u0441\u043A"
    }, "\u2315")
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-seg"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mb-chip on"
  }, "\u041F\u0438\u0441\u044C\u043C\u0430"), /*#__PURE__*/React.createElement("button", {
    className: "mb-chip"
  }, "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0438"), /*#__PURE__*/React.createElement("button", {
    className: "mb-chip"
  }, "\u041E\u0442\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435")), /*#__PURE__*/React.createElement("div", {
    className: "mb-row active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ava"
  }, "\u0421\u0421"), /*#__PURE__*/React.createElement("div", {
    className: "mb-rmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-rname"
  }, /*#__PURE__*/React.createElement("span", null, "Soft Start \xB7 2026 ", /*#__PURE__*/React.createElement("span", {
    className: "mb-unrd"
  }, "99+")), /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, "14:26")), /*#__PURE__*/React.createElement("div", {
    className: "mb-rprev mb-post"
  }, /*#__PURE__*/React.createElement("span", {
    className: "d"
  }), /*#__PURE__*/React.createElement("span", {
    className: "d"
  }), /*#__PURE__*/React.createElement("span", {
    className: "d"
  }), " \u0432 \u043F\u0443\u0442\u0438\u2026 \xB7 2 \u043F\u0438\u0448\u0443\u0442"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ava"
  }, "\u041C"), /*#__PURE__*/React.createElement("div", {
    className: "mb-rmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-rname"
  }, /*#__PURE__*/React.createElement("span", null, "\u041C\u0430\u043C\u0430 ", /*#__PURE__*/React.createElement("span", {
    className: "mb-unrd"
  }, "2")), /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, "13:08")), /*#__PURE__*/React.createElement("div", {
    className: "mb-rprev"
  }, "\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F \xB7 \xAB\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438, \u0447\u0442\u043E \u0432\u044B\u0440\u043E\u0441\u043B\u043E\xBB"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ava"
  }, "K"), /*#__PURE__*/React.createElement("div", {
    className: "mb-rmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-rname"
  }, /*#__PURE__*/React.createElement("span", null, "Kate \uD83D\uDC38"), /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, "12:55")), /*#__PURE__*/React.createElement("div", {
    className: "mb-rprev"
  }, "said hi"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ava"
  }, "\u041B"), /*#__PURE__*/React.createElement("div", {
    className: "mb-rmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-rname"
  }, /*#__PURE__*/React.createElement("span", null, "\u041B\u0438\u0437\u0430 English"), /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, "11:14")), /*#__PURE__*/React.createElement("div", {
    className: "mb-rprev"
  }, "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 \u043F\u0438\u0441\u044C\u043C\u043E \xB7 0:34"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-sect"
  }, "\u041A\u0430\u043D\u0430\u043B\u044B \u0438 \u0431\u044E\u043B\u043B\u0435\u0442\u0435\u043D\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "mb-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ava mb-mono",
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, "88.6"), /*#__PURE__*/React.createElement("div", {
    className: "mb-rmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-rname"
  }, /*#__PURE__*/React.createElement("span", null, "\u0412\u0435\u0434\u043E\u043C\u043E\u0441\u0442\u0438 \u0434\u043D\u044F ", /*#__PURE__*/React.createElement("span", {
    className: "mb-unrd"
  }, "3")), /*#__PURE__*/React.createElement("span", {
    className: "tm"
  }, "09:05")), /*#__PURE__*/React.createElement("div", {
    className: "mb-rprev"
  }, "\u0421\u0432\u0435\u0436\u0438\u0439 \u0432\u044B\u043F\u0443\u0441\u043A \xB7 \u043B\u0435\u0442\u043D\u0438\u0435 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u044B"))), /*#__PURE__*/React.createElement("button", {
    className: "mb-fab"
  }, "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u270E")), /*#__PURE__*/React.createElement(MbTabBar, {
    active: "letters"
  }));
}

/* ═══ B · Почта дня ═══ */
function MobDayMail() {
  const items = [{
    t: '14:26',
    seen: true,
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Devon"), " \u043F\u0438\u0448\u0435\u0442: \xAB\u0437\u0430\u0439\u043C\u0443\u0441\u044C \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0432\u0435\u0447\u0435\u0440\u043E\u043C\xBB"),
    src: 'Кружок · Soft Start · 2026'
  }, {
    t: '14:24',
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Irina K."), " \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u0434\u0435\u043B \xB7 4 \u043F\u0443\u043D\u043A\u0442\u0430"),
    src: 'Кружок · Soft Start · 2026'
  }, {
    t: '14:11',
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u041B\u0438\u0437\u0430"), " \u043E\u0441\u0442\u0430\u0432\u0438\u043B\u0430 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 \u043F\u0438\u0441\u044C\u043C\u043E \xB7 0:34"),
    src: 'Переписка · Лиза English'
  }, {
    t: '13:08',
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u041C\u0430\u043C\u0430"), " \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044E: \xAB\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438, \u0447\u0442\u043E \u0432\u044B\u0440\u043E\u0441\u043B\u043E\xBB"),
    src: 'Переписка · Мама ♥'
  }, {
    t: '12:55',
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Kate"), " \uD83D\uDC38 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u043F\u0440\u0438\u0432\u0435\u0442"),
    src: 'Переписка · Kate'
  }, {
    t: '11:30',
    line: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u041D\u0430\u0442\u0443\u043B\u0438\u043A"), " \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043F\u0435\u0441\u043D\u0435\u0439 \xABPure Imagination\xBB"),
    src: 'Переписка · Натулик'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-phone"
  }, /*#__PURE__*/React.createElement("style", null, MB_CSS), /*#__PURE__*/React.createElement(MbStatus, null), /*#__PURE__*/React.createElement(MbTop, {
    actions: /*#__PURE__*/React.createElement("button", {
      className: "mb-iconbtn",
      "aria-label": "\u041F\u043E\u0438\u0441\u043A"
    }, "\u2315")
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-dm-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-dm-kick"
  }, "\u0423\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u0432\u044B\u043F\u0443\u0441\u043A"), /*#__PURE__*/React.createElement("h2", {
    className: "mb-dm-h"
  }, "\u041F\u043E\u0447\u0442\u0430 \u0434\u043D\u044F"), /*#__PURE__*/React.createElement("p", {
    className: "mb-dm-sub"
  }, "\u0427\u0442\u043E \u043F\u0440\u0438\u0448\u043B\u043E, \u043F\u043E\u043A\u0430 \u0432\u0430\u0441 \u043D\u0435 \u0431\u044B\u043B\u043E \u2014 \u0441\u0432\u0435\u0436\u0435\u0435 \u0441\u0432\u0435\u0440\u0445\u0443.")), /*#__PURE__*/React.createElement("ul", {
    className: "mb-dm-list"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: it.seen ? 'mb-dm-item seen' : 'mb-dm-item'
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-dm-time"
  }, it.t), /*#__PURE__*/React.createElement("p", {
    className: "mb-dm-line"
  }, it.line), /*#__PURE__*/React.createElement("p", {
    className: "mb-dm-src"
  }, it.src)))), /*#__PURE__*/React.createElement("div", {
    className: "mb-quiet"
  }, /*#__PURE__*/React.createElement("span", null, "\u0422\u0438\u0445\u043E \u0441 09:14"), /*#__PURE__*/React.createElement("span", null, "5\u0447 12\u043C"))), /*#__PURE__*/React.createElement(MbTabBar, {
    active: "daymail"
  }));
}

/* ═══ C · Письмо (тред) ═══ */
function MobThread() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-phone"
  }, /*#__PURE__*/React.createElement("style", null, MB_CSS), /*#__PURE__*/React.createElement(MbStatus, null), /*#__PURE__*/React.createElement("div", {
    className: "mb-thead"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mb-iconbtn",
    "aria-label": "\u041D\u0430\u0437\u0430\u0434"
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    className: "mb-tt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, "Soft Start \xB7 2026"), /*#__PURE__*/React.createElement("div", {
    className: "st"
  }, "14 \u043A\u043E\u0440\u0440\u0435\u0441\u043F\u043E\u043D\u0434\u0435\u043D\u0442\u043E\u0432 \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "writing"
  }, "2 \u043F\u0438\u0448\u0443\u0442\u2026"))), /*#__PURE__*/React.createElement("button", {
    className: "mb-iconbtn",
    "aria-label": "\u041A \u0434\u0430\u0442\u0435",
    style: {
      fontSize: 16
    }
  }, "\u25A6"), /*#__PURE__*/React.createElement("button", {
    className: "mb-iconbtn",
    "aria-label": "\u0421\u0432\u0435\u0434\u0435\u043D\u0438\u044F"
  }, "\u24D8")), /*#__PURE__*/React.createElement("div", {
    className: "mb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-tscroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-datechip"
  }, /*#__PURE__*/React.createElement("span", null, "24 \u0430\u043F\u0440\u0435\u043B\u044F, \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u043B\u0443\u0434\u043D\u044F")), /*#__PURE__*/React.createElement("div", {
    className: "mb-msg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-who"
  }, "13:47 ", /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "\u2014 Irina K.")), /*#__PURE__*/React.createElement("p", {
    className: "mb-prose"
  }, "\u0414\u043E\u0431\u0440\u043E\u0435 \u0443\u0442\u0440\u043E \u0432\u0441\u0435\u043C! \u041A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u043F\u0435\u0440\u0435\u043A\u043B\u0438\u0447\u043A\u0430 \u0442\u0440\u0435\u0442\u044C\u0435\u0439 \u043D\u0435\u0434\u0435\u043B\u0438."), /*#__PURE__*/React.createElement("span", {
    className: "mb-note"
  }, "\u2767 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0437\u0430 \u0443\u0436\u0438\u043D\u043E\u043C")), /*#__PURE__*/React.createElement("div", {
    className: "mb-msg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-who"
  }, "13:52 ", /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "\u2014 Anna")), /*#__PURE__*/React.createElement("p", {
    className: "mb-prose"
  }, "\u0410\u043D\u043D\u0430 \u0447\u0430\u0441\u0442\u043E \u0442\u0435\u0440\u044F\u0435\u0442 \u0447\u0442\u043E-\u0442\u043E \u0443 \u0441\u0435\u0431\u044F \u0432 \u0441\u0443\u043C\u043A\u0435. \u042D\u0442\u043E \u0431\u0435\u0441\u0438\u0442.")), /*#__PURE__*/React.createElement("div", {
    className: "mb-catchup"
  }, "\u0412\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B\u0438\u0441\u044C \u0437\u0434\u0435\u0441\u044C \xB7 24 \u0430\u043F\u0440\u0435\u043B\u044F"), /*#__PURE__*/React.createElement("div", {
    className: "mb-msg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-who"
  }, "13:55 ", /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "\u2014 Marina")), /*#__PURE__*/React.createElement("div", {
    className: "mb-quote"
  }, "\u0410\u043D\u043D\u0430 \u0447\u0430\u0441\u0442\u043E \u0442\u0435\u0440\u044F\u0435\u0442 \u0447\u0442\u043E-\u0442\u043E \u0443 \u0441\u0435\u0431\u044F \u0432 \u0441\u0443\u043C\u043A\u0435. \u042D\u0442\u043E \u0431\u0435\u0441\u0438\u0442."), /*#__PURE__*/React.createElement("p", {
    className: "mb-prose"
  }, "lol same. \u042F \u043D\u0430\u0448\u043B\u0430 \u043D\u0430\u0443\u0448\u043D\u0438\u043A\u0438 \u0432 \u0431\u043E\u0442\u0438\u043D\u043A\u0435 \u0432\u0447\u0435\u0440\u0430.")), /*#__PURE__*/React.createElement("div", {
    className: "mb-msg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-who mb-who me"
  }, "14:05 ", /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "\u2014 \u0412\u044B")), /*#__PURE__*/React.createElement("p", {
    className: "mb-prose"
  }, "\u041A\u043B\u0443\u0431 \xAB\u0431\u0443\u043C \u2014 \u0438 \u0432\u043E\u043B\u043E\u0441\u044B \u043D\u0430\u0437\u0430\u0434\xBB, \u043A\u0430\u043A \u0441\u043B\u044B\u0448\u043D\u043E, \u043F\u0440\u0438\u0451\u043C."))), /*#__PURE__*/React.createElement("button", {
    className: "mb-newmail"
  }, "\u25BE \u0441\u0432\u0435\u0436\u0430\u044F \u043F\u043E\u0447\u0442\u0430 \xB7 99+"), /*#__PURE__*/React.createElement("div", {
    className: "mb-sealed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wax"
  }, "\u2726"), "\u0417\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u043D\u043E \u2014 \u0443\u0439\u0434\u0451\u0442 \u0447\u0435\u0440\u0435\u0437 5 \u0441", /*#__PURE__*/React.createElement("span", {
    className: "undo"
  }, "\u0420\u0430\u0441\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "mb-compose"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-c-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mb-c-ph"
  }, "\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C \u0441\u0432\u043E\u0435\u0439 \u0440\u0443\u043A\u043E\u0439\u2026"), /*#__PURE__*/React.createElement("button", {
    className: "mb-c-btn",
    "aria-label": "\u042D\u043C\u043E\u0434\u0437\u0438"
  }, "\u263A"), /*#__PURE__*/React.createElement("button", {
    className: "mb-c-btn",
    "aria-label": "\u0412\u043B\u043E\u0436\u0435\u043D\u0438\u0435"
  }, "\u271A"), /*#__PURE__*/React.createElement("button", {
    className: "mb-c-send"
  }, "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "mb-c-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lnk"
  }, "\u0424\u043E\u0442\u043E"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "lnk"
  }, "\u0413\u043E\u043B\u043E\u0441"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "lnk"
  }, "\u0424\u0430\u0439\u043B"), /*#__PURE__*/React.createElement("span", {
    className: "morning"
  }, "\uD83D\uDD57 \u0443\u0442\u0440\u0435\u043D\u043D\u0435\u0439 \u043F\u043E\u0447\u0442\u043E\u0439")))));
}

/* ═══ D · Стол ═══ */
function MobDesk() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-phone"
  }, /*#__PURE__*/React.createElement("style", null, MB_CSS), /*#__PURE__*/React.createElement(MbStatus, null), /*#__PURE__*/React.createElement(MbTop, {
    actions: null
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-desk-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-sect",
    style: {
      paddingTop: 16
    }
  }, "\u041D\u0430 \u0441\u0442\u043E\u043B\u0435 \xB7 \u043D\u0435\u043E\u043A\u043E\u043D\u0447\u0435\u043D\u043D\u044B\u0435 \u043F\u0438\u0441\u044C\u043C\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "mb-sheet tilt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "to"
  }, "\u041A\u043E\u043C\u0443 \xB7 \u041C\u0430\u043C\u0430 \u2665"), /*#__PURE__*/React.createElement("p", {
    className: "txt"
  }, "\xAB\u041C\u0430\u043C, \u0430 \u043F\u043E\u043C\u043D\u0438\u0448\u044C, \u0442\u044B \u043E\u0431\u0435\u0449\u0430\u043B\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C, \u043A\u0430\u043A \u043F\u0435\u0447\u044C \u0442\u043E\u0442 \u043F\u0438\u0440\u043E\u0433 \u0441\u2026\xBB"), /*#__PURE__*/React.createElement("span", {
    className: "cont"
  }, "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u043E \u270E")), /*#__PURE__*/React.createElement("div", {
    className: "mb-sheet"
  }, /*#__PURE__*/React.createElement("div", {
    className: "to"
  }, "\u041A\u043E\u043C\u0443 \xB7 Kate \uD83D\uDC38"), /*#__PURE__*/React.createElement("p", {
    className: "txt"
  }, "\xABHi! I watched the film you told me about and\u2026\xBB"), /*#__PURE__*/React.createElement("span", {
    className: "cont"
  }, "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u043E \u270E")), /*#__PURE__*/React.createElement("div", {
    className: "mb-sect",
    style: {
      paddingTop: 20
    }
  }, "\u0425\u043E\u0437\u044F\u0439\u0441\u0442\u0432\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "mb-set"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-set-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, "\u263E"), "\u0422\u0435\u043C\u0430"), /*#__PURE__*/React.createElement("span", {
    className: "mb-segc"
  }, /*#__PURE__*/React.createElement("span", null, "\u0421\u0432\u0435\u0442\u043B\u0430\u044F"), /*#__PURE__*/React.createElement("span", {
    className: "on"
  }, "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F"), /*#__PURE__*/React.createElement("span", null, "\u0422\u0451\u043C\u043D\u0430\u044F"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-set-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, "\u2766"), "\u0420\u0435\u0436\u0438\u043C"), /*#__PURE__*/React.createElement("span", {
    className: "mb-segc"
  }, /*#__PURE__*/React.createElement("span", {
    className: "on"
  }, "\u0420\u0435\u0431\u0451\u043D\u043E\u043A"), /*#__PURE__*/React.createElement("span", null, "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C \xB7 PIN"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-set-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, "\u2709"), "\u0417\u0430\u043F\u0440\u043E\u0441\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u0430"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "2 \u043D\u043E\u0432\u044B\u0445 \u203A")), /*#__PURE__*/React.createElement("div", {
    className: "mb-set-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, "\u2699"), "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    className: "mb-set-row",
    style: {
      borderBottom: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab",
    style: {
      color: '#b03e1b'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, "\u238B"), "\u0412\u044B\u0439\u0442\u0438"))))), /*#__PURE__*/React.createElement(MbTabBar, {
    active: "desk"
  }));
}

/* ═══ E · Вечерний выпуск ═══ */
function MobEvening() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-phone mb-evening"
  }, /*#__PURE__*/React.createElement("style", null, MB_CSS), /*#__PURE__*/React.createElement(MbStatus, null), /*#__PURE__*/React.createElement(MbTop, {
    actions: null
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-dm-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-dm-kick"
  }, "\u0412\u0435\u0447\u0435\u0440\u043D\u0438\u0439 \u0432\u044B\u043F\u0443\u0441\u043A \xB7 20:18"), /*#__PURE__*/React.createElement("h2", {
    className: "mb-dm-h"
  }, "\u0418\u0442\u043E\u0433 \u0434\u043D\u044F"), /*#__PURE__*/React.createElement("p", {
    className: "mb-dm-sub"
  }, "\u0414\u0432\u0435\u043D\u0430\u0434\u0446\u0430\u0442\u044C \u043F\u0438\u0441\u0435\u043C \u043E\u0442 \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u043A\u043E\u0440\u0440\u0435\u0441\u043F\u043E\u043D\u0434\u0435\u043D\u0442\u043E\u0432.")), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "12"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "\u041F\u0440\u0438\u0448\u043B\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "7"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "2"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "\u0416\u0434\u0443\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-h",
    style: {
      paddingTop: 22
    }
  }, "\u041E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u0431\u0435\u0437 \u043E\u0442\u0432\u0435\u0442\u0430"), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, "\u041C\u0430\u043C\u0430 \u2665"), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, "\u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044E \xB7 13:08")), /*#__PURE__*/React.createElement("button", {
    className: "mb-ev-act"
  }, "\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, "\u041B\u0438\u0437\u0430 English"), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, "\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 \u043F\u0438\u0441\u044C\u043C\u043E \xB7 14:11")), /*#__PURE__*/React.createElement("button", {
    className: "mb-ev-act"
  }, "\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "mb-ev-close"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'Spectral, serif',
      fontSize: 20
    }
  }, "\u263E"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u041F\u043E\u0447\u0442\u0430 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 42 \u043C\u0438\u043D\u0443\u0442\u044B"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, "\u041D\u0430\u043F\u0438\u0441\u0430\u043D\u043D\u043E\u0435 \u043F\u043E\u0441\u043B\u0435 21:00 \u0443\u0439\u0434\u0451\u0442 \u0443\u0442\u0440\u0435\u043D\u043D\u0435\u0439 \u043F\u043E\u0447\u0442\u043E\u0439 \u0432 8:00"))), /*#__PURE__*/React.createElement("p", {
    className: "mb-ev-foot"
  }, "\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u043E\u0439 \u043D\u043E\u0447\u0438. \u0423\u0442\u0440\u043E\u043C \u0432\u0430\u0441 \u0431\u0443\u0434\u0435\u0442 \u0436\u0434\u0430\u0442\u044C \u0441\u0432\u0435\u0436\u0438\u0439 \u0432\u044B\u043F\u0443\u0441\u043A \xAB\u041F\u043E\u0447\u0442\u044B \u0434\u043D\u044F\xBB.")), /*#__PURE__*/React.createElement(MbTabBar, {
    active: "daymail"
  }));
}
Object.assign(window, {
  MobLetters,
  MobDayMail,
  MobThread,
  MobDesk,
  MobEvening
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/mobile.jsx", error: String((e && e.message) || e) }); }

// app/thread-data.jsx
try { (() => {
// Shared sample data for all three reframes. Same conversation, three lenses.

const THREAD = {
  id: 'soft-start-2026',
  title: 'Soft Start · 2026',
  topic: 'Test Drive',
  members: 14,
  unread: 99,
  starred: true,
  // colors used by per-thread "rooms"
  letters: {
    paper: '#f6efe1',
    ink: '#1d1612',
    accent: '#b54320',
    mono: 'SS'
  },
  atelier: {
    bg: '#0c1a2e',
    fg: '#fdfbf6',
    accent: '#ff7a4a'
  },
  broadcast: {
    freq: '88.6',
    band: 'FM',
    accent: '#ffb84d'
  }
};
const PEOPLE = {
  anna: {
    name: 'Anna',
    color: '#c14a8b'
  },
  marina: {
    name: 'Marina',
    color: '#5b8def'
  },
  devon: {
    name: 'Devon',
    color: '#4cd9c2'
  },
  irina: {
    name: 'Irina K.',
    color: '#e8a93b'
  },
  you: {
    name: 'You',
    color: '#3390ec'
  },
  sasha: {
    name: 'Sasha',
    color: '#b15bef'
  },
  liza: {
    name: 'Liza',
    color: '#ff7a59'
  },
  nastya: {
    name: 'Nastya',
    color: '#266b29'
  }
};

// One day from the thread, cleaned up
const MESSAGES = [{
  id: 1,
  from: 'irina',
  t: '13:47',
  kind: 'text',
  text: 'Морning everyone. Quick check-in for week 3.'
}, {
  id: 2,
  from: 'anna',
  t: '13:52',
  kind: 'text',
  text: 'Анна часто теряет что-то у себя в сумке. Это бесит.'
}, {
  id: 3,
  from: 'marina',
  t: '13:55',
  kind: 'reaction-quote',
  quoteOf: 2,
  text: 'lol same. Я нашла наушники в ботинке вчера.',
  reactions: [{
    e: '😂',
    n: 4
  }]
}, {
  id: 4,
  from: 'devon',
  t: '13:58',
  kind: 'list',
  title: 'How did you do?',
  items: ['Oof, but hey, I tried ✌️', 'Boom! A hair away 🥲', 'Crushed it 💯'],
  reactions: [{
    e: '🥹',
    n: 4
  }]
}, {
  id: 5,
  from: 'sasha',
  t: '14:02',
  kind: 'text',
  text: 'Crushed it for me — finally cleared the inbox before lunch.'
}, {
  id: 6,
  from: 'you',
  t: '14:05',
  kind: 'text',
  mine: true,
  text: 'Boom-and-a-hair-away club, reporting in.'
}, {
  id: 7,
  from: 'liza',
  t: '14:11',
  kind: 'voice',
  duration: '0:34',
  waveform: [0.2, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 0.3, 0.5, 0.7, 0.4, 0.6, 0.5, 0.3, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.5, 0.7]
}, {
  id: 8,
  from: 'nastya',
  t: '14:18',
  kind: 'text',
  text: 'Мой дядя в норме спит меньше 6 часов. Завидую.',
  reactions: [{
    e: '🫠',
    n: 2
  }]
}, {
  id: 9,
  from: 'irina',
  t: '14:24',
  kind: 'todo',
  title: 'Next up — week 4 prep',
  items: [{
    done: true,
    text: 'Pick the cohort buddy pairs'
  }, {
    done: true,
    text: 'Confirm the Sunday call time'
  }, {
    done: false,
    text: 'Draft the reflection prompt'
  }, {
    done: false,
    text: 'Mail out the workbook PDFs'
  }]
}, {
  id: 10,
  from: 'devon',
  t: '14:26',
  kind: 'text',
  text: 'Я возьму prompt — займусь сегодня вечером.'
}];
const CHATS = [{
  id: 'mama',
  name: 'Мама',
  tag: 'Photo',
  date: 'Apr 30',
  kind: 'photo',
  tone: 'warm'
}, {
  id: 'soft',
  name: 'Soft Start · 2026',
  tag: 'Event',
  date: 'Apr 24',
  kind: 'event',
  tone: 'active',
  unread: '99+',
  pinned: true,
  current: true
}, {
  id: 'telegram',
  name: 'Telegram',
  tag: 'Event',
  date: 'Apr 24',
  kind: 'event',
  tone: 'system'
}, {
  id: 'kate',
  name: 'Kate',
  tag: 'Nice to see you again 🤞',
  date: 'Apr 21',
  kind: 'text',
  tone: 'cool'
}, {
  id: 'dmts',
  name: 'Дедушка МТС',
  tag: 'Sticker',
  date: 'Apr 18',
  kind: 'sticker',
  tone: 'cool'
}, {
  id: 'liza',
  name: 'Лиза English',
  tag: 'Sticker',
  date: 'Apr 16',
  kind: 'sticker',
  tone: 'sage'
}, {
  id: 'mami',
  name: 'Mamá ♥',
  tag: 'Photo',
  date: 'Apr 15',
  kind: 'photo',
  tone: 'warm'
}, {
  id: 'nastyab2',
  name: 'Настя B2',
  tag: 'Like, comment, любую…',
  date: 'Apr 8',
  kind: 'text',
  tone: 'cool'
}, {
  id: 'katya',
  name: 'Катя 🐸',
  tag: 'Event',
  date: 'Apr 3',
  kind: 'event',
  tone: 'sage'
}, {
  id: 'natulik',
  name: 'Натулик 😘',
  tag: 'music.yandex.ru/album…',
  date: 'Mar 28',
  kind: 'link',
  tone: 'rose'
}, {
  id: 'papa',
  name: 'Папа 😅',
  tag: 'GIF',
  date: 'Mar 14',
  kind: 'gif',
  tone: 'cool'
}, {
  id: 'ludmila',
  name: 'Ludmila',
  tag: 'Voice · 0:46',
  date: 'Mar 14',
  kind: 'voice',
  tone: 'sage'
}];

// "Today" digest — what's actively happening across all chats
const TODAY = [{
  t: '14:26',
  who: 'Devon',
  chat: 'Soft Start · 2026',
  what: 'said «займусь сегодня вечером»'
}, {
  t: '14:24',
  who: 'Irina K.',
  chat: 'Soft Start · 2026',
  what: 'shared a checklist · 4 items'
}, {
  t: '14:11',
  who: 'Liza',
  chat: 'Soft Start · 2026',
  what: 'sent a voice note · 0:34'
}, {
  t: '13:08',
  who: 'Mom',
  chat: 'Mamá ♥',
  what: 'sent a photo'
}, {
  t: '12:55',
  who: 'Kate',
  chat: 'Kate',
  what: '👋 said hi'
}, {
  t: '11:30',
  who: 'Natulik',
  chat: 'Натулик 😘',
  what: 'shared a song · «Pure Imagination»'
}];

// Per-day activity counts for the current thread (for "Thread DNA" panel)
const DNA_DAYS = [{
  d: 'Apr 19',
  count: 47
}, {
  d: 'Apr 20',
  count: 22
}, {
  d: 'Apr 21',
  count: 8
}, {
  d: 'Apr 22',
  count: 36
}, {
  d: 'Apr 23',
  count: 71
}, {
  d: 'Apr 24',
  count: 99,
  peak: true
}, {
  d: 'Apr 25',
  count: 52
}, {
  d: 'Apr 26',
  count: 19
}, {
  d: 'Apr 27',
  count: 28
}, {
  d: 'Apr 28',
  count: 64
}, {
  d: 'Apr 29',
  count: 41
}, {
  d: 'Apr 30',
  count: 12
}, {
  d: 'May 1',
  count: 27
}, {
  d: 'May 2',
  count: 8
}];
Object.assign(window, {
  THREAD,
  PEOPLE,
  MESSAGES,
  CHATS,
  TODAY,
  DNA_DAYS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/thread-data.jsx", error: String((e && e.message) || e) }); }

})();
