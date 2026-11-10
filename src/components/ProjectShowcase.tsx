import React from 'react';
import { ArrowUpRight, Github } from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';

type ProjectGlyph = 'truesight' | 'hive';

interface Project {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  tags: string[];
  site: string;
  repo: string;
  glyph: ProjectGlyph;
}

const PROJECTS: Project[] = [
  {
    id: 'truesight',
    name: 'TrueSight',
    kicker: 'DOTA 2 MATCH ANALYZER',
    summary:
      '本地运行的 Dota 2 对局分析工具：整合 OpenDota / STRATZ 公开数据、Clarity 录像解析与 AI 复盘，从整场概览一路展开到 5 秒级时间轴、出装路线与战斗节点。',
    tags: ['Windows 客户端', '录像解析', 'AI 复盘'],
    site: 'https://truesight.cwa1e.top/',
    repo: 'https://github.com/LiBaiQiYu/TrueSight',
    glyph: 'truesight',
  },
  {
    id: 'hive',
    name: 'HIVE',
    kicker: 'DOTA2 COMMUNITY WARROOM',
    summary:
      '把「凑十个人打一场内战」从群聊接龙变成一条可报名、可分队、可追溯的流程：邀请制报名、按位置与实力自动分队、评分构成公开可查，赛后阵容有快照不会悄悄变。',
    tags: ['邀请制报名', '自动分队', '实力评分'],
    site: 'https://hive.cwa1e.top/',
    repo: 'https://github.com/LiBaiQiYu/hive',
    glyph: 'hive',
  },
];

// 12×12 pixel glyphs, drawn the same way as the hero avatars.
const GLYPHS: Record<ProjectGlyph, string[]> = {
  truesight: [
    '............',
    '............',
    '...######...',
    '..#......#..',
    '.#........#.',
    '#...####...#',
    '#..######..#',
    '#...####...#',
    '.#........#.',
    '..#......#..',
    '...######...',
    '............',
  ],
  hive: [
    '............',
    '............',
    '...######...',
    '..#......#..',
    '.#........#.',
    '#..........#',
    '#....##....#',
    '#..........#',
    '.#........#.',
    '..#......#..',
    '...######...',
    '............',
  ],
};

const PixelGlyph: React.FC<{ kind: ProjectGlyph }> = ({ kind }) => (
  <svg
    viewBox="0 0 12 12"
    className="h-6 w-6"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {GLYPHS[kind].flatMap((row, y) =>
      Array.from(row).map((cell, x) =>
        cell === '#' ? (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="currentColor"
          />
        ) : null
      )
    )}
  </svg>
);

const PixelCorners: React.FC = () => (
  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
    <span className="absolute left-1 top-1 h-1.5 w-1.5 bg-sky-400/70 dark:bg-cyan-300/70" />
    <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-sky-400/70 dark:bg-cyan-300/70" />
    <span className="absolute bottom-1 left-1 h-1.5 w-1.5 bg-sky-400/70 dark:bg-cyan-300/70" />
    <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-sky-400/70 dark:bg-cyan-300/70" />
  </span>
);

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
  <article className="group relative flex flex-col gap-3 rounded-lg border border-sky-400/30 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white/70 dark:border-cyan-400/20 dark:bg-slate-950/50 dark:hover:border-cyan-300/40 dark:hover:bg-slate-950/70">
    <PixelCorners />

    <header className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-sky-400/40 bg-sky-500/10 text-sky-600 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
        <PixelGlyph kind={project.glyph} />
      </span>
      <div className="min-w-0">
        <div className="truncate font-mono text-[8px] tracking-[0.16em] text-sky-600 dark:text-cyan-300">
          {project.kicker}
        </div>
        <h3 className="mt-0.5 font-mono text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          {project.name}
        </h3>
      </div>
    </header>

    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
      {project.summary}
    </p>

    <div className="flex flex-wrap gap-1.5">
      {project.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-sm border border-sky-400/25 bg-sky-500/5 px-1.5 py-0.5 font-mono text-[9px] text-sky-700 dark:border-cyan-400/15 dark:bg-cyan-400/5 dark:text-cyan-200"
        >
          {tag}
        </span>
      ))}
    </div>

    <div className="mt-auto flex items-center gap-2 pt-1">
      <a
        href={project.site}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-sm border border-sky-400/40 bg-sky-500/10 px-2 py-1 font-mono text-[10px] text-sky-700 transition-colors hover:bg-sky-500/20 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/20"
      >
        打开站点
        <ArrowUpRight className="h-3 w-3" />
      </a>
      <a
        href={project.repo}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-sm border border-slate-300/70 px-2 py-1 font-mono text-[10px] text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-white/15 dark:text-slate-300 dark:hover:border-white/30 dark:hover:text-white"
      >
        <Github className="h-3 w-3" />
        GitHub
      </a>
    </div>
  </article>
);

export const ProjectShowcase: React.FC = () => (
  <LiquidPixelCard accent="cyan" className="about-reveal space-y-3 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="font-mono text-[9px] tracking-wider text-sky-600 dark:text-cyan-300">
          PROJECTS // 我的项目
        </div>
        <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
          自己写的两个工具
        </h2>
      </div>
      <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
        {PROJECTS.length} 个 / 都在跑
      </span>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {PROJECTS.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  </LiquidPixelCard>
);

export const TerminalProjectShowcase: React.FC = () => (
  <section className="space-y-2">
    <p className="text-emerald-600 dark:text-emerald-300"># projects</p>
    <div className="space-y-1 font-mono text-[10px]">
      {PROJECTS.map((project) => (
        <div key={project.id} className="flex items-baseline gap-2">
          <span className="w-20 shrink-0 text-cyan-600 dark:text-cyan-300">
            {project.id}
          </span>
          <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
            {project.kicker}
          </span>
          <a
            href={project.site}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-slate-500 underline decoration-slate-400/40 underline-offset-2 hover:text-sky-600 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            site
          </a>
          <a
            href={project.repo}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-slate-500 underline decoration-slate-400/40 underline-offset-2 hover:text-sky-600 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            repo
          </a>
        </div>
      ))}
    </div>
  </section>
);
