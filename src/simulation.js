export const powerLabels = {
  off: "交流输入已断开",
  standby: "待机供电已恢复",
  starting: "正在初始化硬件",
  running: "系统已启动",
};

export function transitionPower(state, event) {
  if (event === "reset" || event === "acOff") return "off";
  if (state === "off" && event === "acOn") return "standby";
  if (state === "standby" && event === "pressCase") return "starting";
  if (state === "starting" && event === "bootComplete") return "running";
  return state;
}

export function hasMainPower(device) {
  return device === "starting" || device === "running";
}

export function canShowFlow(flow, device) {
  if (flow === "none") return false;
  if (flow === "power") return device !== "off";
  return device === "running";
}

export const flowStages = {
  data: [
    {
      title: "加载到内存",
      detail: "操作系统按需把 SSD 上的程序内容调入内存。",
      edges: [["ssd", "ram1"]],
    },
    {
      title: "读取与执行",
      detail: "CPU 通过缓存层级取得内存中的指令与数据。",
      edges: [["ram1", "cpu"]],
    },
    {
      title: "提交图形任务",
      detail: "CPU 向 GPU 提交绘制命令；图形资源传输在这里简化。",
      edges: [["cpu", "gpu"]],
    },
    {
      title: "输出画面",
      detail: "GPU 生成帧，通过显示接口输出。",
      edges: [["gpu", "display"]],
    },
  ],
  power: [
    {
      title: "主电源的并行供电分支",
      detail: "主板、CPU 供电电路与显卡分别获得供电，不是依次串联。",
      edges: [
        ["psu", "atx"],
        ["atx", "board"],
        ["psu", "eps"],
        ["eps", "vrm"],
        ["vrm", "cpu"],
        ["psu", "gpu"],
      ],
    },
  ],
  heat: [
    {
      title: "固体传热",
      detail: "热量从 CPU 经接触底座、热管到达散热鳍片。",
      edges: [["cpu", "cooler"]],
    },
    {
      title: "空气对流",
      detail:
        "蓝色表示进入的冷空气；珊瑚色表示经过热源后升温、排出的空气。风扇推动空气，不是传热中继。",
      edges: [],
    },
  ],
};

export const STAGE_DURATION_MS = 2400;

export function rearSwitchObservation(device) {
  return device === "off"
    ? "电源背面的翘板开关停在「0」位置，交流输入已断开。"
    : "电源背面的翘板开关位于「I」位置，交流输入已接通。";
}

// Air nodes denote locations in the airflow, never fan motors as conductors.
export function flowSegments(flow, phase, device, visible) {
  if (!canShowFlow(flow, device)) return [];
  let segments;
  if (flow === "power" && device === "standby") {
    segments = [
      {
        from: "psu",
        to: "board",
        requires: ["psu", "board"],
        color: "#efc858",
      },
    ];
  } else if (flow === "heat" && phase === 1) {
    segments = [
      {
        from: "outsideIn",
        to: "intakeAir",
        requires: ["intake"],
        color: "#67cff0",
      },
      {
        from: "intakeAir",
        to: "warmAir",
        requires: ["intake", "cooler"],
        color: "#67cff0",
      },
      {
        from: "warmAir",
        to: "exhaustAir",
        requires: ["cooler", "exhaust"],
        color: "#ff967c",
      },
      {
        from: "exhaustAir",
        to: "outsideOut",
        requires: ["exhaust"],
        color: "#ff967c",
      },
    ];
  } else {
    segments = (flowStages[flow]?.[phase]?.edges || []).map(([from, to]) => ({
      from,
      to,
      requires: [from, to],
      color:
        flow === "data" ? "#67cff0" : flow === "heat" ? "#ff967c" : "#efc858",
    }));
  }
  return segments.filter((segment) =>
    segment.requires.every((id) => visible.includes(id)),
  );
}
