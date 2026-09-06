import React, { useEffect, useRef, useState, useReducer, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu,
  Box,
  Layers,
  BookOpen,
  Stethoscope,
  Search,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Focus,
  Rotate3D,
  Tags,
  Play,
  Pause,
  Zap,
  Wind,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Link2,
  Volume2,
  Power,
  Plug,
  Monitor,
  Info,
  ExternalLink,
} from "lucide-react";
import * as content from "./data";
import { translate, localize, readLanguage, LANGUAGE_STORAGE } from "./i18n";
import { createScene } from "./Scene";
import { AboutDialog } from "./AboutDialog";
import {
  transitionPower,
  powerLabels as rawPowerLabels,
  rearSwitchObservation,
  canShowFlow,
  flowStages as rawFlowStages,
  flowSegments,
  STAGE_DURATION_MS,
} from "./simulation";
import "./style.css";

const STORAGE = "computer-atlas-progress-v1";
function readProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE));
    return {
      lessons: Array.isArray(p?.lessons)
        ? p.lessons.filter((id) => content.lessons.some((l) => l.id === id))
        : [],
      diagnosed: p?.diagnosed === true,
    };
  } catch {
    return { lessons: [], diagnosed: false };
  }
}
function IconButton({ icon: Icon, label, active = false, ...rest }) {
  return (
    <button
      className={"icon-button" + (active ? " active" : "")}
      title={label}
      aria-label={label}
      aria-pressed={active}
      {...rest}
    >
      <Icon size={18} />
    </button>
  );
}
function App() {
  const [language, setLanguage] = useState(() => {
    try {
      return readLanguage(window.localStorage);
    } catch {
      return "en";
    }
  });
  const t = (value) => translate(value, language);
  const { parts, byId, systems, lessons, flowInfo, powerLabels, flowStages } =
    useMemo(() => {
      const translated = localize(content, language);
      return {
        ...translated,
        byId: Object.fromEntries(translated.parts.map((p) => [p.id, p])),
        powerLabels: localize(rawPowerLabels, language),
        flowStages: localize(rawFlowStages, language),
      };
    }, [language]);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = translate("计算机解剖学", language);
    try {
      localStorage.setItem(LANGUAGE_STORAGE, language);
    } catch {
      /* Language still works in memory. */
    }
  }, [language]);
  const [selected, setSelected] = useState("cpu"),
    [mode, setMode] = useState("explore"),
    [query, setQuery] = useState(""),
    [visible, setVisible] = useState(systems.map((s) => s.id));
  const [explosion, setExplosion] = useState(0.23),
    [panel, setPanel] = useState(false),
    [related, setRelated] = useState(false),
    [flow, setFlow] = useState("none"),
    [playing, setPlaying] = useState(false),
    [auto, setAuto] = useState(false),
    [labels, setLabels] = useState(true);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [catalogOpen, setCatalogOpen] = useState(false);
  const [progress, setProgress] = useState(readProgress),
    [lessonId, setLessonId] = useState(null),
    [stepIndex, setStepIndex] = useState(0),
    [stepDone, setStepDone] = useState(false),
    [lessonFinished, setLessonFinished] = useState(false);
  const [checks, setChecks] = useState([]),
    [answer, setAnswer] = useState(null),
    [about, setAbout] = useState(false);
  const [diagnosticPower, dispatchPower] = useReducer(transitionPower, "off");
  const [phase, setPhase] = useState(0),
    [flowComplete, setFlowComplete] = useState(false),
    [runId, setRunId] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const elapsed = useRef(0),
    actionRef = useRef(null);
  const device = mode === "challenge" ? diagnosticPower : "running";
  const fixed = diagnosticPower === "running";
  const flowVisible =
    flowSegments(
      flow,
      phase,
      device,
      parts
        .filter(
          (p) => visible.includes(p.system) && (p.id !== "panel" || panel),
        )
        .map((p) => p.id),
    ).length > 0;
  const host = useRef(null),
    scene = useRef(null),
    selectRef = useRef(null),
    lesson = lessons.find((l) => l.id === lessonId),
    step = lesson?.steps[stepIndex];
  const part = byId[selected],
    system = systems.find((s) => s.id === part.system);
  const select = (id) => {
    setSelected(id);
    setVisible((v) =>
      v.includes(byId[id].system) ? v : [...v, byId[id].system],
    );
    if (id === "panel") setPanel(true);
    if (mode === "learn" && step?.part === id) setStepDone(true);
    setCatalogOpen(false);
  };
  selectRef.current = select;
  useEffect(() => {
    try {
      scene.current = createScene(
        host.current,
        (id) => selectRef.current(id),
        () => setReady(true),
        (action) => actionRef.current?.(action),
      );
    } catch (e) {
      setError(
        "当前浏览器无法启动 3D 渲染。请启用硬件加速后重新加载。部件目录与课程仍可使用。",
      );
      console.error(e);
    }
    return () => scene.current?.dispose();
  }, []);
  useEffect(() => {
    scene.current?.update({
      selected,
      explosion,
      visible,
      panel,
      related,
      flow,
      playing,
      auto,
      labels,
      device,
      phase,
      runId,
      reducedMotion,
      language,
    });
  }, [
    selected,
    explosion,
    visible,
    panel,
    related,
    flow,
    playing,
    auto,
    labels,
    device,
    phase,
    runId,
    reducedMotion,
    language,
  ]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedMotion(media.matches);
      if (media.matches) {
        setPlaying(false);
        setAuto(false);
      }
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (diagnosticPower !== "starting") return;
    const timer = setTimeout(() => dispatchPower("bootComplete"), 1800);
    return () => clearTimeout(timer);
  }, [diagnosticPower]);
  useEffect(() => {
    if (diagnosticPower === "running")
      setProgress((p) => ({ ...p, diagnosed: true }));
  }, [diagnosticPower]);
  useEffect(() => {
    if (!playing || reducedMotion || flowComplete || !flowVisible) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden) elapsed.current += now - last;
      last = now;
      if (elapsed.current >= STAGE_DURATION_MS) advancePhase();
    }, 80);
    return () => clearInterval(timer);
  }, [
    playing,
    reducedMotion,
    flowComplete,
    flow,
    phase,
    device,
    flowVisible,
    mode,
    lessonId,
    stepIndex,
  ]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(progress));
    } catch {
      /* Progress remains available for this session. */
    }
  }, [progress]);
  useEffect(() => {
    function escape(e) {
      if (e.key === "Escape") {
        setAbout(false);
        setCatalogOpen(false);
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  function toggleSystem(id) {
    setVisible((v) =>
      v.includes(id) ? v.filter((s) => s !== id) : [...v, id],
    );
  }
  function chooseFlow(id) {
    setFlow(id);
    elapsed.current = 0;
    setPhase(0);
    setFlowComplete(false);
    setRunId((i) => i + 1);
    setPlaying(id !== "none" && !reducedMotion && canShowFlow(id, device));
  }
  function advancePhase() {
    if (flowComplete || !flowVisible) return;
    elapsed.current = 0;
    if (phase + 1 < (flowStages[flow]?.length || 0)) setPhase((i) => i + 1);
    else {
      setFlowComplete(true);
      setPlaying(false);
      if (mode === "learn" && step?.flow === flow) setStepDone(true);
    }
  }
  function changeMode(id) {
    setMode(id);
    setCatalogOpen(false);
    setFlow("none");
    setPlaying(false);
    setAuto(false);
    setPhase(0);
    setFlowComplete(false);
    elapsed.current = 0;
  }
  function deviceAction(action) {
    if (mode !== "challenge") return;
    if (action === "toggleAc" && checks.length === 3 && answer === "psu") {
      dispatchPower(diagnosticPower === "off" ? "acOn" : "acOff");
      setFlow("power");
      setPhase(0);
      setFlowComplete(false);
      elapsed.current = 0;
      setPlaying(!reducedMotion);
      setRunId((i) => i + 1);
    }
    if (action === "pressCase" && diagnosticPower === "standby") {
      dispatchPower("pressCase");
      setFlow("power");
      setPhase(0);
      setFlowComplete(false);
      elapsed.current = 0;
      setPlaying(!reducedMotion);
      setRunId((i) => i + 1);
    }
  }
  actionRef.current = deviceAction;
  function startLesson(id) {
    setLessonId(id);
    changeMode("learn");
    setStepIndex(0);
    setStepDone(false);
    setLessonFinished(false);
    setExplosion(0.65);
    setPanel(false);
    setFlow("none");
    setPlaying(false);
    setVisible(systems.map((s) => s.id));
  }
  function nextStep() {
    if (stepIndex === lesson.steps.length - 1) {
      setProgress((p) => ({
        ...p,
        lessons: [...new Set([...p.lessons, lesson.id])],
      }));
      setLessonFinished(true);
      return;
    }
    setStepIndex((i) => i + 1);
    setStepDone(false);
  }
  function resetChallenge() {
    setChecks([]);
    setAnswer(null);
    dispatchPower("reset");
    setPlaying(false);
    setFlow("none");
  }
  function diagnoseTest(id) {
    setChecks((c) => [...new Set([...c, id])]);
    select(id === "cable" ? "atx" : "psu");
    if (id !== "cable") scene.current?.inspectPower();
  }
  const matching = parts.filter((p) =>
    `${p.name} ${p.en} ${p.id} ${content.byId[p.id].name}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const visibleCount = parts.filter(
    (p) => visible.includes(p.system) && (p.id !== "panel" || panel),
  ).length;
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeMode("explore");
          }}
        >
          <span className="brand-symbol">
            <Cpu size={24} />
          </span>
          <span>
            <strong>{t("计算机解剖学")}</strong>
            <small>
              {language === "en" ? "INTERACTIVE ANATOMY" : "COMPUTER ATLAS"}
            </small>
          </span>
        </a>
        <nav aria-label={t("学习模式")}>
          {[
            ["explore", Box, t("自由探索")],
            ["learn", BookOpen, t("引导课程")],
            ["challenge", Stethoscope, t("诊断挑战")],
          ].map(([id, Icon, title]) => (
            <button
              key={id}
              className={mode === id ? "nav-tab current" : "nav-tab"}
              onClick={() => {
                changeMode(id);
              }}
              aria-current={mode === id ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{title}</span>
              {id === "learn" && <em>{progress.lessons.length}/3</em>}
            </button>
          ))}
        </nav>
        <div className="header-end">
          <select
            className="language-select"
            aria-label={language === "en" ? "Language" : "语言"}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="zh" lang="zh-CN">
              中文
            </option>
          </select>
          <span className="local-status">
            <i />
            {t("本地学习空间")}
          </span>
          <IconButton
            icon={Info}
            label={t("模型与资料说明")}
            onClick={() => setAbout(true)}
          />
        </div>
      </header>
      <div className="workspace">
        <aside
          className={"catalog " + (catalogOpen ? "mobile-open" : "")}
          aria-label={t("部件目录")}
        >
          <div className="catalog-heading">
            <h2>{t("结构目录")}</h2>
            <span>{parts.length}</span>
            <IconButton
              icon={X}
              label={t("关闭目录")}
              className="mobile-close icon-button"
              onClick={() => setCatalogOpen(false)}
            />
          </div>
          <label className="search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("搜索部件，例如 CPU")}
              aria-label={t("搜索部件")}
            />
            {query && (
              <button aria-label={t("清空搜索")} onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </label>
          <div className="system-heading">
            <span>{t("系统分层")}</span>
            <button
              onClick={() =>
                setVisible(
                  visible.length === systems.length
                    ? []
                    : systems.map((s) => s.id),
                )
              }
            >
              {visible.length === systems.length
                ? t("全部隐藏")
                : t("全部显示")}
            </button>
          </div>
          <div className="system-filters">
            {systems.map((s) => (
              <label key={s.id} style={{ "--system": s.color }}>
                <input
                  type="checkbox"
                  checked={visible.includes(s.id)}
                  onChange={() => toggleSystem(s.id)}
                />
                <span className="system-dot" />
                {s.name}
                <span className="system-check">
                  {visible.includes(s.id) ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} />
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="parts-heading">
            <span>{query ? t("搜索结果") : t("全部部件")}</span>
            <small>{matching.length}</small>
          </div>
          <div className="parts-list">
            {matching.length === 0 ? (
              <div className="empty">
                <Search size={24} />
                <p>{t("没有找到相关部件")}</p>
                <button onClick={() => setQuery("")}>{t("清空搜索")}</button>
              </div>
            ) : (
              matching.map((p, index) => (
                <button
                  key={p.id}
                  className={"part-row " + (selected === p.id ? "chosen" : "")}
                  onClick={() => select(p.id)}
                  aria-pressed={selected === p.id}
                >
                  <span className="part-number">
                    {String(parts.indexOf(p) + 1).padStart(2, "0")}
                  </span>
                  <span className="part-name">
                    {p.name}
                    <small>
                      {p.id === "cpu" ? "CPU" : p.id === "gpu" ? "GPU" : p.en}
                    </small>
                  </span>
                  {!visible.includes(p.system) ? (
                    <EyeOff size={13} />
                  ) : selected === p.id ? (
                    <ChevronRight size={16} />
                  ) : (
                    <span
                      className="tiny-dot"
                      style={{
                        background: systems.find((s) => s.id === p.system)
                          .color,
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
          <div className="catalog-footer">
            <span className="system-dot" style={{ background: "#518773" }} />
            {visibleCount} / {parts.length}
            {t("个部件可见")}
          </div>
        </aside>
        <main className="stage" aria-label={t("三维探索区")}>
          <div className="canvas-host" ref={host} />
          <div className="stage-heading">
            <div className="stage-title-line">
              <button
                className="mobile-catalog icon-button"
                aria-label={t("打开部件目录")}
                onClick={() => setCatalogOpen(true)}
              >
                <Layers size={18} />
              </button>
              <h1>{t("台式计算机")}</h1>
              <span className="model-tag">ATX</span>
            </div>
            <p>{t("通用硬件架构 · 教学示意模型")}</p>
          </div>
          <div className="view-tools">
            <IconButton
              icon={RotateCcw}
              label={t("重置视角")}
              onClick={() => scene.current?.reset()}
            />
            <div className="tool-divider" />
            <IconButton
              icon={ZoomIn}
              label={t("放大")}
              onClick={() => scene.current?.zoom(0.85)}
            />
            <IconButton
              icon={ZoomOut}
              label={t("缩小")}
              onClick={() => scene.current?.zoom(1.18)}
            />
            <div className="tool-divider" />
            <IconButton
              icon={Rotate3D}
              label={t("自动旋转")}
              active={auto && explosion < 1}
              disabled={explosion === 1 || reducedMotion}
              onClick={() => setAuto(!auto)}
            />
            <IconButton
              icon={Tags}
              label={t("部件标签")}
              active={labels}
              onClick={() => setLabels(!labels)}
            />
          </div>
          {!ready && !error && (
            <div className="canvas-status">{t("正在构建硬件模型…")}</div>
          )}
          {error && (
            <div className="canvas-status error">
              {t(error)}
              <button onClick={() => window.location.reload()}>
                {t("重新加载")}
              </button>
            </div>
          )}
          {visibleCount === 0 && (
            <div className="canvas-status">
              {t("所有系统已隐藏")}
              <button onClick={() => setVisible(systems.map((s) => s.id))}>
                {t("显示全部系统")}
              </button>
            </div>
          )}
          {flow !== "none" && (
            <div
              className="flow-caption"
              style={{ "--flow": flowInfo[flow].color }}
            >
              <span>
                <i />
                {flowInfo[flow].name}
                <small>
                  {!canShowFlow(flow, device)
                    ? t("当前供电状态不可运行")
                    : flowComplete
                      ? t("本轮已完成")
                      : reducedMotion
                        ? t("逐步查看")
                        : playing
                          ? t("正在播放")
                          : t("已暂停")}
                </small>
              </span>
              <strong>
                {flow === "power" && device === "standby"
                  ? t("待机电源 5VSB → 主板启动控制电路")
                  : flowStages[flow][phase].title}
              </strong>
              <p>
                {flow === "power" && device === "standby"
                  ? t("主电源尚未启动，风扇不转；等待机箱按钮发出启动请求。")
                  : flowStages[flow][phase].detail}
              </p>
              <p>{flowInfo[flow].note}</p>
              {canShowFlow(flow, device) && !flowVisible && (
                <p>{t("当前阶段相关部件已隐藏")}</p>
              )}
              <div className="phase-controls">
                <span>
                  {t("阶段")}
                  {phase + 1} / {flowStages[flow].length}
                </span>
                <IconButton
                  icon={RotateCcw}
                  label={t("重播当前流程")}
                  onClick={() => chooseFlow(flow)}
                  disabled={!canShowFlow(flow, device)}
                />
                <button
                  onClick={advancePhase}
                  disabled={flowComplete || !flowVisible}
                >
                  {phase + 1 === flowStages[flow].length
                    ? t("完成观察")
                    : t("下一阶段")}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
          <div className="stage-bottom">
            <div className="explosion-control">
              <div className="explode-title">
                <Layers size={17} />
                <label htmlFor="explode">{t("拆解程度")}</label>
                <output htmlFor="explode">
                  {Math.round(explosion * 100)}
                  <small>%</small>
                </output>
              </div>
              <div className="slider-row">
                <span>{t("组装")}</span>
                <input
                  id="explode"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(explosion * 100)}
                  onChange={(e) => setExplosion(Number(e.target.value) / 100)}
                />
                <span>{t("展开")}</span>
              </div>
              <label className="panel-toggle">
                <input
                  type="checkbox"
                  checked={panel}
                  onChange={(e) => setPanel(e.target.checked)}
                />
                {t("侧面板")}
              </label>
            </div>
            <div className="flow-toolbar">
              <span className="flow-label">{t("运行过程")}</span>
              <div className="flow-segments">
                {[
                  ["none", Box, t("结构")],
                  ["power", Zap, t("电力")],
                  ["data", ArrowRightLeft, t("数据")],
                  ["heat", Wind, t("热量")],
                ].map(([id, Icon, name]) => (
                  <button
                    key={id}
                    className={flow === id ? "selected" : ""}
                    onClick={() => chooseFlow(id)}
                    disabled={id !== "none" && !canShowFlow(id, device)}
                    aria-pressed={flow === id}
                  >
                    <Icon size={16} />
                    {name}
                  </button>
                ))}
              </div>
              <IconButton
                icon={playing ? Pause : Play}
                label={playing ? t("暂停动画") : t("播放动画")}
                disabled={
                  flow === "none" || !canShowFlow(flow, device) || reducedMotion
                }
                onClick={() => {
                  if (flowComplete) chooseFlow(flow);
                  else setPlaying(!playing);
                }}
              />
            </div>
          </div>
        </main>
        <aside
          className="inspector"
          aria-label={
            mode === "explore"
              ? t("部件知识")
              : mode === "learn"
                ? t("引导课程")
                : t("诊断挑战")
          }
        >
          {mode === "explore" && (
            <>
              <div className="inspector-top">
                <span>{t("部件档案")}</span>
                <span>
                  {String(parts.indexOf(part) + 1).padStart(2, "0")} /{" "}
                  {parts.length}
                </span>
              </div>
              <div className="part-detail">
                <div className="part-category" style={{ color: system.color }}>
                  <span style={{ background: system.color }} />
                  {system.name}
                </div>
                <h2>{part.name}</h2>
                {(language === "zh" || part.en !== part.name) && (
                  <p className="english-name">{part.en}</p>
                )}
                <div className="chip-figure">
                  <Cpu size={48} strokeWidth={1} />
                  <span>{part.id.toUpperCase()}</span>
                  <div className="part-spec">
                    {part.spec.map((s) => (
                      <small key={s}>{s}</small>
                    ))}
                  </div>
                </div>
                <h3>{t("它的工作")}</h3>
                <p className="part-summary">{part.summary}</p>
                <p className="detail-text">{part.detail}</p>
                <button
                  className="focus-button"
                  onClick={() => {
                    select(part.id);
                    scene.current?.focus(part.id);
                  }}
                >
                  <Focus size={16} />
                  {t("定位部件")}
                  <ArrowRight size={16} />
                </button>
                <div className="relations-title">
                  <h3>{t("关联部件")}</h3>
                  <button
                    aria-pressed={related}
                    className={related ? "enabled" : ""}
                    onClick={() => setRelated(!related)}
                  >
                    <Link2 size={14} />
                    {related ? t("取消高亮") : t("高亮关联")}
                  </button>
                </div>
                <div className="relations">
                  {part.related.map((id) => (
                    <button key={id} onClick={() => select(id)}>
                      <span>{byId[id].name}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="learning-prompt">
                <BookOpen size={20} />
                <div>
                  <strong>{t("从探索，走向理解")}</strong>
                  <p>{t("认识电脑的核心 · 第一课")}</p>
                </div>
                <IconButton
                  icon={ArrowRight}
                  label={t("开始第一课")}
                  onClick={() => startLesson("anatomy")}
                />
              </div>
            </>
          )}
          {mode === "learn" && (
            <>
              <div className="inspector-top">
                <span>{t("引导课程")}</span>
                <span>
                  {progress.lessons.length}
                  {t("/ 3 已完成")}
                </span>
              </div>
              {!lesson ? (
                <div className="learning-index">
                  <h2>
                    {t("理解每一层，")}
                    <br />
                    {t("连接每一步。")}
                  </h2>
                  <p>{t("从硬件结构到程序运行")}</p>
                  <div className="course-list">
                    {lessons.map((l, i) => (
                      <button
                        key={l.id}
                        className="course-row"
                        onClick={() => startLesson(l.id)}
                      >
                        <div className="course-row-top">
                          <span>
                            {t("课程")}
                            {i + 1}
                          </span>
                          <small>
                            {progress.lessons.includes(l.id)
                              ? t("已完成")
                              : l.time}
                          </small>
                        </div>
                        <h3>{l.title}</h3>
                        <p>{l.desc}</p>
                        <span className="course-action">
                          {progress.lessons.includes(l.id) ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <BookOpen size={16} />
                          )}{" "}
                          {progress.lessons.includes(l.id)
                            ? t("重新学习")
                            : t("开始学习")}
                          <ArrowRight size={16} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="progress-note">
                    <CheckCircle2 size={17} />
                    <span>{t("学习进度保存在当前浏览器")}</span>
                  </div>
                </div>
              ) : (
                <div className="lesson-detail">
                  <button
                    className="back-link"
                    onClick={() => setLessonId(null)}
                  >
                    <ArrowLeft size={15} />
                    {t("全部课程")}
                  </button>
                  <h2>{lesson.title}</h2>
                  <div className="step-track">
                    {lesson.steps.map((s, i) => (
                      <span
                        key={i}
                        className={
                          i < stepIndex || lessonFinished
                            ? "complete"
                            : i === stepIndex
                              ? "current"
                              : ""
                        }
                      />
                    ))}
                  </div>
                  {lessonFinished ? (
                    <div className="lesson-complete">
                      <CheckCircle2 size={45} />
                      <h3>{t("这一课，已完成")}</h3>
                      <p>
                        {lesson.id === "anatomy"
                          ? t(
                              "你已经认识了计算、工作存储、长期存储与散热之间的分工。",
                            )
                          : lesson.id === "program"
                            ? t(
                                "程序从存储设备调入内存，由 CPU 执行；图形任务还会交给 GPU。",
                              )
                            : t(
                                "开机经历启动请求、建立供电、固件初始化与操作系统引导。",
                              )}
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => {
                          const next = lessons[lessons.indexOf(lesson) + 1];
                          if (next) startLesson(next.id);
                          else {
                            changeMode("challenge");
                            setLessonId(null);
                          }
                        }}
                      >
                        {lesson.id === "boot" ? t("进入诊断挑战") : t("下一课")}
                        <ArrowRight size={16} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => startLesson(lesson.id)}
                      >
                        {t("重新学习")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="step-meta">
                        {t("步骤")}
                        {stepIndex + 1} / {lesson.steps.length}
                      </div>
                      <h3 className="step-title">{step.title}</h3>
                      <p className="detail-text">{step.text}</p>
                      <div
                        className={"lesson-task " + (stepDone ? "done" : "")}
                      >
                        <span>
                          {stepDone ? (
                            <CheckCircle2 size={19} />
                          ) : (
                            <Focus size={19} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {stepDone
                              ? t("已完成当前操作")
                              : step.part
                                ? t("找到：") + byId[step.part].name
                                : t("播放：") + flowInfo[step.flow].name}
                          </strong>
                          <small>
                            {stepDone ? t("可以继续下一步") : t("等待操作")}
                          </small>
                        </div>
                      </div>
                      <button
                        className="primary-button"
                        disabled={!stepDone}
                        onClick={nextStep}
                      >
                        {stepIndex === lesson.steps.length - 1
                          ? t("完成课程")
                          : t("下一步")}
                        <ArrowRight size={16} />
                      </button>
                      <button
                        className="back-link previous-step"
                        disabled={stepIndex === 0}
                        onClick={() => {
                          setStepIndex((i) => i - 1);
                          setStepDone(false);
                        }}
                      >
                        <ArrowLeft size={14} />
                        {t("上一步")}
                      </button>
                      <div className="lesson-context">
                        <h4>{t("当前选中")}</h4>
                        <button onClick={() => scene.current?.focus(selected)}>
                          {part.name}
                          <Focus size={16} />
                        </button>
                        <p>{part.summary}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {mode === "challenge" && (
            <>
              <div className="inspector-top">
                <span>{t("诊断实验室")}</span>
                <span>{progress.diagnosed ? t("已通过") : t("挑战 01")}</span>
              </div>
              <div className="diagnosis">
                <div className={"diagnosis-status " + (fixed ? "success" : "")}>
                  <span />
                  {powerLabels[diagnosticPower]}
                </div>
                <h2>
                  {t("电脑为什么")}
                  <br />
                  {t("不开机？")}
                </h2>
                <p className="detail-text">
                  {diagnosticPower === "off"
                    ? t(
                        "按下机箱电源按钮后，风扇不转，电源指示灯不亮。根据检查结果，找出这台模拟电脑的故障。",
                      )
                    : diagnosticPower === "standby"
                      ? t(
                          "交流输入已恢复，主板待机灯亮起。主电源尚未启动，机箱电源灯和风扇仍关闭。",
                        )
                      : diagnosticPower === "starting"
                        ? t(
                            "机箱按钮已发出启动请求。主电源建立，固件正在初始化硬件。",
                          )
                        : t(
                            "固件初始化完成，系统进入运行状态。机箱电源灯亮起。",
                          )}
                </p>
                <h3>{t("1. 收集线索")}</h3>
                <div className="check-list">
                  {[
                    [
                      "wall",
                      Plug,
                      t("检查插座与电源线"),
                      t("插座有电，电源线两端均已插牢。"),
                    ],
                    [
                      "button",
                      Power,
                      t("检查电源背面开关"),
                      t(rearSwitchObservation(diagnosticPower)),
                    ],
                    [
                      "cable",
                      Zap,
                      t("检查主板供电连接"),
                      t("24 针主板供电和 CPU 辅助供电均已连接。"),
                    ],
                  ].map(([id, Icon, title, result]) => (
                    <div className="check-item" key={id}>
                      <button onClick={() => diagnoseTest(id)}>
                        <Icon size={16} />
                        <span>{title}</span>
                        {checks.includes(id) ? (
                          <Check size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                      {checks.includes(id) && <p>{result}</p>}
                    </div>
                  ))}
                </div>
                <h3>{t("2. 判断原因")}</h3>
                <div className="answer-options">
                  {[
                    ["ram", t("内存容量不足")],
                    ["psu", t("电源背面开关未开启")],
                    ["os", t("操作系统未安装")],
                  ].map(([id, title]) => (
                    <button
                      key={id}
                      disabled={checks.length < 3 || diagnosticPower !== "off"}
                      onClick={() => setAnswer(id)}
                      className={answer === id ? "picked" : ""}
                    >
                      <span className="radio-mark" />
                      {title}
                    </button>
                  ))}
                </div>
                {checks.length < 3 && (
                  <p className="muted-small">{t("完成三项检查后作答")}</p>
                )}
                <div aria-live="polite">
                  {answer && answer !== "psu" && (
                    <p className="answer-feedback wrong">
                      {t(
                        "这不能解释风扇与指示灯都无反应。请结合电源背面开关的状态重新判断。",
                      )}
                    </p>
                  )}
                  {answer === "psu" && diagnosticPower === "off" && (
                    <div className="answer-feedback correct">
                      <strong>{t("判断正确")}</strong>
                      <p>
                        {t(
                          "「0」表示关闭交流输入，「I」表示开启。此模拟场景的故障是电源输入被关闭。",
                        )}
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => deviceAction("toggleAc")}
                      >
                        {t("将模拟开关拨到 I")}
                        <Power size={16} />
                      </button>
                    </div>
                  )}
                  {diagnosticPower === "standby" && (
                    <div className="answer-feedback correct">
                      <strong>{t("待机供电已恢复")}</strong>
                      <p>
                        {t(
                          "开启电源背面开关不等于主机开机。现在按机箱电源按钮，向主板发出启动请求。",
                        )}
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => {
                          select("switch");
                          scene.current?.reset();
                          deviceAction("pressCase");
                        }}
                      >
                        {t("按下机箱电源按钮")}
                        <Power size={16} />
                      </button>
                    </div>
                  )}
                  {diagnosticPower === "starting" && (
                    <div className="answer-feedback correct">
                      <strong>{t("正在进行启动检查")}</strong>
                      <p>
                        {t("主电源已建立，风扇开始运行。等待固件初始化完成。")}
                      </p>
                    </div>
                  )}
                  {fixed && (
                    <div className="answer-feedback correct">
                      <CheckCircle2 size={25} />
                      <strong>{t("供电恢复，挑战完成")}</strong>
                      <p>
                        {t(
                          "风扇启动、指示灯亮起。先验证供电路径，再排查后续启动阶段。",
                        )}
                      </p>
                      <button className="text-button" onClick={resetChallenge}>
                        {t("重新挑战")}
                      </button>
                    </div>
                  )}
                </div>
                <p className="safety-note">
                  {t(
                    "真实排查时，先断电再检查内部接线；不要拆开电源供应器外壳。",
                  )}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
      <footer className="statusbar">
        <span>
          <span className="status-dot" />{" "}
          {ready ? t("3D 场景就绪") : error ? t("文字模式") : t("模型加载中")}
        </span>
        <span className="current-selection">
          {t("当前选中：")}
          {part.name}
        </span>
        <span>{t("原理可见，知识相连。")}</span>
      </footer>
      {about && (
        <AboutDialog onClose={() => setAbout(false)}>
          <section className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 id="about-title">{t("关于这座硬件图谱")}</h2>
              <IconButton
                icon={X}
                label={t("关闭说明")}
                onClick={() => setAbout(false)}
              />
            </div>
            <p>
              {t(
                "本项目使用 Three.js 独立构建 29 个可选择的程序化部件。模型展示通用 ATX 台式机的结构关系，不对应具体品牌，尺寸与线缆经过简化，不能作为装配图使用。",
              )}
            </p>
            <p>
              {t(
                "运行路径是教学示意；真实硬件会有缓存、控制器、并行通道与平台差异。学习进度仅保存于当前浏览器。",
              )}
            </p>
            <h3>{t("进一步阅读")}</h3>
            <a
              href="https://www.intel.com/content/www/us/en/gaming/resources/how-to-build-a-gaming-pc.html"
              target="_blank"
              rel="noreferrer"
            >
              {t("Intel：电脑组装与部件指南")}
              <ExternalLink size={14} />
            </a>
            <a
              href="https://uefi.org/specifications"
              target="_blank"
              rel="noreferrer"
            >
              {t("UEFI：固件规范")}
              <ExternalLink size={14} />
            </a>
            <a
              href="https://nvmexpress.org/specifications/"
              target="_blank"
              rel="noreferrer"
            >
              {t("NVM Express：存储协议")}
              <ExternalLink size={14} />
            </a>
            <button className="primary-button" onClick={() => setAbout(false)}>
              {t("返回探索")}
              <ArrowRight size={16} />
            </button>
          </section>
        </AboutDialog>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
